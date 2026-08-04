/**
 * Hybrid H sheet bridge for Eventualidades compose / edit.
 */
import { openSheet } from '../ui-overlay.mjs';

/** @type {{ close: (reason?: string) => void }|null} */
let _activeSheet = null;

/**
 * @param {{ panelHtml: string, ariaLabel?: string, onClose?: () => void }} opts
 * @returns {{ close: (reason?: string) => void, mountEl: HTMLElement }}
 */
export function openEventualidadComposeSheet(opts) {
  if (typeof document === 'undefined') {
    return { close: function () {}, mountEl: /** @type {HTMLElement} */ ({}) };
  }

  closeEventualidadComposeSheet('replace');

  var scrim = document.createElement('div');
  scrim.className = 'ui-overlay-scrim';
  scrim.setAttribute('aria-hidden', 'true');

  var panel = document.createElement('div');
  panel.className = 'ui-overlay-sheet ev-sheet';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute(
    'aria-label',
    opts.ariaLabel || 'Registrar eventualidad'
  );
  panel.innerHTML =
    '<div class="ui-overlay-sheet__handle" aria-hidden="true"></div>' +
    '<div class="ev-sheet__body">' +
    opts.panelHtml +
    '</div>';

  document.body.appendChild(scrim);
  document.body.appendChild(panel);

  var mountEl = panel.querySelector('.ev-sheet__body');
  if (!mountEl) mountEl = panel;

  var overlay = openSheet({
    panel: panel,
    scrim: scrim,
    onClose: function () {
      _activeSheet = null;
      scrim.remove();
      panel.remove();
      if (opts.onClose) opts.onClose();
    },
  });

  _activeSheet = overlay;
  return { close: overlay.close.bind(overlay), mountEl: mountEl };
}

/** @param {string} [reason] */
export function closeEventualidadComposeSheet(reason) {
  if (!_activeSheet) return;
  _activeSheet.close(reason || 'explicit');
  _activeSheet = null;
}

/** @returns {boolean} */
export function isEventualidadComposeSheetOpen() {
  return _activeSheet != null;
}
