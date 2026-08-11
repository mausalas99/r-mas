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
 * @param {object} store
 * @param {{ text?: unknown, at?: unknown, kind?: unknown, transfusionProduct?: unknown }} entry
 * @param {string} entryId
 */
function updateExistingEntry(store, entry, entryId) {
  const text = resolveEventualidadEntryText(entry?.text, entry?.kind);
  if (!text) return { ok: false, error: 'empty' };
  const before = store.entries.find((e) => e && String(e.id) === entryId);
  if (!before) return { ok: false, error: 'entry_not_found' };
  return {
    ok: true,
    store: updateEventualidad(store, entryId, {
      text: entry?.text,
      at: entry?.at,
      kind: entry?.kind,
      transfusionProduct: entry?.transfusionProduct,
    }),
  };
}

/**
 * @param {object} store
 * @param {{ text?: unknown, at?: unknown, kind?: unknown, transfusionProduct?: unknown }} entry
 */
function appendNewEntry(store, entry) {
  const text = resolveEventualidadEntryText(entry?.text, entry?.kind);
  if (!text) return { ok: false, error: 'empty' };
  const beforeLen = store.entries.length;
  const next = appendEventualidad(
    store,
    entry?.text,
    '',
    entry?.at != null ? String(entry.at) : '',
    entry?.kind,
    entry?.transfusionProduct
  );
  if (next.entries.length === beforeLen) return { ok: false, error: 'empty' };
  return { ok: true, store: next };
}

/**
 * @param {object} store
 * @param {{ text?: unknown, at?: unknown, kind?: unknown, transfusionProduct?: unknown, id?: unknown }} entry
 */
function upsertIntoStore(store, entry) {
  const entryId = entry && entry.id != null ? String(entry.id).trim() : '';
  if (entryId) return updateExistingEntry(store, entry, entryId);
  return appendNewEntry(store, entry);
}

/**
 * @param {unknown} patientsArr
 * @param {{ patientId: string, entry: { text?: unknown, at?: unknown, kind?: unknown, transfusionProduct?: unknown, id?: unknown } }} args
 */
export function applyEventualidadUpsert(patientsArr, { patientId, entry }) {
  const found = findPatientClone(patientsArr, patientId);
  if (!found.ok) return found;
  const store = ensureStore(found.patient);
  const result = upsertIntoStore(store, entry && typeof entry === 'object' ? entry : {});
  if (!result.ok) return result;
  found.patient.eventualidades = result.store;
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
  found.patient.eventualidades = removeEventualidad(store, id);
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
  found.patient.eventualidades = setEventualidadesLabsText(
    store,
    text != null ? String(text) : ''
  );
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
  found.patient.eventualidades = {
    entries: merged.entries,
    labsText: merged.labsText,
    ...(merged.deletedIds ? { deletedIds: merged.deletedIds } : {}),
    ...(merged.updatedAt ? { updatedAt: merged.updatedAt } : {}),
  };
  found.patients[found.index] = found.patient;
  return { ok: true, patients: found.patients };
}
