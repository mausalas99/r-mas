/**
 * Workbench kit — undo toast.
 * README 11c: `om-rise` — a self-contained 4.2s cycle (enter +10px→0, hold
 * ~86%, exit). Shows a message + a "Deshacer" button and self-dismisses.
 */
import { escHtml } from '../../dom-escape.mjs';

const DEFAULT_UNDO_LABEL = 'Deshacer';
const OM_RISE_DURATION_MS = 4200;

/** @param {{ message?: string, undoLabel?: string }} opts */
export function buildUndoToastHtml({ message = '', undoLabel = DEFAULT_UNDO_LABEL } = {}) {
  return (
    '<div class="wb-undo-toast om-rise" role="status">' +
    `<span class="wb-undo-toast-message">${escHtml(message)}</span>` +
    (undoLabel
      ? `<button type="button" class="wb-undo-toast-btn" data-wb-undo>${escHtml(undoLabel)}</button>`
      : '') +
    '</div>'
  );
}

/**
 * @param {{
 *   message: string,
 *   undoLabel?: string,
 *   onUndo?: () => void,
 *   container?: HTMLElement,
 *   durationMs?: number,
 * }} opts
 * @returns {HTMLElement|null}
 */
export function showUndoToast(opts = {}) {
  if (typeof document === 'undefined') return null;
  const host = opts.container || document.body;
  const wrap = document.createElement('div');
  wrap.innerHTML = buildUndoToastHtml(opts);
  const toast = wrap.firstElementChild;
  host.appendChild(toast);

  const undoBtn = toast.querySelector('[data-wb-undo]');
  if (undoBtn && typeof opts.onUndo === 'function') {
    undoBtn.addEventListener('click', () => {
      opts.onUndo();
      remove();
    });
  }

  function remove() {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }

  toast.addEventListener('animationend', remove, { once: true });
  // Fallback for environments without animation events (reduced motion, tests).
  setTimeout(remove, opts.durationMs || OM_RISE_DURATION_MS);

  return toast;
}
