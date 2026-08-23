import { emptyFantasticos } from './med-segments.mjs';
import { emptyWorkup } from './hf-workup.mjs';
import { emptyDevice } from './hf-device.mjs';
import { emptyEvaluacionInicial } from './evaluacion-inicial.mjs';

/** @returns {Record<string, unknown>} */
export function emptyCardio() {
  return {
    inicioDescongestion: '',
    overrides: {},
    vexusIngreso: null,
    dosisInicialDiuretico: '',
    seguimientoHospitalizacion: '',
    seguimientoConsulta: '',
    fenotipo: '',
    etiologia: '',
    residente: '',
    ekg: '',
    ritmo: '',
    estrategiaControlFa: '',
    pocusByDay: [],
    fantasticos: emptyFantasticos(),
    medSegments: [],
    diureticSegments: [],
    medCatalog: [],
    workup: emptyWorkup(),
    device: emptyDevice(),
    scores: [],
    echoStudies: [],
    labSnapshots: [],
    consultas: [],
    evaluacionInicial: emptyEvaluacionInicial(),
    rondasByDay: [],
  };
}

/**
 * Backfill missing cardio keys without wiping existing data.
 * @param {any} cardio
 * @param {ReturnType<typeof emptyCardio>} defaults
 */
function backfillCardioKeys(cardio, defaults) {
  if (typeof cardio.inicioDescongestion !== 'string') {
    cardio.inicioDescongestion = defaults.inicioDescongestion;
  }
  if (!cardio.overrides || typeof cardio.overrides !== 'object') {
    cardio.overrides = defaults.overrides;
  }
  if (!Array.isArray(cardio.pocusByDay)) cardio.pocusByDay = defaults.pocusByDay;
  if (!Array.isArray(cardio.fantasticos)) cardio.fantasticos = defaults.fantasticos;
  if (!Array.isArray(cardio.medSegments)) cardio.medSegments = defaults.medSegments;
  if (!Array.isArray(cardio.diureticSegments)) cardio.diureticSegments = defaults.diureticSegments;
  if (!Array.isArray(cardio.medCatalog)) cardio.medCatalog = defaults.medCatalog;
  if (cardio.vexusIngreso != null && !Number.isFinite(Number(cardio.vexusIngreso))) {
    cardio.vexusIngreso = null;
  }
  if (typeof cardio.dosisInicialDiuretico !== 'string') {
    cardio.dosisInicialDiuretico = defaults.dosisInicialDiuretico;
  }
  if (typeof cardio.seguimientoHospitalizacion !== 'string') {
    cardio.seguimientoHospitalizacion = defaults.seguimientoHospitalizacion;
  }
  if (typeof cardio.seguimientoConsulta !== 'string') {
    cardio.seguimientoConsulta = defaults.seguimientoConsulta;
  }
  backfillIdentityFields(cardio, defaults);
  backfillHfObjectiveFormKeys(cardio, defaults);
}

/**
 * Backfill Part C Phase 1 keys (HF objective-data forms) added for the
 * outpatient/inpatient/intake screens, without wiping existing data.
 * @param {any} cardio
 * @param {ReturnType<typeof emptyCardio>} defaults
 */
function backfillHfObjectiveFormKeys(cardio, defaults) {
  if (!cardio.workup || typeof cardio.workup !== 'object') cardio.workup = defaults.workup;
  if (!cardio.device || typeof cardio.device !== 'object') cardio.device = defaults.device;
  if (!Array.isArray(cardio.scores)) cardio.scores = defaults.scores;
  if (!Array.isArray(cardio.echoStudies)) cardio.echoStudies = defaults.echoStudies;
  if (!Array.isArray(cardio.labSnapshots)) cardio.labSnapshots = defaults.labSnapshots;
  if (!Array.isArray(cardio.consultas)) cardio.consultas = defaults.consultas;
  if (!cardio.evaluacionInicial || typeof cardio.evaluacionInicial !== 'object') {
    cardio.evaluacionInicial = defaults.evaluacionInicial;
  }
  if (!Array.isArray(cardio.rondasByDay)) cardio.rondasByDay = defaults.rondasByDay;
}

/**
 * Backfill free-text identity fields (fenotipo, etiología, etc.) added for
 * the Resumen Paciente panel.
 * @param {any} cardio
 * @param {ReturnType<typeof emptyCardio>} defaults
 */
function backfillIdentityFields(cardio, defaults) {
  const keys = ['fenotipo', 'etiologia', 'residente', 'ekg', 'ritmo', 'estrategiaControlFa'];
  for (const key of keys) {
    if (typeof cardio[key] !== 'string') cardio[key] = defaults[key];
  }
}

/**
 * Ensure `patient.cardio` exists with IC persistence defaults.
 * Fills missing top-level keys without wiping existing data.
 * @param {unknown} patient
 * @returns {unknown}
 */
export function ensureCardio(patient) {
  if (!patient || typeof patient !== 'object') return patient;
  /** @type {any} */
  const p = patient;
  if (!p.cardio || typeof p.cardio !== 'object') {
    p.cardio = emptyCardio();
    return p;
  }
  backfillCardioKeys(p.cardio, emptyCardio());
  return p;
}
