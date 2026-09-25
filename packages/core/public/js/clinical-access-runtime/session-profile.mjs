import { persistClinicalUserBinding } from '../clinical-settings.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { electronApi } from './electron-api.mjs';
import { touchClinicalUserActivityRemote } from './session-activity.mjs';
import { migrateLocalPatientsClinicalSala } from './session-user.mjs';

/** @param {Record<string, unknown>} user @param {Record<string, unknown>} profile */
function applyClinicalProfileToSession(user, profile) {
  user.username = profile.username ?? user.username;
  user.rank = profile.rank ?? user.rank;
  user.sala = profile.sala ?? null;
  user.clinical_name = profile.clinical_name ?? null;
  user.is_program_admin = profile.is_program_admin === 1 ? 1 : 0;
  persistClinicalUserBinding({
    isProgramAdmin: user.is_program_admin === 1,
    sala: profile.sala != null ? String(profile.sala) : undefined,
  });
}

/** Reload username, rank, sala, admin flag from DB into session. */
export async function refreshClinicalUserProfile() {
  const { ensureLanProfileGateDeviceReset } = await import('../clinical-settings.mjs');
  ensureLanProfileGateDeviceReset();
  const api = electronApi();
  const userId = String(clinicalSessionContext.user?.user_id || '');
  if (!api || !userId || typeof api.dbClinicalProfileGet !== 'function') return;
  try {
    const res = await api.dbClinicalProfileGet({ userId });
    const profile = res?.profile;
    const user = clinicalSessionContext.user;
    if (!profile || !user) return;
    applyClinicalProfileToSession(user, profile);
    void touchClinicalUserActivityRemote(userId);
  } catch { /* profile IPC optional */ }
  migrateLocalPatientsClinicalSala();
}
