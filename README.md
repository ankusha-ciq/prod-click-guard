# CommerceIQ Prod Click Guard

Chrome extension that shows a confirmation dialog before every click on a CommerceIQ **production** account.

- Prod:  `https://<tenant>.commerceiq.ai/`           -> guarded (red banner + confirm on every click)
- QA:    `https://<tenant>.databricks-qa.commerceiq.ai/` -> untouched

## Install (unpacked)
1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** -> select this folder.
3. Open a prod tenant URL. You should see a red `PRODUCTION` strip at the top; any click opens the confirm dialog.

## Behaviour
- Click is intercepted in the capture phase, so the app never sees it until you confirm.
- **Enter** / "Yes, click it" re-dispatches the click to the same element. **Esc** / "Cancel" drops it.
- Tick "Don't ask again on this page for N min" to snooze (per tab, resets on reload).
- Options (right-click extension icon -> Options): enable/disable, banner, prod regex, non-prod markers, snooze length.

## Limitations
- Only `click` is guarded. Actions bound to `mousedown`/`pointerdown`, drag, or keyboard-only (Enter on a focused button) are not intercepted.
- Modifier info (Cmd/Ctrl-click) is preserved on re-dispatch, but middle-click/`auxclick` is not guarded.
