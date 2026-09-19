import { getPatients, persistClinicalState } from '../app-state.mjs';
import { migratePatientsClinicalSala } from '../clinico-access.mjs';
import { readRpcSettings } from '../clinical-settings.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';

/**
 * @returns {number} patients tagged with sala
 * Skips elevated accounts (R4/Admin/program admin): their full-ward-pull
 * patients can arrive without their own `sala`, and stamping them with the
 * viewer's own sala would mis-tag patients from other salas as this one.
 */
export function migrateLocalPatientsClinicalSala() {
  const user = clinicalSessionContext.user;
  if (hasElevatedTeamPrivileges(user)) return 0;
  const settings = readRpcSettings();
  const sala =
    String(user?.sala || '').trim() || String(settings.clinicalSala || '').trim();
  if (!sala) return 0;

  const actor = user ? { ...user, sala } : { sala };
  const migrated = migratePatientsClinicalSala(getPatients(), actor);
  if (migrated > 0) {
    void persistClinicalState({ immediate: true });
    if (typeof document !== 'undefined') {
      void import('../features/patients.mjs')
        .then((mod) => mod.renderPatientList({ silent: true }))
        .catch(() => {});
    }
  }
  return migrated;
}

export function getClinicalUser() {
  return clinicalSessionContext.user;
}
