/**
 * Nota de evolución (SOAP) — estado puro (sin DOM). Vive en
 * `patient.monitoreo.notaEvolucion`, junto al resto del estado clínico
 * (mismo contenedor que `estadoClinico` / `confirmado` / `textoGuardado`).
 */
import { deriveSnapshot } from '../estado-actual-data.mjs';
import { OBJETIVO_ZONES, buildObjetivoSnapshot } from '../../../../lib/nota-evolucion/objetivo-derive.mjs';

/** @typedef {{ id: string, text: string, mark: string }} PlanItem */
/** @typedef {{ subjetivo: string, analisis: string, planZones: Record<string, PlanItem[]>, objetivo: { zones: unknown[], text: string, confirmedAt: string }|null }} NotaEvolucionState */

/** @returns {NotaEvolucionState} */
export function emptyNotaEvolucion() {
  /** @type {Record<string, PlanItem[]>} */
  const planZones = {};
  for (const z of OBJETIVO_ZONES) planZones[z.id] = [];
  return { subjetivo: '', analisis: '', planZones, objetivo: null };
}

/**
 * @param {Record<string, unknown>|null|undefined} patient
 * @returns {NotaEvolucionState|null}
 */
export function ensureNotaEvolucion(patient) {
  if (!patient || typeof patient !== 'object') return null;
  /** @type {any} */
  const p = patient;
  if (!p.monitoreo || typeof p.monitoreo !== 'object') p.monitoreo = {};
  if (!p.monitoreo.notaEvolucion || typeof p.monitoreo.notaEvolucion !== 'object') {
    p.monitoreo.notaEvolucion = emptyNotaEvolucion();
  } else {
    const ne = p.monitoreo.notaEvolucion;
    if (typeof ne.subjetivo !== 'string') ne.subjetivo = '';
    if (typeof ne.analisis !== 'string') ne.analisis = '';
    if (!ne.planZones || typeof ne.planZones !== 'object') ne.planZones = {};
    for (const z of OBJETIVO_ZONES) {
      if (!Array.isArray(ne.planZones[z.id])) ne.planZones[z.id] = [];
    }
  }
  return p.monitoreo.notaEvolucion;
}

let planItemSeq = 0;
/** @returns {string} */
function nextPlanItemId() {
  planItemSeq += 1;
  return 'ne-plan-' + Date.now().toString(36) + '-' + planItemSeq;
}

/**
 * @param {NotaEvolucionState} state
 * @param {string} zoneId
 * @param {string} text
 * @returns {PlanItem|null}
 */
export function addPlanItem(state, zoneId, text) {
  const t = String(text || '').trim();
  if (!t || !state || !state.planZones) return null;
  if (!Array.isArray(state.planZones[zoneId])) state.planZones[zoneId] = [];
  /** @type {PlanItem} */
  const item = { id: nextPlanItemId(), text: t, mark: 'novo' };
  state.planZones[zoneId].push(item);
  return item;
}

/**
 * @param {NotaEvolucionState} state
 * @param {string} zoneId
 * @param {string} itemId
 * @returns {boolean}
 */
export function removePlanItem(state, zoneId, itemId) {
  const list = state && state.planZones && state.planZones[zoneId];
  if (!Array.isArray(list)) return false;
  const idx = list.findIndex((it) => it.id === itemId);
  if (idx === -1) return false;
  list.splice(idx, 1);
  return true;
}

/**
 * @param {NotaEvolucionState} state
 * @param {string} zoneId
 * @param {string} itemId
 * @param {(mark: string) => string} nextMarkFn
 * @returns {string|null} the new mark, or null if not found
 */
export function cyclePlanItemMark(state, zoneId, itemId, nextMarkFn) {
  const list = state && state.planZones && state.planZones[zoneId];
  if (!Array.isArray(list)) return null;
  const item = list.find((it) => it.id === itemId);
  if (!item) return null;
  item.mark = nextMarkFn(item.mark);
  return item.mark;
}

/**
 * @param {NotaEvolucionState} state
 * @returns {Array<{ id: string, label: string, items: PlanItem[] }>}
 */
export function planZonesForRender(state) {
  const planZones = (state && state.planZones) || {};
  return OBJETIVO_ZONES.map((z) => ({
    id: z.id,
    label: z.label,
    items: Array.isArray(planZones[z.id]) ? planZones[z.id] : [],
  }));
}

/**
 * Builds normalized vitals+labs input for the lib derivation from a real
 * patient record. Labs are intentionally left empty until the lab-set shape
 * is wired in — never fabricate lab data to fill the gap.
 * @param {Record<string, unknown>} patient
 * @returns {{ vitals: Record<string, unknown>, labs: unknown[] }}
 */
export function objetivoInputFromPatient(patient) {
  const mon = patient && typeof patient === 'object' ? /** @type {any} */ (patient).monitoreo : null;
  const snap = mon ? deriveSnapshot(mon) : { vitals: {} };
  return { vitals: (snap && snap.vitals) || {}, labs: [] };
}

/**
 * Derives, confirms, and persists the Objetivo snapshot for a patient using
 * only their real vitals/labs. The resident reviews before this is called;
 * this function is the "sign" action.
 * @param {Record<string, unknown>} patient
 * @param {{ now?: () => Date }} [options]
 * @returns {{ zones: unknown[], text: string, confirmedAt: string }|null}
 */
export function confirmObjetivoForPatient(patient, options) {
  const state = ensureNotaEvolucion(patient);
  if (!state) return null;
  const input = objetivoInputFromPatient(patient);
  const snapshot = buildObjetivoSnapshot(input, options);
  state.objetivo = snapshot;
  return snapshot;
}
