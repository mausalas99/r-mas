/**
 * Nota de evolución (SOAP) — estado puro (sin DOM). Vive en
 * `patient.monitoreo.notaEvolucion`, junto al resto del estado clínico
 * (mismo contenedor que `estadoClinico` / `confirmado` / `textoGuardado`).
 */
import { deriveSnapshot } from '../estado-actual-data.mjs';
import { getLabHistory } from '../../app-state.mjs';
import { buildLabsGlanceForDay } from '../patient-dashboard/labs-glance-model.mjs';
import { admissionDateForPatient } from '../guardia-census-table.mjs';
import { OBJETIVO_ZONES, deriveObjetivoZones, buildObjetivoSnapshot } from '../../../../lib/nota-evolucion/objetivo-derive.mjs';

/** @typedef {{ id: string, text: string, mark: string }} PlanItem */
/** @typedef {{ subjetivo: string, analisis: string, planZones: Record<string, PlanItem[]>, objetivo: { zones: unknown[], text: string, confirmedAt: string }|null, lastSavedAt: string|null, signedAt: string|null }} NotaEvolucionState */

/** @returns {NotaEvolucionState} */
export function emptyNotaEvolucion() {
  /** @type {Record<string, PlanItem[]>} */
  const planZones = {};
  for (const z of OBJETIVO_ZONES) planZones[z.id] = [];
  return { subjetivo: '', analisis: '', planZones, objetivo: null, lastSavedAt: null, signedAt: null };
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
    if (typeof ne.lastSavedAt !== 'string') ne.lastSavedAt = null;
    if (typeof ne.signedAt !== 'string') ne.signedAt = null;
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
  const item = { id: nextPlanItemId(), text: t, mark: 'nuevo' };
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

/** @returns {string} YYYY-M-D, local calendar day */
function localDayKey(d) {
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

/**
 * Today's altered lab values for a patient, adapted from the same
 * paste-parsed "*"-altered convention the Resumen dashboard's "Labs fuera de
 * rango" card already uses (`buildLabsGlanceForDay`) into the
 * `{ key, label, value, altered }` shape `deriveObjetivoZones` expects. Only
 * altered values are itemized by that source (in-range values are only
 * counted, not labeled), so this — like the vitals side — never invents a
 * lab the patient doesn't have; it just can't surface in-range lab values by
 * name yet.
 * @param {string|undefined} patientId
 * @returns {Array<{ key: string, label: string, value: string, altered: boolean }>}
 */
function todaysAlteredLabsForPatient(patientId) {
  if (!patientId) return [];
  const orderedSets = getLabHistory()[patientId] || [];
  const { envios } = buildLabsGlanceForDay({ todayKey: localDayKey(new Date()), orderedSets });
  /** @type {Array<{ key: string, label: string, value: string, altered: boolean }>} */
  const labs = [];
  envios.forEach((envio) => {
    envio.groups.forEach((group) => {
      group.chips.forEach((chip) => {
        const raw = String(chip.value || '').trim();
        const altered = raw.endsWith('*');
        const value = altered ? raw.slice(0, -1) : raw;
        const label = String(chip.label || '').trim();
        if (!label || !value) return;
        labs.push({ key: label, label, value, altered });
      });
    });
  });
  return labs;
}

/**
 * Builds normalized vitals+labs input for the lib derivation from a real
 * patient record. Vitals come from today's monitoreo historial; labs come
 * from today's altered lab values (see `todaysAlteredLabsForPatient`).
 * @param {Record<string, unknown>} patient
 * @returns {{ vitals: Record<string, unknown>, labs: unknown[] }}
 */
export function objetivoInputFromPatient(patient) {
  const p = /** @type {any} */ (patient);
  const mon = p && typeof p === 'object' ? p.monitoreo : null;
  const snap = mon ? deriveSnapshot(mon) : { vitals: {} };
  const labs = todaysAlteredLabsForPatient(p && p.id);
  return { vitals: (snap && snap.vitals) || {}, labs };
}

/**
 * Live Objetivo preview — what the O card shows on every render, whether or
 * not the note has been signed yet (mockup #9a's O card has no separate
 * confirm gate; the resident reviews the real derivation directly). Never
 * persisted by itself.
 * @param {Record<string, unknown>} patient
 * @returns {{ zones: Array<{ id: string, label: string, items: Array<{ text: string, altered: boolean }> }> }}
 */
export function objetivoPreviewForPatient(patient) {
  const { zones } = deriveObjetivoZones(objetivoInputFromPatient(patient));
  return { zones };
}

/**
 * Derives and persists the Objetivo snapshot for a patient using only their
 * real vitals/labs, as part of signing the whole note (see
 * `signNoteForPatient`) — "se guarda el snapshot que se firmó", not the live
 * preview re-derived on every future render.
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

/**
 * Day-of-stay for the header context line ("día 3"), reusing the same
 * admission-date source Guardia's Ingresos counter uses (D3a) — auto-set at
 * census-add, never hand-typed. Returns null when no admission date is
 * known (never fabricate a day count).
 * @param {Record<string, unknown>} patient
 * @param {{ now?: () => Date }} [options]
 * @returns {number|null}
 */
export function dayOfStayForPatient(patient, options) {
  const iso = admissionDateForPatient(patient);
  if (!iso) return null;
  const now = new Date(options && typeof options.now === 'function' ? options.now() : new Date());
  const admitted = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(admitted.getTime())) return null;
  now.setHours(0, 0, 0, 0);
  const days = Math.floor((now.getTime() - admitted.getTime()) / 86400000);
  return Math.max(1, days + 1);
}

/**
 * "Firmar y cerrar" — the note-level sign action (mockup #9a's only status
 * control; the O card itself has none). Snapshots the live Objetivo
 * derivation and stamps `signedAt`.
 * @param {Record<string, unknown>} patient
 * @param {{ now?: () => Date }} [options]
 * @returns {NotaEvolucionState|null}
 */
export function signNoteForPatient(patient, options) {
  const state = ensureNotaEvolucion(patient);
  if (!state) return null;
  confirmObjetivoForPatient(patient, options);
  const now = options && typeof options.now === 'function' ? options.now() : new Date();
  state.signedAt = now.toISOString();
  return state;
}
