import {
  shouldEnforceTeamPatientMirror,
  shouldUseElevatedPatientCensus,
} from '../clinical-privileges.mjs';
import { joinedTeamIdsForUser } from '../mobile-team-patient-scope.mjs';
import { getPatients, getIndicaciones, getLabHistory, getNotes, setPatients, persistClinicalState } from '../app-state.mjs';
import { filterPatientsForClinicalSidebar } from '../features/patients-clinical-filter.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { getClinicalScopeContextForEvaluate } from './scope-evaluate.mjs';

/**
 * A brand-new patient's team assignment can lag its census entry by a poll
 * cycle or two (25s idle mobile poll). Give a freshly-arrived patient this
 * long to pick up its assignment before hard-deleting it as out-of-scope —
 * otherwise a real admission gets wiped for good the moment it is first seen.
 */
const PATIENT_SCOPE_PRUNE_GRACE_MS = 60_000;

function isWithinScopePruneGrace(patient) {
  const at = Date.parse(String(patient?.lanUpdatedAt || ''));
  if (Number.isNaN(at)) return false;
  return Date.now() - at < PATIENT_SCOPE_PRUNE_GRACE_MS;
}

function dropPatientSidecars(pid) {
  const id = String(pid || '');
  if (!id) return;
  if (getNotes()[id]) delete getNotes()[id];
  if (getIndicaciones()[id]) delete getIndicaciones()[id];
  if (getLabHistory()[id]) delete getLabHistory()[id];
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
  const scoped = filterPatientsForClinicalSidebar(
    getPatients(),
    user,
    ctx,
    clinicalSessionContext.guardiasMap
  );
  const scopedIds = new Set(scoped.map((p) => String(p?.id || '')).filter(Boolean));
  const visible = getPatients().filter(
    (p) => scopedIds.has(String(p?.id || '')) || isWithinScopePruneGrace(p)
  );
  const visibleIds = new Set(visible.map((p) => String(p?.id || '')).filter(Boolean));
  const removed = Math.max(0, getPatients().length - visible.length);
  if (!removed) return 0;
  for (const pid of Object.keys(getNotes())) {
    if (!visibleIds.has(pid)) dropPatientSidecars(pid);
  }
  for (const p of getPatients()) {
    const pid = String(p?.id || '');
    if (pid && !visibleIds.has(pid)) dropPatientSidecars(pid);
  }
  setPatients(visible);
  persistClinicalState({ immediate: true });
  return removed;
}
