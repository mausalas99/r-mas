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
export function renderIdentityRowHtml(cardio) {
  var c = cardio || {};
  var fields = [
    ['fenotipo', 'Fenotipo'],
    ['etiologia', 'Etiología'],
    ['residente', 'Residente'],
    ['ekg', 'EKG'],
    ['ritmo', 'Ritmo'],
    ['estrategiaControlFa', 'Estrategia control FA'],
  ];
  var inputs = fields
    .map(function (f) {
      return (
        '<label class="ea-field ea-field--inline">' +
        '<span class="ea-label">' +
        escHtml(f[1]) +
        '</span>' +
        '<input type="text" class="ea-input" data-ea-cardio="' +
        f[0] +
        '" value="' +
        escAttr(c[f[0]]) +
        '">' +
        '</label>'
      );
    })
    .join('');
  return '<div class="ea-clinico-cardio-identity-row" style="display:flex;flex-wrap:wrap;gap:8px">' + inputs + '</div>';
}

var CONGESTION_CHECKLIST_FIELDS = [
  ['pvy', 'PVY elevada'],
  ['rhy', 'Reflujo hepatoyugular'],
  ['soplo', 'Soplo'],
  ['estertores', 'Estertores'],
  ['ascitisHepatomegalia', 'Ascitis/hepatomegalia'],
  ['edemaMi', 'Edema MI'],
];

/**
 * @param {string} key
 * @param {unknown} val true|false|null
 */
function triStateSelectHtml(key, val) {
  var v = val === true ? 'true' : val === false ? 'false' : '';
  function opt(value, label) {
    return '<option value="' + value + '"' + (v === value ? ' selected' : '') + '>' + label + '</option>';
  }
  return (
    '<select class="ea-input" data-ea-cardio-pocus="' +
    escAttr(key) +
    '">' +
    opt('', '—') +
    opt('true', 'Sí') +
    opt('false', 'No') +
    '</select>'
  );
}

var VEXUS_OPTIONS = ['0', '1', '2', '3'];
var STEVENSON_OPTIONS = ['Caliente-seco', 'Caliente-húmedo', 'Frío-seco', 'Frío-húmedo'];

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
      triStateSelectHtml(f[0], checklist[f[0]]) +
      '</label>'
    );
  }).join('');

  var vexusOpts = VEXUS_OPTIONS.map(function (g) {
    return '<option value="' + g + '"' + (String(d.vexus) === g ? ' selected' : '') + '>Grado ' + g + '</option>';
  }).join('');
  var stevensonOpts = STEVENSON_OPTIONS.map(function (s) {
    return '<option value="' + escAttr(s) + '"' + (d.stevenson === s ? ' selected' : '') + '>' + escHtml(s) + '</option>';
  }).join('');

  return (
    '<div class="ea-clinico-cardio-congestion-form" style="display:flex;flex-wrap:wrap;gap:8px">' +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Fecha</span>' +
    '<input type="date" class="ea-input" data-ea-cardio-pocus="date" value="' +
    escAttr(d.date) +
    '">' +
    '</label>' +
    checklistInputs +
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Llenado capilar</span>' +
    '<input type="text" class="ea-input" data-ea-cardio-pocus="llenadoCapilar" value="' +
    escAttr(checklist.llenadoCapilar) +
    '">' +
    '</label>' +
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
    '<select class="ea-input" data-ea-cardio-pocus="vexus"><option value="">—</option>' +
    vexusOpts +
    '</select>' +
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
    '<label class="ea-field ea-field--inline">' +
    '<span class="ea-label">Stevenson–Nohria</span>' +
    '<select class="ea-input" data-ea-cardio-pocus="stevenson"><option value="">—</option>' +
    stevensonOpts +
    '</select>' +
    '</label>' +
    '<label class="ea-field" style="flex:1 1 100%">' +
    '<span class="ea-label">Nota</span>' +
    '<textarea class="ea-input" rows="2" data-ea-cardio-pocus="note">' +
    escHtml(d.note) +
    '</textarea>' +
    '</label>' +
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
