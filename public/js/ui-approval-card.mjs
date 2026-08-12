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
export function buildApprovalCardHtml(opts) {
  opts = opts || {};
  if (opts.sent) {
    return (
      '<div class="ui-approval-card ui-approval-card--sent">' +
      '<span class="ui-approval-sent-check" aria-hidden="true"></span>' +
      '<p class="ui-approval-sent-label">' +
      escHtml(opts.sentLabel || 'Listo') +
      '</p></div>'
    );
  }
  var type = opts.type === 'check' ? 'check' : 'radio';
  var selected = Array.isArray(opts.selected) ? opts.selected : [];
  var options = opts.options || [];
  var qi = opts.questionIndex != null ? opts.questionIndex : 0;
  var qc = opts.questionCount != null ? opts.questionCount : 1;
  var title = opts.title ? '<h3 class="ui-approval-title">' + escHtml(opts.title) + '</h3>' : '';
  var optsHtml = options
    .map(function (o, i) {
      return buildApprovalOptionHtml(o, i, selected, type);
    })
    .join('');
  var custom =
    opts.customPlaceholder != null
      ? '<label class="ui-approval-custom"><span class="ui-approval-mark-spacer" aria-hidden="true"></span>' +
        '<input type="text" class="ui-approval-custom-input" data-approval-custom ' +
        'placeholder="' +
        escHtml(opts.customPlaceholder) +
        '" value="' +
        escHtml(opts.customValue || '') +
        '" aria-label="Respuesta personalizada" /></label>'
      : '';
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

export function wrapApprovalInConflictModal(innerHtml) {
  return '<div class="lab-conflict-modal ui-approval-modal">' + innerHtml + '</div>';
}

/**
 * Simple destructive confirm (no radio quiz).
 * @param {{ question: string, confirmLabel?: string, cancelLabel?: string, title?: string }} opts
 */
export function buildConfirmCardHtml(opts) {
  opts = opts || {};
  var title = opts.title
    ? '<h3 class="ui-approval-title">' + escHtml(opts.title) + '</h3>'
    : '';
  return (
    '<div class="ui-approval-card ui-approval-card--confirm">' +
    title +
    '<div class="ui-approval-head">' +
    '<p class="ui-approval-question">' +
    escHtml(opts.question || '') +
    '</p>' +
    '<button type="button" class="ui-approval-dismiss" data-approval-dismiss aria-label="' +
    escHtml(opts.cancelLabel || 'Cancelar') +
    '">×</button></div>' +
    '<div class="ui-approval-footer ui-approval-footer--confirm">' +
    '<button type="button" class="ui-approval-cancel" data-approval-cancel>' +
    escHtml(opts.cancelLabel || 'Cancelar') +
    '</button>' +
    '<button type="button" class="ui-approval-danger" data-approval-confirm>' +
    escHtml(opts.confirmLabel || 'Eliminar') +
    '</button></div></div>'
  );
}
