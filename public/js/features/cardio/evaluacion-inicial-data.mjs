/**
 * Pure data-shaping helpers for "Eval. inicial" (Document 2). No DOM here —
 * `evaluacion-inicial-wire.mjs` owns DOM reads/writes and persistence.
 */
import { normalizeEvaluacionInicial } from '../../../../lib/cardio/evaluacion-inicial.mjs';
import { parseNumOrNull } from '../estado-actual-panel-format.mjs';
import { sortLabHistoryChronological, parseFechaLabToMs, getSetTrendValueForSeries } from '../../tend-core.mjs';

var TOP_LEVEL_STRING_KEYS = [
  'fecha',
  'motivoConsulta',
  'antecedentes',
  'fenotipoPrevio',
  'tiempoEvolucion',
  'ultimaHospitalizacion',
  'estrategia',
  'especificar',
  'fechaImplante',
  'peea',
  'ecgIngreso',
  'impresionDiagnostica',
  'planTerapeutico',
  'eventualidades',
  'residente',
];
var TOP_LEVEL_NUMBER_KEYS = ['ultimoNtProBnp', 'ultimaFevi', 'feviEstimadaInicial', 'nau2hPostBolo', 'gastoUrinario6h'];
var TOP_LEVEL_TRI_KEYS = ['historiaIcPrevia', 'faFlutter', 'dispositivoPrevio'];

var SECTION_STRING_KEYS = {
  tratamientoPrevio: ['anticoagulante'],
  exploracion: ['ta', 'soploNota', 'estertoresNota', 'edemaMi', 'llenadoCapilar', 'temperaturaExtremidades', 'stevenson'],
  vexusInicial: ['vciColapso', 'dopplerHepaticas', 'pulsatilidadPorta', 'dopplerRenal', 'grado'],
  labsIngreso: ['fecha'],
};
var SECTION_NUMBER_KEYS = {
  tratamientoPrevio: [],
  exploracion: ['fc', 'satO2'],
  vexusInicial: ['vciMm'],
  labsIngreso: ['na', 'k', 'mg', 'creat', 'bun', 'fa', 'hb', 'ntProBnp', 'lactato', 'bilTotal', 'bilDirecta', 'bicarbonato', 'ph', 'troponina'],
};
var SECTION_TRI_KEYS = {
  tratamientoPrevio: ['ieca_ara', 'arni', 'sglt2', 'arm', 'bb', 'asa'],
  exploracion: ['pvy', 'soplo', 'estertores', 'ascitisHepatomegalia'],
  vexusInicial: [],
  labsIngreso: [],
};

export function isTopLevelStringKey(key) {
  return TOP_LEVEL_STRING_KEYS.indexOf(key) >= 0;
}
export function isTopLevelNumberKey(key) {
  return TOP_LEVEL_NUMBER_KEYS.indexOf(key) >= 0;
}
export function isTopLevelTriKey(key) {
  return TOP_LEVEL_TRI_KEYS.indexOf(key) >= 0;
}

/**
 * @param {'true'|'false'|''} raw
 * @returns {boolean|null}
 */
export function parseTriState(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

/**
 * @param {Record<string, unknown>} evaluacionInicial normalized object
 * @param {string} key
 * @param {string} raw DOM value
 * @returns {{ evaluacionInicial: Record<string, unknown>, changed: boolean }}
 */
export function withTopLevelFieldChange(evaluacionInicial, key, raw) {
  var out = Object.assign({}, evaluacionInicial);
  var next;
  if (isTopLevelTriKey(key)) next = parseTriState(raw);
  else if (isTopLevelNumberKey(key)) next = parseNumOrNull(raw);
  else next = String(raw == null ? '' : raw);
  var changed = out[key] !== next;
  out[key] = next;
  return { evaluacionInicial: out, changed: changed };
}

/**
 * @param {Record<string, unknown>} evaluacionInicial
 * @param {'tratamientoPrevio'|'exploracion'|'vexusInicial'|'labsIngreso'} section
 * @param {string} key
 * @param {string} raw
 */
export function withSectionFieldChange(evaluacionInicial, section, key, raw) {
  var out = Object.assign({}, evaluacionInicial);
  var sub = Object.assign({}, out[section] || {});
  var triKeys = SECTION_TRI_KEYS[section] || [];
  var numberKeys = SECTION_NUMBER_KEYS[section] || [];
  var next;
  if (triKeys.indexOf(key) >= 0) next = parseTriState(raw);
  else if (numberKeys.indexOf(key) >= 0) next = parseNumOrNull(raw);
  else next = String(raw == null ? '' : raw);
  var changed = sub[key] !== next;
  sub[key] = next;
  out[section] = sub;
  return { evaluacionInicial: out, changed: changed };
}

/**
 * @param {Record<string, unknown>} evaluacionInicial
 * @param {number} idx 0-7
 * @param {'lineasB'|'derrame'|'consolidacion'} field
 * @param {string} raw
 */
export function withUsPulmonarCampoChange(evaluacionInicial, idx, field, raw) {
  var out = Object.assign({}, evaluacionInicial);
  var us = Object.assign({}, out.usPulmonar || {});
  var campos = (Array.isArray(us.campos) ? us.campos : []).slice();
  var campo = Object.assign({}, campos[idx] || {});
  var next = field === 'lineasB' ? String(raw == null ? '' : raw) : parseTriState(raw);
  campo[field] = next;
  campos[idx] = campo;
  us.campos = campos;
  out.usPulmonar = us;
  return { evaluacionInicial: out };
}

export function withUsPulmonarNotaChange(evaluacionInicial, raw) {
  var out = Object.assign({}, evaluacionInicial);
  out.usPulmonar = Object.assign({}, out.usPulmonar || {}, { nota: String(raw == null ? '' : raw) });
  return { evaluacionInicial: out };
}

export function withRxToraxNotaChange(evaluacionInicial, raw) {
  var out = Object.assign({}, evaluacionInicial);
  out.rxTorax = Object.assign({}, out.rxTorax || {}, { nota: String(raw == null ? '' : raw) });
  return { evaluacionInicial: out };
}

/**
 * @param {Record<string, unknown>} evaluacionInicial
 * @param {string} value one of RX_TORAX_HALLAZGOS values
 * @param {boolean} checked
 */
export function withRxToraxHallazgoToggle(evaluacionInicial, value, checked) {
  var out = Object.assign({}, evaluacionInicial);
  var rx = Object.assign({}, out.rxTorax || {});
  var current = Array.isArray(rx.hallazgos) ? rx.hallazgos.slice() : [];
  var idx = current.indexOf(value);
  if (checked && idx < 0) current.push(value);
  if (!checked && idx >= 0) current.splice(idx, 1);
  rx.hallazgos = current;
  out.rxTorax = rx;
  return { evaluacionInicial: out };
}

/**
 * Builds the record for `upsertPocusDay()` from this intake's VExUS/date
 * fields — the "congestion score" step reuses the existing pocusByDay
 * mechanism (`lib/cardio/congestion.mjs`) instead of a parallel store.
 * Fields not sourced from `evaluacionInicial` (congestionScore, fevi,
 * lungPattern, lungLinesB, stevenson, note, checklist) are left out so
 * `upsertPocusDay` coalesces them from any existing same-day record.
 * @param {Record<string, unknown>} evaluacionInicial
 * @returns {{ date: string, vciCm: unknown, vciCollapse: string, vexus: unknown }}
 */
export function buildCongestionSyncRecord(evaluacionInicial) {
  var d = evaluacionInicial || {};
  var v = d.vexusInicial || {};
  return {
    date: String(d.fecha || ''),
    vciCm: v.vciMm != null ? v.vciMm : null,
    vciCollapse: String(v.vciColapso || ''),
    vexus: v.grado != null && v.grado !== '' ? v.grado : null,
  };
}

/**
 * Maps `labsIngreso.*` keys to where the value lives in a lab paste's
 * `parsedBySection` (built by `diagrams-parse.mjs`), so a picked date can
 * autofill this step instead of re-typing values already parsed elsewhere.
 */
export var LABS_INGRESO_SOURCE_MAP = {
  na: ['ESC', 'Na'],
  k: ['ESC', 'K'],
  mg: ['ESC', 'Mg'],
  creat: ['QS', 'Cr'],
  bun: ['QS', 'BUN'],
  fa: ['PFHs', 'FA'],
  hb: ['BH', 'Hb'],
  ntProBnp: ['CARD', 'NTproBNP'],
  lactato: ['GASES', 'Lactato'],
  bilTotal: ['PFHs', 'BT'],
  bilDirecta: ['PFHs', 'BD'],
  bicarbonato: ['GASES', 'Bica'],
  ph: ['GASES', 'pH'],
  troponina: ['TROP', 'TnI1'],
};

/**
 * Newest lab set at or before `iso` (a `YYYY-MM-DD` date-input value), or
 * null if none. `history` is one patient's `labHistory[patientId]` array.
 * @param {Array<Record<string, any>>} history
 * @param {string} iso
 */
export function findNearestLabSetForDate(history, iso) {
  var targetMs = iso ? new Date(iso + 'T23:59:59').getTime() : NaN;
  if (!isFinite(targetMs)) return null;
  var sorted = sortLabHistoryChronological(history);
  for (var i = 0; i < sorted.length; i++) {
    var ms = parseFechaLabToMs(sorted[i].fecha, sorted[i].hora);
    if (typeof ms === 'number' && isFinite(ms) && ms <= targetMs) return sorted[i];
  }
  return null;
}

/**
 * @param {Record<string, unknown>} evaluacionInicial
 * @param {string} iso date-input value driving the lookup
 * @param {Record<string, any>|null} set lab set from `findNearestLabSetForDate`
 * @returns {Record<string, unknown>} next evaluacionInicial with `labsIngreso` autofilled
 */
export function withLabsIngresoAutofill(evaluacionInicial, iso, set) {
  var out = Object.assign({}, evaluacionInicial);
  var labs = Object.assign({}, out.labsIngreso || {}, { fecha: iso });
  Object.keys(LABS_INGRESO_SOURCE_MAP).forEach(function (key) {
    var src = LABS_INGRESO_SOURCE_MAP[key];
    labs[key] = set ? getSetTrendValueForSeries(set, src[0], src[1]) : null;
  });
  out.labsIngreso = labs;
  return out;
}

export { normalizeEvaluacionInicial };
