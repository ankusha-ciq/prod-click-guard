// CommerceIQ Prod Click Guard - content script
(() => {
  const DEFAULTS = {
    enabled: true,
    // Hostname substrings that mark a NON-prod environment. Any match => not prod.
    nonProdMarkers: ['databricks-qa', '.qa.', '-qa.', 'staging', 'localhost'],
    // Hosts matching this regex are prod (unless a non-prod marker is present).
    prodPattern: '^[a-z0-9-]+\\.commerceiq\\.ai$',
    snoozeMinutes: 10,
    showBanner: true
  };

  let settings = { ...DEFAULTS };
  let snoozedUntil = 0;       // epoch ms
  let allowNext = false;      // set while re-dispatching an approved click
  let modalOpen = false;

  const host = location.hostname.toLowerCase();

  function isProdHost() {
    if (settings.nonProdMarkers.some(m => m && host.includes(m))) return false;
    try { return new RegExp(settings.prodPattern, 'i').test(host); } catch { return false; }
  }

  function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get(DEFAULTS, items => { settings = { ...DEFAULTS, ...items }; resolve(); });
    });
  }

  // ---------- banner ----------
  function addBanner() {
    if (!settings.showBanner || window.top !== window) return;
    const run = () => {
      if (document.getElementById('ciq-prod-banner')) return;
      const b = document.createElement('div');
      b.id = 'ciq-prod-banner';
      b.textContent = `PRODUCTION - ${host}`;
      document.documentElement.appendChild(b);
    };
    if (document.body) run(); else document.addEventListener('DOMContentLoaded', run, { once: true });
  }

  // ---------- modal ----------
  function describeTarget(el) {
    if (!el || !(el instanceof Element)) return 'this element';
    const clickable = el.closest('button, a, [role="button"], [role="menuitem"], input, label, [onclick]') || el;
    const text = (clickable.getAttribute('aria-label') || clickable.textContent || clickable.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
    const tag = clickable.tagName.toLowerCase();
    return text ? `${tag}: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"` : tag;
  }

  function showModal(target) {
    return new Promise(resolve => {
      modalOpen = true;
      const overlay = document.createElement('div');
      overlay.id = 'ciq-prod-guard-overlay';
      overlay.innerHTML = `
        <div class="ciq-prod-guard-modal" role="dialog" aria-modal="true" aria-labelledby="ciq-pg-title">
          <div class="ciq-pg-header">
            <span class="ciq-pg-icon">⚠️</span>
            <h2 id="ciq-pg-title">You are on a PRODUCTION account</h2>
          </div>
          <p class="ciq-pg-host"></p>
          <p>Are you sure you want to click <code class="ciq-pg-target"></code>?</p>
          <label class="ciq-pg-snooze">
            <input type="checkbox" id="ciq-pg-snooze-cb" checked>
            Don't ask again on this page for ${settings.snoozeMinutes} min
          </label>
          <div class="ciq-pg-actions">
            <button type="button" class="ciq-pg-cancel">Cancel (Esc)</button>
            <button type="button" class="ciq-pg-confirm">Yes, click it (Enter)</button>
          </div>
        </div>`;
      overlay.querySelector('.ciq-pg-host').textContent = host;
      overlay.querySelector('.ciq-pg-target').textContent = describeTarget(target);

      const finish = (ok) => {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        modalOpen = false;
        if (ok && overlay.querySelector('#ciq-pg-snooze-cb').checked) {
          snoozedUntil = Date.now() + settings.snoozeMinutes * 60 * 1000;
        }
        resolve(ok);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish(false); }
        else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); finish(true); }
      };
      overlay.querySelector('.ciq-pg-cancel').addEventListener('click', e => { e.stopPropagation(); finish(false); });
      overlay.querySelector('.ciq-pg-confirm').addEventListener('click', e => { e.stopPropagation(); finish(true); });
      overlay.addEventListener('click', e => { if (e.target === overlay) { e.stopPropagation(); finish(false); } });
      document.addEventListener('keydown', onKey, true);
      document.documentElement.appendChild(overlay);
      overlay.querySelector('.ciq-pg-cancel').focus();
    });
  }

  // ---------- click interception ----------
  function redispatch(target, original) {
    allowNext = true;
    try {
      const ev = new MouseEvent('click', {
        bubbles: true, cancelable: true, composed: true, view: window,
        detail: original.detail, screenX: original.screenX, screenY: original.screenY,
        clientX: original.clientX, clientY: original.clientY,
        ctrlKey: original.ctrlKey, altKey: original.altKey, shiftKey: original.shiftKey, metaKey: original.metaKey,
        button: original.button, buttons: original.buttons
      });
      target.dispatchEvent(ev);
    } finally { allowNext = false; }
  }

  async function onClick(e) {
    if (!settings.enabled) return;
    if (allowNext) return;                                  // our own re-dispatch
    if (!e.isTrusted) return;                               // programmatic clicks from the app
    const target = e.target;
    if (target instanceof Element && target.closest('#ciq-prod-guard-overlay')) return; // our own modal
    if (modalOpen) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (Date.now() < snoozedUntil) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    const ok = await showModal(target);
    if (ok) redispatch(target, e);
  }

  // ---------- init ----------
  loadSettings().then(() => {
    if (!isProdHost()) return;
    document.addEventListener('click', onClick, true);     // capture phase, before the app sees it
    addBanner();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      for (const k of Object.keys(changes)) settings[k] = changes[k].newValue;
    });
  });
})();
