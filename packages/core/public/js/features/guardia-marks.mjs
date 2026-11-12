/**
 * Guardia marks (esfuerzo terapéutico / pronóstico) saved from the Entrega modal's marker buttons.
 */
import { getPatients, persistClinicalState } from '../app-state.mjs';
import { canExecuteClinicalCommand, executeClinicalCommand } from '../clinical-repo-client.mjs';
import { _applyPatientPatch } from '../clinical-read-model.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import { normalizeGuardiaMarksPatch } from './guardia-census-table.mjs';
import { cloudSyncNowIso } from './cloud-sync/cloud-sync-clock.mjs';

/** @param {string} patientId */
export function findPatient(patientId) {
  const id = String(patientId || '');
  return getPatients().find((p) => p && String(p.id) === id) || null;
}

async function applyGuardiaMarksViaClinicalRepo(patient, merged, next) {
  const cmd = { type: 'patient.upsert', patient: merged };
  const meta = { source: 'ui', echoSnapshot: false };
  let res = await executeClinicalCommand(cmd, meta);
  if (res && !res.ok && res.error === 'patient_not_found') {
    // Census can land in RAM via Nube before the SQLCipher blob catches up (same as eventualidades-render.mjs:343).
    await executeClinicalCommand(
      { type: 'clinical.persistSnapshot', patients: getPatients() },
      { source: 'guardia-marks-retry', echoSnapshot: false }
    );
    res = await executeClinicalCommand(cmd, meta);
  }
  if (!res || !res.ok) return { ok: false, reason: (res && res.error) || 'repo_failed' };
  Object.assign(patient, next);
  _applyPatientPatch(patient.id, next, patient);
  // ponytail: bundle push carries the fields with the fresh clock; change_log row drains later (idempotent). Add projector drain only if Nube lag is observed.
  scheduleCloudSyncPush();
  return { ok: true, via: 'clinical-repo', changeId: res.changeId || null };
}

/**
 * @param {object} patient
 * @param {{ guardiaEsfuerzo?: unknown, guardiaPronostico?: unknown }} patch
 */
export async function saveGuardiaMarks(patient, patch) {
  if (!patient || !patient.id) return { ok: false, reason: 'no-patient' };
  const next = normalizeGuardiaMarksPatch(patch);
  if (!Object.keys(next).length) return { ok: false, reason: 'empty' };
  next.lanUpdatedAt = cloudSyncNowIso(); // Nube LWW clock for entries/{id}/fields
  const merged = { ...patient, ...next, id: String(patient.id) };
  if (!canExecuteClinicalCommand()) {
    Object.assign(patient, next);
    _applyPatientPatch(patient.id, next, patient);
    await persistClinicalState({ immediate: true, source: 'guardia-marks' });
    scheduleCloudSyncPush();
    return { ok: true, via: 'snapshot' };
  }
  return applyGuardiaMarksViaClinicalRepo(patient, merged, next);
}
