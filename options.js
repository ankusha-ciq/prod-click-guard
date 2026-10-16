const DEFAULTS = {
  enabled: true,
  nonProdMarkers: ['databricks-qa', '.qa.', '-qa.', 'staging', 'localhost'],
  prodPattern: '^[a-z0-9-]+\\.commerceiq\\.ai$',
  snoozeMinutes: 10,
  showBanner: true
};
const $ = id => document.getElementById(id);

chrome.storage.sync.get(DEFAULTS, s => {
  $('enabled').checked = s.enabled;
  $('showBanner').checked = s.showBanner;
  $('prodPattern').value = s.prodPattern;
  $('nonProdMarkers').value = s.nonProdMarkers.join('\n');
  $('snoozeMinutes').value = s.snoozeMinutes;
});

$('save').addEventListener('click', () => {
  try { new RegExp($('prodPattern').value); } catch (e) { $('status').textContent = 'Invalid regex'; return; }
  chrome.storage.sync.set({
    enabled: $('enabled').checked,
    showBanner: $('showBanner').checked,
    prodPattern: $('prodPattern').value,
    nonProdMarkers: $('nonProdMarkers').value.split('\n').map(s => s.trim()).filter(Boolean),
    snoozeMinutes: Math.max(1, parseInt($('snoozeMinutes').value, 10) || 10)
  }, () => { $('status').textContent = 'Saved'; setTimeout(() => $('status').textContent = '', 1500); });
});
