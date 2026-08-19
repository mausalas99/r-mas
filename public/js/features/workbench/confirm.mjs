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
import { escHtml } from '../../dom-escape.mjs';
import { showUndoToast } from './undo-toast.mjs';

/** @type {{ backdrop: HTMLElement, onKeydown: (ev: KeyboardEvent) => void, resolve: (v: string) => void }|null} */
let activeConfirm = null;

/**
 * @param {{
 *   weight: 'destructive'|'consequence',
 *   title?: string,
 *   message?: string,
 *   consequenceLabel?: string,
 *   consequenceText?: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   secondaryLabel?: string,
 * }} opts
 */
function confirmButtonClass(weight) {
  return weight === 'destructive' ? 'wb-btn wb-btn-danger' : 'wb-btn wb-btn-primary';
}

function buildConsequenceHtml(weight, consequenceLabel, consequenceText) {
  if (weight !== 'consequence' || !consequenceText) return '';
  const labelHtml = consequenceLabel
    ? `<span class="wb-confirm-consequence-label">${escHtml(consequenceLabel)}</span>`
    : '';
  return (
    '<div class="wb-confirm-consequence">' +
    labelHtml +
    `<span class="wb-confirm-consequence-text">${escHtml(consequenceText)}</span>` +
    '</div>'
  );
}

function buildSecondaryHtml(secondaryLabel) {
  return secondaryLabel
    ? `<button type="button" class="wb-btn wb-btn-link" data-wb-confirm-secondary>${escHtml(secondaryLabel)}</button>`
    : '';
}

function footerClassForWeight(weight) {
  return weight === 'consequence' ? 'wb-confirm-footer wb-confirm-footer--rail' : 'wb-confirm-footer';
}

export function buildConfirmModalHtml(opts = {}) {
  const {
    weight,
    title = '',
    message = '',
    consequenceLabel = '',
    consequenceText = '',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    secondaryLabel = '',
  } = opts;

  const confirmClass = confirmButtonClass(weight);
  const consequenceHtml = buildConsequenceHtml(weight, consequenceLabel, consequenceText);
  const secondaryHtml = buildSecondaryHtml(secondaryLabel);
  const footerClass = footerClassForWeight(weight);

  return (
    '<div class="wb-scrim" data-wb-confirm-backdrop>' +
    `<div class="wb-confirm-modal wb-confirm-modal--${weight}" role="dialog" aria-modal="true">` +
    '<div class="wb-confirm-body">' +
    `<span class="wb-confirm-title">${escHtml(title)}</span>` +
    consequenceHtml +
    (message ? `<span class="wb-confirm-message">${escHtml(message)}</span>` : '') +
    '</div>' +
    `<div class="${footerClass}">` +
    secondaryHtml +
    '<div class="wb-confirm-footer-actions">' +
    `<button type="button" class="wb-btn wb-btn-secondary" data-wb-confirm-cancel>${escHtml(cancelLabel)}</button>` +
    `<button type="button" class="${confirmClass}" data-wb-confirm-ok>${escHtml(confirmLabel)}</button>` +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/** @param {'confirm'|'cancel'} result */
function closeActiveConfirm(result) {
  if (!activeConfirm) return;
  const { backdrop, onKeydown, resolve } = activeConfirm;
  document.removeEventListener('keydown', onKeydown);
  if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  activeConfirm = null;
  if (typeof resolve === 'function') resolve(result);
}

/**
 * @param {Parameters<typeof buildConfirmModalHtml>[0] & {
 *   onConfirm?: () => void,
 *   onCancel?: () => void,
 *   onSecondary?: () => void,
 * }} opts
 * @returns {Promise<'confirm'|'cancel'>}
 */
function openModalConfirm(opts) {
  return new Promise((resolve) => {
    if (activeConfirm) closeActiveConfirm('cancel');

    const wrap = document.createElement('div');
    wrap.innerHTML = buildConfirmModalHtml(opts);
    const backdrop = wrap.firstElementChild;
    document.body.appendChild(backdrop);

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

    backdrop.querySelector('[data-wb-confirm-ok]').addEventListener('click', () => {
      if (typeof opts.onConfirm === 'function') opts.onConfirm();
      closeActiveConfirm('confirm');
    });

    const secondaryBtn = backdrop.querySelector('[data-wb-confirm-secondary]');
    if (secondaryBtn && typeof opts.onSecondary === 'function') {
      secondaryBtn.addEventListener('click', () => opts.onSecondary());
    }

    activeConfirm = { backdrop, onKeydown, resolve };
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
 *   undoLabel?: string,
 *   onConfirm?: () => void,
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

/** Force-close any open confirm modal (e.g. on route change). */
export function closeConfirm() {
  closeActiveConfirm('cancel');
}
