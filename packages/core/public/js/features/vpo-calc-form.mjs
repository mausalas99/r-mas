/** VPO calculator inputs: the «Datos para las escalas» form inside the Riesgo preoperatorio card. */
import { ASA_OPTIONS, PROCEDURES } from '../vpo-lookups.mjs';
import { buildScaleLines, CALC_FLAGS, MODIFIER_KEYS, OPTIONAL_SCALES, PROCEDURE_ES } from '../vpo-calc.mjs';
import { AHA_RISK_MODIFIERS } from '../vpo-scores.mjs';

const ASA_ES = { I: 'sano', II: 'enfermedad leve', III: 'enfermedad severa', IV: 'amenaza constante', V: 'moribundo' };
const FUNC_OPTS = [['independent', 'Independiente'], ['partially-dependent', 'Parcialmente dependiente'], ['totally-dependent', 'Totalmente dependiente']];
const CFS_NAMES = ['Muy en forma', 'En forma', 'Manejando bien', 'Vulnerable', 'Levemente frágil', 'Moderadamente frágil', 'Severamente frágil', 'Muy severamente frágil', 'Enfermo terminal'];

const SELECTS = [
  ['calc', 'sepsis', 'Sepsis', [['none', 'Ninguna'], ['sirs', 'SIRS'], ['sepsis', 'Sepsis'], ['shock', 'Choque séptico']]],
  ['calc', 'mets', 'Capacidad funcional', [['ge4', '≥4 METs'], ['lt4', '<4 METs']]],
  ['calc', 'cfs', 'Fragilidad (CFS)', CFS_NAMES.map((n, i) => [String(i + 1), i + 1 + ' · ' + n])],
  ['calc', 'caprRecent', 'Caprini: evento reciente', [['0', 'Ninguno'], ['1', 'Cirugía mayor, ICC, sepsis o neumonía'], ['2', 'Yeso inmovilizador'], ['5', 'Fractura de cadera o pierna, EVC, politrauma']]],
  ['calc', 'caprVenous', 'Caprini: enfermedad venosa', [['0', 'Ninguna'], ['1', 'Várices o piernas hinchadas'], ['2', 'Acceso venoso central'], ['3', 'TVP o TEP previo, trombofilia']]],
  ['calc', 'caprMobility', 'Caprini: movilidad', [['0', 'Normal'], ['1', 'Reposo en cama'], ['2', 'Postrado >72 h']]],
];

/** Chips shown on the card: the common conditions. The other yes/no inputs sit under «Más datos». */
const MAIN_CHIPS = ['ischemic', 'hf', 'cva', 'copd', 'smoker'];
const CHIP_FLAGS = [['htn', 'Hipertensión'], ['dm', 'Diabetes']].concat(CALC_FLAGS.filter((f) => MAIN_CHIPS.includes(f[0])));
const MORE_FLAGS = CALC_FLAGS.filter((f) => !MAIN_CHIPS.includes(f[0]));

function options(list, value, esc, blank) {
  return (
    (blank ? '<option value="">—</option>' : '') +
    list.map((o) => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value || '') ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('')
  );
}

function selectCell(attr, key, label, list, value, esc, blank) {
  return (
    '<label class="vpo-scale-cell"><span class="vpo-scale-label">' + esc(label) + '</span>' +
    '<select class="ea-input" ' + attr + '="' + esc(key) + '">' + options(list, value, esc, blank) + '</select></label>'
  );
}

function checkCell(key, label, checked, esc) {
  return '<label class="vpo-chk"><input type="checkbox" data-vpo-calc="' + esc(key) + '"' + (checked ? ' checked' : '') + '>' + esc(label) + '</label>';
}

/** One scale's inputs: numbers and selects, chips, then a Calcular button per result with its live result or what is missing. */
function renderScalePanel(sc, c, sr, lines, esc) {
  var buttons = sc.buttons || [[sc.key, 'Calcular ' + sc.label]];
  return (
    ((sc.numbers || []).length || (sc.selects || []).length
      ? '<div class="vpo-fields">' +
        (sc.numbers || []).map((n) => '<label class="vpo-scale-cell"><span class="vpo-scale-label">' + esc(n[1]) + '</span><input type="text" class="ea-input" data-vpo-calc="' + n[0] + '" value="' + esc(c[n[0]]) + '" autocomplete="off"></label>').join('') +
        (sc.selects || []).map((q) => selectCell('data-vpo-calc', q[0], q[1], q[2], c[q[0]], esc, true)).join('') +
        '</div>'
      : '') +
    '<div class="vpo-chk-grid">' + sc.flags.map((f) => checkCell(f[0], f[1], c[f[0]], esc)).join('') + '</div>' +
    buttons.map((b) => {
      var miss = !sr[b[0]] && lines[b[0]] && lines[b[0]].missing;
      return (
        '<div class="vpo-calc-actions">' +
        (sr[b[0]] ? '<span class="vpo-tab-result">' + esc(sr[b[0]]) + '</span>' : miss ? '<span class="vpo-row-miss">Falta: ' + esc(miss.join(', ')) + '</span>' : '') +
        '<button type="button" class="wb-btn" data-vpo-calc-one="' + esc(b[0]) + '">' + esc(b[1]) + '</button></div>'
      );
    }).join('')
  );
}

/** «Otras escalas» dialog: one scale at a time, picked from a row of tabs. */
function renderOptionalHtml(state, esc, tab) {
  var c = state.calc || {};
  var sr = state.scaleResults || {};
  var lines = buildScaleLines(state);
  var cur = OPTIONAL_SCALES.some((sc) => sc.key === tab) ? tab : OPTIONAL_SCALES[0].key;
  return (
    '<dialog class="vpo-dialog vpo-dialog--wide" data-vpo-dialog="scales" aria-label="Otras escalas">' +
    '<div class="vpo-dialog-head"><h3 class="vpo-section-title">Otras escalas</h3><button type="button" class="ea-io-link" data-vpo-close>Cerrar</button></div>' +
    selectCell('data-vpo-calc', 'sex', 'Sexo', [['M', 'Masculino'], ['F', 'Femenino']], c.sex, esc, true) +
    '<div class="vpo-tabs" role="tablist">' +
    OPTIONAL_SCALES.map((sc) => '<button type="button" role="tab" class="vpo-tab" data-vpo-tab="' + esc(sc.key) + '" aria-selected="' + (sc.key === cur) + '">' + esc(sc.label) + '</button>').join('') +
    '</div>' +
    OPTIONAL_SCALES.map((sc) => '<section role="tabpanel" class="vpo-tab-panel" data-vpo-panel="' + esc(sc.key) + '"' + (sc.key === cur ? '' : ' hidden') + '>' + renderScalePanel(sc, c, sr, lines, esc) + '</section>').join('') +
    '</dialog>'
  );
}

const NUM_FIELD = (state, key, label, esc) =>
  '<label class="vpo-scale-cell"><span class="vpo-scale-label">' + esc(label) + '</span><input type="text" class="ea-input" data-vpo-field="' + key + '" value="' + esc(state[key]) + '" autocomplete="off"></label>';

/** Card «Datos del paciente»: 8 main fields, condition chips, the rest under «Más datos». */
/** @param {object} state VPO state @param {(s: unknown) => string} esc */
export function renderCalcInputsHtml(state, esc, scaleTab) {
  var c = state.calc || {};
  var procs = PROCEDURES.map((p) => [p.id, PROCEDURE_ES[p.id] || p.labelEn]).sort((a, b) => a[1].localeCompare(b[1], 'es'));
  var asaList = ASA_OPTIONS.map((a) => [a.key, 'ASA ' + a.asaClass + ' · ' + ASA_ES[a.asaClass]]);
  var cfs = SELECTS.find((q) => q[1] === 'cfs');
  var more = SELECTS.filter((q) => q !== cfs);
  return (
    '<div class="vpo-card"><h4 class="vpo-card-title">Datos del paciente</h4>' +
    '<div class="vpo-fields">' +
    NUM_FIELD(state, 'edad', 'Edad', esc) +
    selectCell('data-vpo-field', 'asaKey', 'ASA', asaList, state.asaKey, esc, true) +
    NUM_FIELD(state, 'creatinina', 'Creatinina (mg/dL)', esc) +
    NUM_FIELD(state, 'spo2', 'SpO₂ (%)', esc) +
    selectCell('data-vpo-field', 'procedureId', 'Cirugía', procs, state.procedureId, esc, true) +
    NUM_FIELD(state, 'duracionCirugiaHoras', 'Duración (h)', esc) +
    NUM_FIELD(state, 'hemoglobina', 'Hemoglobina (g/dL)', esc) +
    selectCell('data-vpo-calc', cfs[1], cfs[2], cfs[3], c.cfs, esc, true) +
    '</div>' +
    '<div class="vpo-chip-row"><div class="vpo-chk-grid">' + CHIP_FLAGS.map((f) => checkCell(f[0], f[1], c[f[0]], esc)).join('') + '</div>' +
    '<div class="vpo-calc-actions"><button type="button" class="wb-btn" data-vpo-action="calc-fill">Tomar de R+</button>' +
    '<button type="button" class="wb-btn wb-btn-primary" data-vpo-action="calc-all">Calcular todo</button></div></div>' +
    '<details class="vpo-more"><summary class="ea-io-link">Más datos</summary>' +
    '<div class="vpo-fields">' +
    selectCell('data-vpo-field', 'functionalKey', 'Estado funcional', FUNC_OPTS, state.functionalKey, esc, false) +
    more.map((q) => selectCell('data-vpo-calc', q[1], q[2], q[3], c[q[1]], esc, q[1] !== 'sepsis')).join('') +
    '</div>' +
    '<div class="vpo-chk-grid">' + MORE_FLAGS.map((f) => checkCell(f[0], f[1], c[f[0]], esc)).join('') + '</div>' +
    '<span class="vpo-scale-label">Modificadores de riesgo AHA/ACC</span>' +
    '<div class="vpo-chk-grid">' + AHA_RISK_MODIFIERS.map((m, i) => checkCell(MODIFIER_KEYS[i], m, c[MODIFIER_KEYS[i]], esc)).join('') + '</div>' +
    '</details>' +
    '</div>' +
    renderOptionalHtml(state, esc, scaleTab)
  );
}

/** Where «Completar» sends focus, by the name a scale reports as missing. */
const MISSING_FIELD = {
  edad: '[data-vpo-field="edad"]', 'cirugía': '[data-vpo-field="procedureId"]', ASA: '[data-vpo-field="asaKey"]',
  'SpO₂': '[data-vpo-field="spo2"]', 'duración': '[data-vpo-field="duracionCirugiaHoras"]', hemoglobina: '[data-vpo-field="hemoglobina"]',
  CFS: '[data-vpo-calc="cfs"]', METs: '[data-vpo-calc="mets"]', sexo: '[data-vpo-calc="sex"]',
};

/** Open and focus the first input that a scale lacks. @param {ParentNode} mount @param {string} missing names joined by | */
export function focusMissingInput(mount, missing) {
  var key = Object.keys(MISSING_FIELD).find((k) => missing.indexOf(k) >= 0);
  var el = key && mount.querySelector(MISSING_FIELD[key]);
  if (!el) return;
  for (var d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
  el.focus();
  el.scrollIntoView({ block: 'center' });
}
