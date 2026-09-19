/**
 * Pure transforms for patient census rows in the patients blob.
 */

/**
 * @param {unknown} patientsArr
 * @param {{ patient: object }} args
 * @returns {{ ok: true, patients: object[] } | { ok: false, error: string }}
 */
export function applyPatientUpsert(patientsArr, { patient }) {
  const row = patient && typeof patient === 'object' ? patient : null;
  const id = row && row.id != null ? String(row.id).trim() : '';
  if (!id) return { ok: false, error: 'invalid_patient' };
  const base = Array.isArray(patientsArr) ? patientsArr : [];
  const nextRow = { ...row, id };
  const index = base.findIndex((p) => p && String(p.id) === id);
  if (index < 0) {
    return { ok: true, patients: [...base, nextRow] };
  }
  const patients = base.map((p, i) => (i === index ? nextRow : p));
  return { ok: true, patients };
}

/**
 * @param {unknown} patientsArr
 * @param {{ patientId: string }} args
 * @returns {{ ok: true, patients: object[] } | { ok: false, error: string }}
 */
export function applyPatientDelete(patientsArr, { patientId }) {
  const id = String(patientId || '').trim();
  if (!id) return { ok: false, error: 'invalid_patient_id' };
  const base = Array.isArray(patientsArr) ? patientsArr : [];
  return {
    ok: true,
    patients: base.filter((p) => !(p && String(p.id) === id)),
  };
}
