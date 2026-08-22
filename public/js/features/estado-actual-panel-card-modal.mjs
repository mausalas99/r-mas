/**
 * Generic "dashboard card → modal" plumbing shared by every Estado Actual
 * card except Congestión/POCUS (which keeps its own dedicated modal —
 * `cardio/estado-actual-congestion-modal.mjs` — since it edits a dated log,
 * not live monitoreo state). Mirrors `estado-actual-registro-modal.mjs`'s
 * open/close/dismiss pattern against a single shared backdrop; each card
 * type supplies its own title/body/wire callback via `openEaCardModal`.
 */
var dismissWired = false;

function getBackdrop() {
  return document.getElementById('ea-card-modal-backdrop');
}

function getTitleEl() {
  return document.getElementById('ea-card-modal-title');
}

function getSubEl() {
  return document.getElementById('ea-card-modal-sub');
}

function getBodyEl() {
  return document.getElementById('ea-card-modal-body');
}

/**
 * @param {{ title: string, subtitle?: string, bodyHtml: string, cardType?: string, wire?: (bodyEl: HTMLElement) => void }} opts
 */
export function openEaCardModal(opts) {
  var backdrop = getBackdrop();
  var body = getBodyEl();
  if (!backdrop || !body || !opts) return;
  var titleEl = getTitleEl();
  var subEl = getSubEl();
  if (titleEl) titleEl.textContent = opts.title || '';
  if (subEl) subEl.textContent = opts.subtitle || '';
  body.innerHTML = opts.bodyHtml || '';
  // Stamped so `refreshOpenEaCardModal` (estado-actual-panel-clinico.mjs) can
  // re-render whichever card is currently open after a background action
  // (confirm/discard a proposal, etc.) touches the same state.
  body.dataset.eaCardType = opts.cardType || '';
  if (typeof opts.wire === 'function') opts.wire(body);
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  var first = body.querySelector('input, select, textarea, button');
  if (first && 'focus' in first) first.focus();
}

export function closeEaCardModal() {
  var backdrop = getBackdrop();
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  var body = getBodyEl();
  if (body) {
    body.innerHTML = '';
    delete body.dataset.eaCardType;
  }
}

function handleEaCardModalEscape(ev) {
  if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
  var backdrop = getBackdrop();
  if (backdrop && backdrop.classList.contains('open')) {
    closeEaCardModal();
    ev.preventDefault();
    ev.stopPropagation();
  }
}

/** Escape y clic fuera. */
export function wireEaCardModalDismiss() {
  if (dismissWired) return;
  dismissWired = true;
  document.addEventListener('keydown', handleEaCardModalEscape, true);
  var backdrop = getBackdrop();
  if (backdrop) {
    backdrop.addEventListener('click', function (ev) {
      if (!backdrop.classList.contains('open')) return;
      if (ev.target !== backdrop) return;
      closeEaCardModal();
    });
  }
}

export const windowHandlers = {
  closeEaCardModal,
};
