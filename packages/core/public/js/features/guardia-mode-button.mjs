/**
 * Modo Guardia header button visibility — split out of guardia-board.mjs so
 * boot chrome doesn't have to eagerly pull in the (heavy) board renderer just
 * to toggle a button.
 */
import { isDbMode } from '../db-storage-bridge.mjs';

export function syncGuardiaModeButtonVisibility() {
  const show = isDbMode();
  const btn = document.querySelector('#header-mode-seg .header-mode-seg-btn[data-mode="guardia"]');
  if (btn) {
    if (show) btn.removeAttribute('hidden');
    else btn.setAttribute('hidden', '');
  }
}
