import {
  shouldEnforceTeamPatientMirror,
  shouldUseElevatedPatientCensus,
} from '../clinical-privileges.mjs';
import { joinedTeamIdsForUser } from '../mobile-team-patient-scope.mjs';
import { indicaciones, labHistory, notes, patients, setPatients, saveState } from '../app-state.mjs';
import { filterPatientsForClinicalSidebar } from '../features/patients-clinical-filter.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { getClinicalScopeContextForEvaluate } from './scope-evaluate.mjs';

function dropPatientSidecars(pid) {
  const id = String(pid || '');
  if (!id) return;
  if (notes[id]) delete notes[id];
  if (indicaciones[id]) delete indicaciones[id];
  if (labHistory[id]) delete labHistory[id];
}

/**
 * Hard-delete only on iPad/PWA team mirror (joined teams ready).
 * Desktop Nube must not wipe local charts — sidebar already filters by scope.
 */
function isReadyToPrunePatientsOutsideScope() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return false;
  if (shouldUseElevatedPatientCensus(user)) return false;
  if (!shouldEnforceTeamPatientMirror()) return false;
  const ctx = clinicalSessionContext.scopeContext;
  if (!ctx) return false;
  return joinedTeamIdsForUser(ctx.teams, user).size > 0;
}

/**
 * Drop patient rows (and sidecars) outside the signed-in user's clinical scope.
 * Mobile/iPad only. Desktop keeps full local census; UI filters by team/sala.
 * @returns {number} rows removed
 */
export function prunePatientsOutsideVisibleScope() {
  if (!isReadyToPrunePatientsOutsideScope()) return 0;
  const user = clinicalSessionContext.user;
  const ctx = getClinicalScopeContextForEvaluate();
  const visible = filterPatientsForClinicalSidebar(
    patients,
    user,
    ctx,
    clinicalSessionContext.guardiasMap
  );
  const visibleIds = new Set(visible.map((p) => String(p?.id || '')).filter(Boolean));
  const removed = Math.max(0, patients.length - visible.length);
  if (!removed) return 0;
  for (const pid of Object.keys(notes)) {
    if (!visibleIds.has(pid)) dropPatientSidecars(pid);
  }
  for (const p of patients) {
    const pid = String(p?.id || '');
    if (pid && !visibleIds.has(pid)) dropPatientSidecars(pid);
  }
  setPatients(visible);
  saveState({ immediate: true });
  return removed;
}
