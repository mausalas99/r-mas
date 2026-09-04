/**
 * Workbench kit — undo toast.
 * README 11c: `om-rise` for the entrance (+10px→0, fade in). This carries
 * the app's only "Deshacer" action, so it does NOT auto-dismiss — it stays
 * until the user clicks Deshacer, the close button, or the toast itself.
 */
import { escHtml } from '../../dom-escape.mjs';

const DEFAULT_UNDO_LABEL = 'Deshacer';

/** @param {{ message?: string, undoLabel?: string }} opts */
export function buildUndoToastHtml({ message = '', undoLabel = DEFAULT_UNDO_LABEL } = {}) {
  return (
    '<div class="wb-undo-toast om-rise" role="status">' +
    `<span class="wb-undo-toast-message">${escHtml(message)}</span>` +
    (undoLabel
      ? `<button type="button" class="wb-undo-toast-btn" data-wb-undo>${escHtml(undoLabel)}</button>`
      : '') +
    '<button type="button" class="wb-undo-toast-close" data-wb-undo-close aria-label="Cerrar aviso">×</button>' +
    '</div>'
  );
}

/**
 * @param {{
 *   message: string,
 *   undoLabel?: string,
 *   onUndo?: () => void,
 *   container?: HTMLElement,
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

  function remove() {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }

  const undoBtn = toast.querySelector('[data-wb-undo]');
  if (undoBtn && typeof opts.onUndo === 'function') {
    undoBtn.addEventListener('click', () => {
      opts.onUndo();
      remove();
    });
  }

  const closeBtn = toast.querySelector('[data-wb-undo-close]');
  if (closeBtn) closeBtn.addEventListener('click', remove);

  return toast;
}
