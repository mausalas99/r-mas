/**
 * Markup for the cardio-specific form fields shown inside Estado Actual
 * dashboard card modals (Descongestión, Congestión/POCUS, Identidad) — see
 * `estado-actual-panel-clinico.mjs` for the modals that render these, and
 * `estado-actual-panel-cards-html.mjs` for the card faces. Reuses the
 * pane's own `.ea-snapshot-*` / `.ea-field` / `.ea-btn` / `.ea-historial-*` /
 * `.ea-pendiente-badge` classes — no new CSS file. Colored pills reuse
 * `.ea-pendiente-badge`'s pill shape with the app's own
 * `--todo-prio-alta/media/baja` tone tokens (already used inside
 * estado-actual.css) instead of inventing new color tokens.
 */
import { escHtml, escAttr, escAttrNumeric, displayValue } from '../estado-actual-panel-format.mjs';
import { triSelect, enumSelect, narrativeTextarea } from './hf-field-kit.mjs';
import {
  FENOTIPOS,
  ETIOLOGIAS,
  RITMOS,
  ESTRATEGIA_FA,
  LLENADO_CAPILAR,
  LINEAS_B_CAMPO,
} from '../../../../lib/cardio/hf-enums.mjs';
import { LUNG_ZONE_KEYS, emptyLungZones } from '../../../../lib/cardio/congestion.mjs';

/** @type {Record<string, string>} */
var TONE_VARS = {
  danger: '--todo-prio-alta',
  warning: '--todo-prio-media',
  success: '--todo-prio-baja',
  neutral: '--text-muted',
};

/**
 * @param {string} text
 * @param {'danger'|'warning'|'success'|'neutral'} tone
 */
function pillHtml(text, tone) {
  var v = TONE_VARS[tone] || TONE_VARS.neutral;
  return (
    '<span class="ea-pendiente-badge" style="background:color-mix(in oklab, var(' +
    v +
    ') 20%, var(--surface));color:var(' +
    v +
    ')">' +
    escHtml(text) +
    '</span>'
  );
}

/**
 * VExUS grade pill. 0 = normal (verde), 1 = leve (ámbar), 2–3 = significativo
 * (rojo) — ASSUMPTION: the 3-tone token set here has no separate color for
 * grade 2 vs 3, so both map to the same "danger" tone.
 * @param {unknown} grade
 */
export function vexusPillHtml(grade) {
  if (grade == null || grade === '') return pillHtml('VExUS —', 'neutral');
  var g = Number(grade);
  if (!Number.isFinite(g)) return pillHtml('VExUS —', 'neutral');
  var tone = g <= 0 ? 'success' : g === 1 ? 'warning' : 'danger';
  return pillHtml('VExUS ' + g, tone);
}

/**
 * Stevenson–Nohria profile pill. ASSUMPTION (not specified by the plan):
 * "Caliente-seco" (A, best) → verde, "Frío-húmedo" (C, worst) → rojo, the
 * other two (B, L) → ámbar.
 * @param {unknown} code
 */
export function stevensonPillHtml(code) {
  var c = String(code || '').trim();
  if (!c) return pillHtml('Stevenson —', 'neutral');
  var lower = c.toLowerCase();
  var tone = 'warning';
  if (lower.indexOf('caliente-seco') >= 0) tone = 'success';
  else if (lower.indexOf('frío-húmedo') >= 0 || lower.indexOf('frio-humedo') >= 0) tone = 'danger';
  return pillHtml(c, tone);
}

/**
 * @param {unknown} n
 * @param {string} unit
 */
function statHtml(label, valueHtml, unit, badgeHtml) {
  return (
    '<div><span class="ea-snapshot-label">' +
    escHtml(label) +
    (badgeHtml ? ' ' + badgeHtml : '') +
    '</span><span class="ea-snapshot-io-val">' +
    valueHtml +
    (unit ? ' ' + escHtml(unit) : '') +
    '</span></div>'
  );
}

/**
 * @param {string} key override key on `patient.cardio.overrides`
 * @param {unknown} value
 * @param {boolean} overridden
 */
function overrideInputHtml(key, value) {
  return (
    '<input type="number" step="any" class="ea-input" data-ea-cardio-override="' +
    escAttr(key) +
    '" value="' +
    escAttrNumeric(value) +
    '">'
  );
}

/**
 * Descongestión form fields — rendered inside the Registro Descongestión
 * modal card (`estado-actual-panel-cards-html.mjs`), not inline in the panel.
 * @param {ReturnType<typeof import('./estado-actual-cardio-data.mjs').buildDescongestionStats>} stats
 */
export function renderDescongestionFormHtml(stats) {
  var overrides = stats.overrides || {};
  var manualBadge = '<span class="ea-pendiente-badge">Manual</span>';
  return (
    '<div class="ea-snapshot-strip-body">' +
    '<div class="ea-snapshot-zone">' +
    '<h4 class="ea-snapshot-zone-title">Días</h4>' +
    '<div class="ea-snapshot-io">' +
    statHtml('Internamiento', displayValue(stats.diasInternamiento), 'd') +
    statHtml('Descongestión', displayValue(stats.diasDescongestion), 'd') +
    '</div>' +
    '<label class="ea-field">' +
    '<span class="ea-label">Inicio descongestión</span>' +
    '<input type="date" class="ea-input" data-ea-cardio="inicioDescongestion" value="' +
    escAttr(stats.inicioDescongestion) +
    '">' +
    '</label>' +
    '</div>' +
    '<div class="ea-snapshot-zone">' +
    '<h4 class="ea-snapshot-zone-title">Diuresis</h4>' +
    '<div class="ea-snapshot-io">' +
    statHtml('Hoy', displayValue(stats.diuresisHoyMl), 'mL') +
    statHtml(
      'Acumulada',
      overrideInputHtml('diuresisAcumuladaMl', stats.diuresisAcumuladaMl),
      'mL',
      overrides.diuresisAcumuladaMl != null ? manualBadge : null
    ) +
    '</div>' +
    '</div>' +
    '<div class="ea-snapshot-zone">' +
    '<h4 class="ea-snapshot-zone-title">Furosemida / Balance</h4>' +
    '<div class="ea-snapshot-io">' +
    statHtml(
      'Furosemida acum.',
      overrideInputHtml('furosemidaAcumuladaMg', stats.furosemidaAcumuladaMg),
      'mg',
      overrides.furosemidaAcumuladaMg != null ? manualBadge : null
    ) +
    statHtml(
      'Balance acum.',
      overrideInputHtml('balanceAcumuladoMl', stats.balanceAcumuladoMl),
      'mL',
      overrides.balanceAcumuladoMl != null ? manualBadge : null
    ) +
    '</div>' +
    '<div class="ea-clinico-actions">' +
    '<button type="button" class="ea-btn ea-btn--ghost" data-ea-cardio-action="recalcular">Recalcular</button>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/**
 * Identity fields — rendered inside the Identidad card's modal.
 * @param {Record<string, unknown>} cardio
 */
function identityTextFieldHtml(key, label, value) {
  return (
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">' +
    escHtml(label) +
    '</span>' +
    '<input type="text" class="ea-input" data-ea-cardio="' +
    key +
    '" value="' +
    escAttr(value) +
    '">' +
    '</label>'
  );
}

function identityEnumFieldHtml(key, label, value, options) {
  return (
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">' +
    escHtml(label) +
    '</span>' +
    enumSelect('ea-cardio', key, value, options) +
    '</label>'
  );
}

/**
 * Fenotipo stays a real dropdown (plain codes only — HFrEF/HFmrEF/HFpEF/
 * HFimpEF, no percentages, no descriptive text; see `FENOTIPOS` in
 * `hf-enums.mjs`), sitting right next to a FEVI (%) number box. Typing a
 * FEVI auto-selects the matching fenotipo (`fenotipoFromFevi`); the doctor
 * can still override the dropdown by hand for the one case FEVI alone can't
 * tell (HFimpEF — recovered ejection fraction, needs history).
 * @param {Record<string, unknown>} c
 */
function identityFenotipoFeviHtml(c) {
  return (
    identityEnumFieldHtml('fenotipo', 'Fenotipo', c.fenotipo, FENOTIPOS) +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">FEVI (%)</span>' +
    '<input type="number" min="0" max="100" step="1" class="ea-input" data-ea-cardio="fevi" value="' +
    escAttrNumeric(c.fevi) +
    '">' +
    '</label>'
  );
}

export function renderIdentityRowHtml(cardio) {
  var c = cardio || {};
  var perfilInputs =
    identityFenotipoFeviHtml(c) +
    identityEnumFieldHtml('etiologia', 'Etiología', c.etiologia, ETIOLOGIAS) +
    identityTextFieldHtml('residente', 'Residente', c.residente);
  var ritmoInputs =
    identityEnumFieldHtml('ritmo', 'Ritmo', c.ritmo, RITMOS) +
    identityEnumFieldHtml('estrategiaControlFa', 'Estrategia control FA', c.estrategiaControlFa, ESTRATEGIA_FA);
  return (
    '<div class="ea-clinico-cardio-identity-row">' +
    '<div class="hf-section hf-section--primary">' +
    '<h4 class="hf-section-title">Perfil clínico</h4>' +
    '<div class="hf-field-grid">' +
    perfilInputs +
    '</div>' +
    '</div>' +
    '<div class="hf-section">' +
    '<h4 class="hf-section-title">Ritmo</h4>' +
    '<div class="hf-field-grid">' +
    ritmoInputs +
    '</div>' +
    narrativeTextarea('ea-cardio', 'ekg', c.ekg, 'EKG') +
    '</div>' +
    '</div>'
  );
}

var CONGESTION_CHECKLIST_FIELDS = [
  ['pvy', 'PVY elevada'],
  ['rhy', 'Reflujo hepatoyugular'],
  ['soplo', 'Soplo'],
  ['estertores', 'Estertores'],
  ['ascitisHepatomegalia', 'Ascitis/hepatomegalia'],
  ['edemaMi', 'Edema MI'],
];

var VEXUS_OPTIONS = ['0', '1', '2', '3'];
var STEVENSON_OPTIONS = ['Caliente-seco', 'Caliente-húmedo', 'Frío-seco', 'Frío-húmedo'];
// Labels kept identical to the pre-field-kit inline markup ("Grado N" /
// the raw Stevenson string) — hf-enums.mjs's STEVENSON labels add "(A)"-style
// suffixes not wanted here, so this file keeps its own label mapping.
var VEXUS_SELECT_OPTIONS = VEXUS_OPTIONS.map(function (g) {
  return { value: g, label: 'Grado ' + g };
});
var STEVENSON_SELECT_OPTIONS = STEVENSON_OPTIONS.map(function (s) {
  return { value: s, label: s };
});

// 8-zone lung-US grid labels — same key order as `LUNG_ZONE_KEYS`
// (lib/cardio/congestion.mjs). Side (Der./Izq.) is now conveyed by the
// column header in `renderLungZonesGridHtml`, so the per-zone label only
// needs the anterior/posterior + superior/inferior part.
var LUNG_ZONE_SHORT_LABELS = {
  rAntSup: 'Ant. superior',
  rAntInf: 'Ant. inferior',
  rLatSup: 'Lat. superior',
  rLatInf: 'Lat. inferior',
  lAntSup: 'Ant. superior',
  lAntInf: 'Ant. inferior',
  lLatSup: 'Lat. superior',
  lLatInf: 'Lat. inferior',
};

var LUNG_ZONE_RIGHT_KEYS = LUNG_ZONE_KEYS.slice(0, 4);
var LUNG_ZONE_LEFT_KEYS = LUNG_ZONE_KEYS.slice(4, 8);

function lungZoneCellHtml(z, key) {
  return (
    '<div class="hf-lung-grid-zone">' +
    '<span class="hf-lung-grid-zone-label">' +
    escHtml(LUNG_ZONE_SHORT_LABELS[key]) +
    '</span>' +
    enumSelect('ea-cardio-pocus-zone', key, z[key], LINEAS_B_CAMPO) +
    '</div>'
  );
}

/**
 * 8-zone lung-US grid — one B-line-scale select per zone, rendered inside
 * the POCUS/Congestión form alongside (not replacing) the legacy
 * `lungPattern`/`lungLinesB` free-text fields. Laid out as two side-by-side
 * columns (Derecho/Izquierdo) so the two lung sides read as distinct groups
 * at a glance instead of 8 stacked look-alike blocks.
 * @param {Record<string, string>} zones
 */
function renderLungZonesGridHtml(zones) {
  var z = zones || emptyLungZones();
  return (
    '<div class="hf-section">' +
    '<h4 class="hf-section-title">US pulmonar — 8 zonas (líneas B)</h4>' +
    '<div class="hf-lung-grid">' +
    '<div class="hf-lung-grid-col">' +
    '<h5 class="hf-lung-grid-side-title">Derecho</h5>' +
    LUNG_ZONE_RIGHT_KEYS.map(function (key) { return lungZoneCellHtml(z, key); }).join('') +
    '</div>' +
    '<div class="hf-lung-grid-col">' +
    '<h5 class="hf-lung-grid-side-title">Izquierdo</h5>' +
    LUNG_ZONE_LEFT_KEYS.map(function (key) { return lungZoneCellHtml(z, key); }).join('') +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

/**
 * POCUS draft form fields — rendered inside the Registro Congestión modal
 * (`estado-actual-congestion-modal.mjs`), not inline in the panel.
 * @param {Record<string, unknown>} day one `pocusByDay` record (or an empty
 *   draft shape when starting a new day).
 */
export function renderPocusFormHtml(day) {
  var d = day || {};
  var checklist = d.checklist || {};
  var checklistInputs = CONGESTION_CHECKLIST_FIELDS.map(function (f) {
    return (
      '<label class="ea-field ea-field--inline">' +
      '<span class="ea-label">' +
      escHtml(f[1]) +
      '</span>' +
      triSelect('ea-cardio-pocus', f[0], checklist[f[0]]) +
      '</label>'
    );
  }).join('');

  // Bedside/always-relevant checklist first (fecha + tri-state exam
  // checklist + llenado capilar) so it reads first and more prominent than
  // the more detailed/optional imaging-grade sections below it.
  var evaluacionClinicaSection =
    '<div class="hf-section hf-section--primary">' +
    '<h4 class="hf-section-title">Evaluación clínica</h4>' +
    '<div class="hf-field-grid">' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Fecha</span>' +
    '<input type="date" class="ea-input" data-ea-cardio-pocus="date" value="' +
    escAttr(d.date) +
    '">' +
    '</label>' +
    checklistInputs +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Llenado capilar</span>' +
    enumSelect('ea-cardio-pocus', 'llenadoCapilar', checklist.llenadoCapilar, LLENADO_CAPILAR) +
    '</label>' +
    '</div>' +
    '</div>';

  var vciVexusSection =
    '<div class="hf-section">' +
    '<h4 class="hf-section-title">VCI y VExUS</h4>' +
    '<div class="hf-field-grid">' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">VCI (cm)</span>' +
    '<input type="text" class="ea-input" data-ea-cardio-pocus="vciCm" value="' +
    escAttr(d.vciCm) +
    '">' +
    '</label>' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Colapso VCI</span>' +
    '<input type="text" class="ea-input" data-ea-cardio-pocus="vciCollapse" value="' +
    escAttr(d.vciCollapse) +
    '">' +
    '</label>' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">VExUS</span>' +
    enumSelect('ea-cardio-pocus', 'vexus', d.vexus, VEXUS_SELECT_OPTIONS) +
    '</label>' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">FEVI</span>' +
    '<input type="text" class="ea-input" data-ea-cardio-pocus="fevi" value="' +
    escAttr(d.fevi) +
    '">' +
    '</label>' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Score congestión</span>' +
    '<input type="number" min="0" step="1" class="ea-input" data-ea-cardio-pocus="congestionScore" value="' +
    escAttrNumeric(d.congestionScore) +
    '">' +
    '</label>' +
    '</div>' +
    '</div>';

  var usPulmonarSection =
    '<div class="hf-section">' +
    '<h4 class="hf-section-title">US pulmonar — patrón general</h4>' +
    '<div class="hf-field-grid">' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Patrón pulmonar</span>' +
    '<input type="text" class="ea-input" data-ea-cardio-pocus="lungPattern" value="' +
    escAttr(d.lungPattern) +
    '">' +
    '</label>' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Líneas B</span>' +
    '<input type="text" class="ea-input" data-ea-cardio-pocus="lungLinesB" value="' +
    escAttr(d.lungLinesB) +
    '">' +
    '</label>' +
    '</div>' +
    '</div>' +
    renderLungZonesGridHtml(d.lungZones);

  var escalasSection =
    '<div class="hf-section">' +
    '<h4 class="hf-section-title">Escalas y funcional</h4>' +
    '<div class="hf-field-grid">' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Stevenson–Nohria</span>' +
    enumSelect('ea-cardio-pocus', 'stevenson', d.stevenson, STEVENSON_SELECT_OPTIONS) +
    '</label>' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">6MWT (m)</span>' +
    '<input type="number" min="0" step="1" class="ea-input" data-ea-cardio-pocus="sixMwtMeters" value="' +
    escAttrNumeric(d.sixMwtMeters) +
    '">' +
    '</label>' +
    '</div>' +
    '</div>';

  var notaSection =
    '<label class="ea-field">' +
    '<span class="ea-label">Nota</span>' +
    '<textarea class="ea-input" rows="2" data-ea-cardio-pocus="note">' +
    escHtml(d.note) +
    '</textarea>' +
    '</label>';

  return (
    '<div class="ea-clinico-cardio-congestion-form">' +
    evaluacionClinicaSection +
    vciVexusSection +
    usPulmonarSection +
    escalasSection +
    notaSection +
    '</div>'
  );
}

/**
 * @param {Record<string, unknown>} day
 */
function renderPocusLogRowHtml(day) {
  var d = day || {};
  var checklist = d.checklist || {};
  var checklistFlags = CONGESTION_CHECKLIST_FIELDS.filter(function (f) {
    return checklist[f[0]] === true;
  })
    .map(function (f) {
      return f[1];
    })
    .join(', ');
  var summaryParts = [];
  summaryParts.push(vexusPillHtml(d.vexus));
  summaryParts.push(stevensonPillHtml(d.stevenson));
  if (d.fevi) summaryParts.push('FEVI ' + escHtml(String(d.fevi)));
  if (d.congestionScore != null && d.congestionScore !== '') {
    summaryParts.push('Score ' + escHtml(String(d.congestionScore)));
  }
  if (checklistFlags) summaryParts.push(escHtml(checklistFlags));

  return (
    '<li class="ea-historial-row">' +
    '<div class="ea-historial-main">' +
    '<span class="ea-historial-when">' +
    escHtml(String(d.date || '—')) +
    '</span>' +
    '<span class="ea-historial-summary">' +
    summaryParts.join(' ') +
    '</span>' +
    '</div>' +
    '<button type="button" class="ea-btn ea-btn--ghost" data-ea-cardio-action="edit-pocus-day" data-date="' +
    escAttr(d.date) +
    '">Editar</button>' +
    '</li>'
  );
}

/**
 * Dated log of saved POCUS days, newest first — rendered inside the
 * Registro Congestión modal (`estado-actual-congestion-modal.mjs`), below
 * the draft form. Each row's "Editar" button reopens the modal pre-filled
 * for that day.
 * @param {unknown[]} pocusByDay
 */
export function renderPocusLogListHtml(pocusByDay) {
  var sorted = (Array.isArray(pocusByDay) ? pocusByDay : []).slice().sort(function (a, b) {
    return String((b && b.date) || '').localeCompare(String((a && a.date) || ''));
  });
  return sorted.length
    ? '<ul class="ea-historial-list">' + sorted.map(renderPocusLogRowHtml).join('') + '</ul>'
    : '<p class="ea-muted">Sin registros de congestión/POCUS.</p>';
}
