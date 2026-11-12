/**
 * HITL approval card body for lab-conflict-backdrop chrome.
 * One question at a time; radio/check options; pager; primary action.
 */
import { escHtml } from './dom-escape.mjs';

export function buildApprovalOptionHtml(opt, index, selected, type) {
  var on = selected.indexOf(index) >= 0;
  var shape = type === 'check' ? 'ui-approval-mark--check' : 'ui-approval-mark--radio';
  return (
    '<button type="button" class="ui-approval-option" data-approval-opt="' +
    index +
    '" aria-pressed="' +
    (on ? 'true' : 'false') +
    '">' +
    '<span class="ui-approval-mark ' +
    shape +
    (on ? ' is-on' : '') +
    '" aria-hidden="true"></span>' +
    '<span class="ui-approval-option-label">' +
    escHtml(opt) +
    '</span></button>'
  );
}

export function buildApprovalPagerHtml(count, current, sent) {
  var dots = [];
  for (var i = 0; i < count; i += 1) {
    var cur = i === current && !sent;
    var done = sent || i < current;
    dots.push(
      '<button type="button" class="ui-approval-dot' +
        (cur ? ' is-current' : '') +
        (done ? ' is-done' : '') +
        '" data-approval-page="' +
        i +
        '" aria-label="Pregunta ' +
        (i + 1) +
        '"' +
        (sent ? ' disabled' : '') +
        (cur ? ' aria-current="step"' : '') +
        '></button>'
    );
  }
  return '<span class="ui-approval-pager">' + dots.join('') + '</span>';
}

/**
 * @param {{
 *   title?: string,
 *   question: string,
 *   type?: 'radio'|'check',
 *   options: string[],
 *   selected?: number[],
 *   questionIndex?: number,
 *   questionCount?: number,
 *   primaryLabel?: string,
 *   dismissLabel?: string,
 *   customPlaceholder?: string,
 *   customValue?: string,
 *   sent?: boolean,
 *   sentLabel?: string,
 * }} opts
 */
function buildApprovalSentCardHtml_(opts) {
  return (
    '<div class="ui-approval-card ui-approval-card--sent">' +
    '<span class="ui-approval-sent-check" aria-hidden="true"></span>' +
    '<p class="ui-approval-sent-label">' +
    escHtml(opts.sentLabel || 'Listo') +
    '</p></div>'
  );
}

function buildApprovalCustomInputHtml_(opts) {
  if (opts.customPlaceholder == null) return '';
  return (
    '<label class="ui-approval-custom"><span class="ui-approval-mark-spacer" aria-hidden="true"></span>' +
    '<input type="text" class="ui-approval-custom-input" data-approval-custom ' +
    'placeholder="' +
    escHtml(opts.customPlaceholder) +
    '" value="' +
    escHtml(opts.customValue || '') +
    '" aria-label="Respuesta personalizada" /></label>'
  );
}

function buildApprovalCardBody_(opts, type, selected, options, qi, qc) {
  var title = opts.title ? '<h3 class="ui-approval-title">' + escHtml(opts.title) + '</h3>' : '';
  var optsHtml = options
    .map(function (o, i) {
      return buildApprovalOptionHtml(o, i, selected, type);
    })
    .join('');
  var custom = buildApprovalCustomInputHtml_(opts);
  var hasAnswer = selected.length > 0 || Boolean(String(opts.customValue || '').trim());
  return (
    '<div class="ui-approval-card" data-approval-type="' +
    type +
    '">' +
    title +
    '<div class="ui-approval-head">' +
    '<p class="ui-approval-question">' +
    escHtml(opts.question || '') +
    '</p>' +
    '<button type="button" class="ui-approval-dismiss" data-approval-dismiss aria-label="' +
    escHtml(opts.dismissLabel || 'Cerrar') +
    '">×</button></div>' +
    '<div class="ui-approval-options">' +
    optsHtml +
    custom +
    '</div>' +
    '<div class="ui-approval-footer">' +
    buildApprovalPagerHtml(qc, qi, false) +
    '<button type="button" class="ui-approval-primary" data-approval-primary' +
    (hasAnswer ? '' : ' disabled') +
    '>' +
    escHtml(opts.primaryLabel || 'Continuar') +
    '</button></div></div>'
  );
}

export function buildApprovalCardHtml(opts) {
  opts = opts || {};
  if (opts.sent) return buildApprovalSentCardHtml_(opts);
  var type = opts.type === 'check' ? 'check' : 'radio';
  var selected = Array.isArray(opts.selected) ? opts.selected : [];
  var options = opts.options || [];
  var qi = opts.questionIndex != null ? opts.questionIndex : 0;
  var qc = opts.questionCount != null ? opts.questionCount : 1;
  return buildApprovalCardBody_(opts, type, selected, options, qi, qc);
}

export function wrapApprovalInConflictModal(innerHtml) {
  return '<div class="lab-conflict-modal ui-approval-modal">' + innerHtml + '</div>';
}

/**
 * @param {{
 *   id?: string,
 *   title?: string,
 *   question?: string,
 *   items?: string[],
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   stacked?: boolean,
 * }} opts  `stacked: true` raises the backdrop above a modal already open
 *   (e.g. Conexión/Administración, at --z-modal-nested) — see stacked-overlay.mjs.
 * @returns {Promise<boolean>}
 */
export async function showConfirmDialog(opts) {
  if (typeof document === 'undefined') return false;
  var view = await import('./ui-approval-card-view.jsx');
  return new Promise(function (resolve) {
    var backdrop = document.createElement('div');
    backdrop.className = opts && opts.stacked
      ? 'lab-conflict-backdrop lab-conflict-backdrop--stacked'
      : 'lab-conflict-backdrop';
    if (opts && opts.id) backdrop.id = String(opts.id);
    view.drawConfirmDialog(backdrop, opts);
    var done = false;
    function finish(ok) {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      resolve(ok);
    }
    function onKey(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        finish(false);
      }
    }
    var confirmBtn = backdrop.querySelector('[data-approval-confirm]');
    var cancelBtn = backdrop.querySelector('[data-approval-cancel]');
    if (confirmBtn) confirmBtn.addEventListener('click', function () { finish(true); });
    if (cancelBtn) cancelBtn.addEventListener('click', function () { finish(false); });
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) finish(false);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(backdrop);
    if (cancelBtn && typeof cancelBtn.focus === 'function') cancelBtn.focus();
  });
}
