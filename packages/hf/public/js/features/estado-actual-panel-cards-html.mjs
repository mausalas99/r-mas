/**
 * Estado Actual dashboard — a grid of compact, boxy cards (Descongestión,
 * Congestión/POCUS, Identidad, Estado clínico, Nutrición, Medicamentos).
 * Each card shows the info you'd otherwise have to open a form to see; click
 * it to open the matching registro modal. Replaces the old single
 * "Estado clínico general" accordion that buried cardio-relevant fields
 * under generic ICU fields (FOUR/soporte/dieta/meds).
 */
import { escHtml, escAttr } from './estado-actual-panel-format.mjs';
import { MED_FIELD_KEYS } from './estado-actual-data.mjs';
import { medCategoryHasContent } from './estado-actual-med-ui.mjs';
import { vexusPillHtml, stevensonPillHtml } from './cardio/estado-actual-cardio-html.mjs';

/**
 * @param {string} type data-ea-card value, also used as the modal's content key
 * @param {string} title
 * @param {string} rowsHtml
 * @param {string} [badgeHtml]
 */
function cardFaceHtml(type, title, rowsHtml, badgeHtml) {
  return (
    '<button type="button" class="ea-section ea-card ea-dash-card" data-ea-card="' +
    escAttr(type) +
    '">' +
    '<div class="ea-dash-card-head">' +
    '<h3 class="ea-dash-card-title">' +
    escHtml(title) +
    '</h3>' +
    (badgeHtml || '') +
    '</div>' +
    '<div class="ea-dash-card-body">' +
    rowsHtml +
    '</div>' +
    '</button>'
  );
}

/**
 * @param {string} label
 * @param {string} value
 */
function rowHtml(label, value) {
  return (
    '<div class="ea-dash-card-row">' +
    '<span class="ea-dash-card-row-label">' +
    escHtml(label) +
    '</span>' +
    '<span class="ea-dash-card-row-val">' +
    escHtml(value) +
    '</span>' +
    '</div>'
  );
}

function emptyRowHtml(text) {
  return '<p class="ea-dash-card-empty">' + escHtml(text) + '</p>';
}

/**
 * @param {ReturnType<typeof import('./cardio/estado-actual-cardio-data.mjs').buildDescongestionStats>} stats
 */
export function renderDescongestionCardHtml(stats) {
  var overrides = stats.overrides || {};
  var anyManual = overrides.diuresisAcumuladaMl != null || overrides.furosemidaAcumuladaMg != null || overrides.balanceAcumuladoMl != null;
  var rows =
    rowHtml('Días descongestión', String(stats.diasDescongestion ?? '—')) +
    rowHtml('Diuresis hoy', (stats.diuresisHoyMl ?? '—') + ' mL') +
    rowHtml('Furosemida acum.', (stats.furosemidaAcumuladaMg ?? '—') + ' mg') +
    rowHtml('Balance acum.', (stats.balanceAcumuladoMl ?? '—') + ' mL');
  return cardFaceHtml(
    'descongestion',
    'Descongestión',
    rows,
    anyManual ? '<span class="ea-pendiente-badge">Manual</span>' : ''
  );
}

/**
 * @param {Record<string, unknown>} cardio
 */
export function renderCongestionCardHtml(cardio) {
  var pocusByDay = Array.isArray(cardio && cardio.pocusByDay) ? cardio.pocusByDay : [];
  var latest = pocusByDay.slice().sort(function (a, b) {
    return String((b && b.date) || '').localeCompare(String((a && a.date) || ''));
  })[0];
  var rows;
  if (latest) {
    var pills = vexusPillHtml(latest.vexus) + ' ' + stevensonPillHtml(latest.stevenson);
    rows =
      rowHtml('Última fecha', String(latest.date || '—')) +
      '<div class="ea-dash-card-row">' + pills + '</div>' +
      (latest.fevi ? rowHtml('FEVI', String(latest.fevi)) : '');
  } else {
    rows = emptyRowHtml('Sin registros de congestión/POCUS.');
  }
  return cardFaceHtml('congestion', 'Congestión / POCUS', rows);
}

/**
 * @param {Record<string, unknown>} cardio
 */
export function renderIdentidadCardHtml(cardio) {
  var c = cardio || {};
  var rows =
    rowHtml('Fenotipo', String(c.fenotipo || '—')) +
    rowHtml('Etiología', String(c.etiologia || '—')) +
    rowHtml('Ritmo', String(c.ritmo || '—'));
  return cardFaceHtml('identidad', 'Identidad', rows);
}

/**
 * @param {Record<string, unknown>} ec
 */
export function renderEstadoClinicoCardHtml(ec) {
  var rows =
    rowHtml('FOUR (/16)', String(ec.four || '—')) +
    rowHtml('Esferas', String(ec.esferas || '—')) +
    rowHtml('Soporte resp.', String(ec.soporte || 'Aire ambiente'));
  return cardFaceHtml('estado-clinico', 'Estado clínico', rows);
}

/**
 * @param {Record<string, unknown>} ec
 * @param {boolean} dietPending
 * @param {string} kcalDisplay
 */
export function renderNutricionCardHtml(ec, dietPending, kcalDisplay) {
  var rows = rowHtml('Dieta', String(ec.dieta || '—')) + rowHtml('Kcal', String(kcalDisplay || '—'));
  return cardFaceHtml(
    'nutricion',
    'Nutrición',
    rows,
    dietPending ? '<span class="ea-pendiente-badge">Propuesta</span>' : ''
  );
}

/**
 * @param {Record<string, unknown>} monitoreo
 * @param {string | null} activeId
 * @param {Record<string, unknown>} medRecetaByPatient
 * @param {boolean} anyMedPending
 */
export function renderMedicamentosCardHtml(monitoreo, activeId, medRecetaByPatient, anyMedPending) {
  var activeCount = MED_FIELD_KEYS.filter(function (key) {
    return medCategoryHasContent(key, monitoreo, activeId, medRecetaByPatient);
  }).length;
  var rows = activeCount
    ? rowHtml('Categorías activas', String(activeCount))
    : emptyRowHtml('Sin medicamentos registrados.');
  return cardFaceHtml(
    'medicamentos',
    'Medicamentos',
    rows,
    anyMedPending ? '<span class="ea-pendiente-badge">Propuesta</span>' : ''
  );
}

/**
 * @param {{
 *   cardio?: Record<string, unknown> | null,
 *   descongestionStats?: Record<string, unknown> | null,
 *   ec: Record<string, unknown>,
 *   dietPending: boolean,
 *   kcalDisplay: string,
 *   monitoreo: Record<string, unknown>,
 *   activeId: string | null,
 *   medRecetaByPatient: Record<string, unknown>,
 *   anyMedPending: boolean,
 * }} ctx
 */
export function renderEaDashboardGridHtml(ctx) {
  var cards = [];
  if (ctx.cardio) {
    cards.push(renderDescongestionCardHtml(ctx.descongestionStats));
    cards.push(renderCongestionCardHtml(ctx.cardio));
    cards.push(renderIdentidadCardHtml(ctx.cardio));
  }
  cards.push(renderEstadoClinicoCardHtml(ctx.ec));
  cards.push(renderNutricionCardHtml(ctx.ec, ctx.dietPending, ctx.kcalDisplay));
  cards.push(
    renderMedicamentosCardHtml(ctx.monitoreo, ctx.activeId, ctx.medRecetaByPatient, ctx.anyMedPending)
  );
  return '<div class="ea-dashboard-grid" id="ea-dashboard-grid">' + cards.join('') + '</div>';
}
