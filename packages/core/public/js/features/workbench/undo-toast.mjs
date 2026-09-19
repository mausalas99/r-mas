/**
 * Workbench kit — undo toast.
 * README 11c: `om-rise` for the entrance (+10px→0, fade in). Auto-dismisses
 * after AUTO_DISMISS_MS if the user doesn't click Deshacer or close it.
 */
import { escHtml } from '../../dom-escape.mjs';

const DEFAULT_UNDO_LABEL = 'Deshacer';
const AUTO_DISMISS_MS = 5000;

/** One toast per host at a time — a new one replaces, never stacks on, the last. */
const activeToastByHost = new WeakMap();

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
  const prevToast = activeToastByHost.get(host);
  if (prevToast && prevToast.parentNode) prevToast.parentNode.removeChild(prevToast);
  const wrap = document.createElement('div');
  wrap.innerHTML = buildUndoToastHtml(opts);
  const toast = wrap.firstElementChild;
  host.appendChild(toast);
  activeToastByHost.set(host, toast);

  function remove() {
    clearTimeout(autoDismissTimer);
    if (toast.parentNode) toast.parentNode.removeChild(toast);
    if (activeToastByHost.get(host) === toast) activeToastByHost.delete(host);
  }

  const autoDismissTimer = setTimeout(remove, AUTO_DISMISS_MS);

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
