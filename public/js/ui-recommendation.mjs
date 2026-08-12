/**
 * Recommendation card: confidence meter + primary CTA + alternatives drawer.
 */
import { escHtml } from './dom-escape.mjs';

export function buildConfidenceMeterHtml(signal, toneCssVar) {
  var s = Math.max(0, Math.min(3, Number(signal) || 0));
  var tone = toneCssVar || 'var(--color-accent)';
  var bars = '';
  for (var i = 0; i < 3; i += 1) {
    bars +=
      '<span class="ui-rec-meter-bar" style="background:' +
      (i < s ? tone : 'var(--color-border-strong, var(--color-border))') +
      '"></span>';
  }
  return '<span class="ui-rec-meter" aria-hidden="true">' + bars + '</span>';
}

/**
 * @param {{
 *   title: string,
 *   bodyHtml: string,
 *   signal?: number,
 *   tone?: string,
 *   confidenceLabel?: string,
 *   primaryLabel?: string,
 *   alternativesLabel?: string,
 *   alternativesOpen?: boolean,
 *   alternatives?: Array<{ key: string, short: string, label: string, signal?: number, tone?: string }>,
 *   accepted?: boolean,
 *   acceptedLabel?: string,
 * }} opts
 */
export function buildRecommendationCardHtml(opts) {
  opts = opts || {};
  var signal = opts.signal != null ? opts.signal : 2;
  var tone = opts.tone || 'var(--color-accent)';
  var alts = opts.alternatives || [];
  var open = !!opts.alternativesOpen;
  var accepted = !!opts.accepted;
  var altRows = alts
    .map(function (a) {
      return (
        '<button type="button" class="ui-rec-alt" data-rec-alt="' +
        escHtml(a.key) +
        '">' +
        buildConfidenceMeterHtml(a.signal != null ? a.signal : 1, a.tone || 'var(--color-ink-muted)') +
        '<span class="ui-rec-alt-short">' +
        escHtml(a.short) +
        '</span>' +
        '<span class="ui-rec-alt-label">' +
        escHtml(a.label || '') +
        '</span></button>'
      );
    })
    .join('');
  var drawer =
    '<div class="ui-rec-drawer" style="grid-template-rows:' +
    (open ? '1fr' : '0fr') +
    ';opacity:' +
    (open ? '1' : '0') +
    '"><div class="ui-rec-drawer-inner">' +
    '<p class="ui-rec-drawer-lead">Otras opciones</p>' +
    altRows +
    '</div></div>';
  return (
    '<div class="ui-rec-card">' +
    '<div class="ui-rec-pad">' +
    '<p class="ui-rec-title">' +
    escHtml(opts.title || '') +
    '</p>' +
    '<div class="ui-rec-body">' +
    (opts.bodyHtml || '') +
    '</div></div>' +
    drawer +
    '<div class="ui-rec-footer">' +
    '<span class="ui-rec-confidence">' +
    buildConfidenceMeterHtml(signal, tone) +
    '<span class="ui-rec-confidence-label">' +
    escHtml(opts.confidenceLabel || '') +
    '</span></span>' +
    '<span class="ui-rec-actions">' +
    '<button type="button" class="ui-rec-alts-btn" data-rec-alts aria-expanded="' +
    (open ? 'true' : 'false') +
    '">' +
    escHtml(opts.alternativesLabel || 'Alternativas') +
    '</button>' +
    '<button type="button" class="ui-rec-primary' +
    (accepted ? ' is-accepted' : '') +
    '" data-rec-accept>' +
    escHtml(accepted ? opts.acceptedLabel || 'Aceptado' : opts.primaryLabel || 'Aceptar') +
    '</button></span></div></div>'
  );
}
