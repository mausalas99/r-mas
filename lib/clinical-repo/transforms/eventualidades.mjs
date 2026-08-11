import {
  appendEventualidad,
  updateEventualidad,
  removeEventualidad,
  setEventualidadesLabsText,
  mergeEventualidadesLabsText,
  resolveEventualidadEntryText,
} from '../../../public/js/features/eventualidades-store.mjs';

/**
 * @param {unknown} patientsArr
 * @param {string} patientId
 * @returns {{ ok: true, patients: object[], index: number, patient: object } | { ok: false, error: string }}
 */
function findPatientClone(patientsArr, patientId) {
  const id = String(patientId || '').trim();
  if (!id) return { ok: false, error: 'patient_not_found' };
  if (!Array.isArray(patientsArr)) return { ok: false, error: 'patient_not_found' };
  const index = patientsArr.findIndex((p) => p && String(p.id) === id);
  if (index < 0) return { ok: false, error: 'patient_not_found' };
  const patients = patientsArr.map((p, i) => (i === index ? { ...p } : p));
  return { ok: true, patients, index, patient: patients[index] };
}

/**
 * @param {object} patient
 * @returns {{ entries: object[], labsText: string, deletedIds?: Record<string, string>, updatedAt?: string }}
 */
function ensureStore(patient) {
  const cur = patient.eventualidades;
  if (cur && typeof cur === 'object') {
    return {
      entries: Array.isArray(cur.entries) ? cur.entries.slice() : [],
      labsText: cur.labsText != null ? String(cur.labsText) : '',
      ...(cur.deletedIds && typeof cur.deletedIds === 'object'
        ? { deletedIds: { ...cur.deletedIds } }
        : {}),
      ...(cur.updatedAt ? { updatedAt: String(cur.updatedAt) } : {}),
    };
  }
  return { entries: [], labsText: '' };
}

/**
 * @param {unknown} patientsArr
 * @param {{ patientId: string, entry: { text?: unknown, at?: unknown, kind?: unknown, transfusionProduct?: unknown, id?: unknown } }} args
 */
export function applyEventualidadUpsert(patientsArr, { patientId, entry }) {
  const found = findPatientClone(patientsArr, patientId);
  if (!found.ok) return found;
  const store = ensureStore(found.patient);
  const entryId = entry && entry.id != null ? String(entry.id).trim() : '';
  let next;
  if (entryId) {
    const text = resolveEventualidadEntryText(entry?.text, entry?.kind);
    if (!text) return { ok: false, error: 'empty' };
    const before = store.entries.find((e) => e && String(e.id) === entryId);
    if (!before) return { ok: false, error: 'entry_not_found' };
    next = updateEventualidad(store, entryId, {
      text: entry?.text,
      at: entry?.at,
      kind: entry?.kind,
      transfusionProduct: entry?.transfusionProduct,
    });
  } else {
    const text = resolveEventualidadEntryText(entry?.text, entry?.kind);
    if (!text) return { ok: false, error: 'empty' };
    const beforeLen = store.entries.length;
    next = appendEventualidad(
      store,
      entry?.text,
      '',
      entry?.at != null ? String(entry.at) : '',
      entry?.kind,
      entry?.transfusionProduct
    );
    if (next.entries.length === beforeLen) return { ok: false, error: 'empty' };
  }
  found.patient.eventualidades = next;
  found.patients[found.index] = found.patient;
  return { ok: true, patients: found.patients };
}

/**
 * @param {unknown} patientsArr
 * @param {{ patientId: string, entryId: string }} args
 */
export function applyEventualidadDelete(patientsArr, { patientId, entryId }) {
  const found = findPatientClone(patientsArr, patientId);
  if (!found.ok) return found;
  const id = String(entryId || '').trim();
  if (!id) return { ok: false, error: 'empty' };
  const store = ensureStore(found.patient);
  const next = removeEventualidad(store, id);
  found.patient.eventualidades = next;
  found.patients[found.index] = found.patient;
  return { ok: true, patients: found.patients };
}

/**
 * @param {unknown} patientsArr
 * @param {{ patientId: string, text: unknown }} args
 */
export function applyEventualidadesLabsSet(patientsArr, { patientId, text }) {
  const found = findPatientClone(patientsArr, patientId);
  if (!found.ok) return found;
  const store = ensureStore(found.patient);
  const next = setEventualidadesLabsText(store, text != null ? String(text) : '');
  found.patient.eventualidades = next;
  found.patients[found.index] = found.patient;
  return { ok: true, patients: found.patients };
}

/**
 * @param {unknown} patientsArr
 * @param {{ patientId: string, text: unknown }} args
 */
export function applyEventualidadesLabsMerge(patientsArr, { patientId, text }) {
  const found = findPatientClone(patientsArr, patientId);
  if (!found.ok) return found;
  const store = ensureStore(found.patient);
  const merged = mergeEventualidadesLabsText(store, text != null ? String(text) : '');
  const next = {
    entries: merged.entries,
    labsText: merged.labsText,
    ...(merged.deletedIds ? { deletedIds: merged.deletedIds } : {}),
    ...(merged.updatedAt ? { updatedAt: merged.updatedAt } : {}),
  };
  found.patient.eventualidades = next;
  found.patients[found.index] = found.patient;
  return { ok: true, patients: found.patients };
}
