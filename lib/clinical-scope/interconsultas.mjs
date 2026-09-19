import { normalizeServiceKey } from './shared.mjs';

/**
 * Kept for tests/clinico-access.test.mjs (pending its own rewrite) — no
 * production caller uses this outside the deleted rank-cascade preamble.
 */
export function isInterconsultasPatient(patient) {
  if (!patient) return false;
  const svc = normalizeServiceKey(patient.service || patient.servicio || '');
  const sub = normalizeServiceKey(patient.sub_area || patient.area || '');
  if (svc.includes('interconsult') || sub.includes('interconsult')) return true;
  const ic = String(patient.interconsult_type || 'None');
  return ic !== 'None' && ic !== '';
}
