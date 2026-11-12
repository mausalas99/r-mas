/**
 * Workbench kit — confirmation, one component with a `weight` prop.
 * README 11a — three weights:
 *  - `destructive`: scrim modal, alert-colored button on the right.
 *  - `consequence`: scrim modal, teal primary button, `--color-rail` footer
 *    background, expects a one-sentence consequences string.
 *  - `reversible`: NO modal — the caller has already executed the action;
 *    this just triggers the `om-rise` undo toast.
 * Modal open transition ~160ms ease-out. Esc key and click-outside close it.
 */
import { showUndoToast } from './undo-toast.mjs';
import { wireFocusTrap, restoreFocus, focusFirstFocusable } from '../../modal-dismiss.mjs';

/** @type {{ backdrop: HTMLElement, onKeydown: (ev: KeyboardEvent) => void, resolve: (v: string) => void, trap: { unwire: () => void }, previousFocus: Element|null }|null} */
let activeConfirm = null;

/** @param {'confirm'|'cancel'|'secondary'} result */
function closeActiveConfirm(result) {
  if (!activeConfirm) return;
  const { backdrop, onKeydown, resolve, trap, previousFocus } = activeConfirm;
  document.removeEventListener('keydown', onKeydown);
  trap.unwire();
  if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  activeConfirm = null;
  restoreFocus(previousFocus);
  if (typeof resolve === 'function') resolve(result);
}

/**
 * @param {Record<string, any> & {
 *   onConfirm?: () => void,
 *   onCancel?: () => void,
 *   onSecondary?: () => void,
 * }} opts
 * @returns {Promise<'confirm'|'cancel'|'secondary'>}
 */
async function openModalConfirm(opts) {
  const previousFocus = document.activeElement;
  const { buildConfirmBackdrop } = await import('./confirm-view.jsx');
  return new Promise((resolve) => {
    if (activeConfirm) closeActiveConfirm('cancel');

    const backdrop = buildConfirmBackdrop(opts);
    document.body.appendChild(backdrop);
    const panel = backdrop.querySelector('[role="dialog"]');
    const trap = wireFocusTrap(panel);
    focusFirstFocusable(panel);

    // Open transition: add the class on the next frame so the CSS transition runs.
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 0);
    raf(() => backdrop.classList.add('wb-scrim--open'));

    const onKeydown = (ev) => {
      if (ev.key === 'Escape') {
        if (typeof opts.onCancel === 'function') opts.onCancel();
        closeActiveConfirm('cancel');
      }
    };
    document.addEventListener('keydown', onKeydown);

    backdrop.addEventListener('click', (ev) => {
      if (ev.target === backdrop) {
        if (typeof opts.onCancel === 'function') opts.onCancel();
        closeActiveConfirm('cancel');
      }
    });

    backdrop.querySelector('[data-wb-confirm-cancel]').addEventListener('click', () => {
      if (typeof opts.onCancel === 'function') opts.onCancel();
      closeActiveConfirm('cancel');
    });

    const input = backdrop.querySelector('[data-wb-confirm-input]');
    const okBtn = backdrop.querySelector('[data-wb-confirm-ok]');
    // A secondary choice sits first in the footer: start on Cancelar, not on it.
    if (!input) backdrop.querySelector('[data-wb-confirm-cancel]').focus();
    okBtn.addEventListener('click', () => {
      if (typeof opts.onConfirm === 'function') opts.onConfirm(input ? input.value : undefined);
      closeActiveConfirm('confirm');
    });
    if (input) {
      input.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter') return;
        // Without this, Enter also presses the button that gets focus back and reopens the dialog.
        ev.preventDefault();
        okBtn.click();
      });
    }

    const secondaryBtn = backdrop.querySelector('[data-wb-confirm-secondary]');
    if (secondaryBtn) {
      secondaryBtn.addEventListener('click', () => {
        if (typeof opts.onSecondary === 'function') opts.onSecondary();
        closeActiveConfirm('secondary');
      });
    }

    activeConfirm = { backdrop, onKeydown, resolve, trap, previousFocus };
  });
}

/**
 * @param {{
 *   weight: 'destructive'|'consequence'|'reversible',
 *   title?: string,
 *   message?: string,
 *   consequenceLabel?: string,
 *   consequenceText?: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   secondaryLabel?: string,
 *   inputLabel?: string,
 *   inputValue?: string,
 *   inputType?: 'text'|'password',
 *   undoLabel?: string,
 *   onConfirm?: (inputValue?: string) => void,
 *   onCancel?: () => void,
 *   onSecondary?: () => void,
 *   onUndo?: () => void,
 * }} opts
 * @returns {Promise<string>}
 */
export function openConfirm(opts = {}) {
  const { weight } = opts;
  if (weight === 'reversible') {
    showUndoToast({ message: opts.message || '', undoLabel: opts.undoLabel, onUndo: opts.onUndo });
    return Promise.resolve('reversible');
  }
  if (weight === 'destructive' || weight === 'consequence') {
    return openModalConfirm(opts);
  }
  throw new Error(`wb-confirm: unknown weight "${weight}"`);
}

/**
 * In-app stand-in for window.prompt(), which returns null in the Electron renderer.
 * @param {{ title: string, inputLabel: string, inputValue?: string, inputType?: 'text'|'password', message?: string, confirmLabel?: string }} opts
 * @returns {Promise<string|null>} the typed text, or null on cancel.
 */
export async function promptText(opts) {
  let value = null;
  const result = await openModalConfirm({
    weight: 'consequence',
    confirmLabel: 'Aceptar',
    ...opts,
    onConfirm: (v) => {
      value = v;
    },
  });
  return result === 'confirm' ? value : null;
}
