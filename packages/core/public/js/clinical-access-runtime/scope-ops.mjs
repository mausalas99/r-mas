/**
 * Runtime I/O adapter: hydrate clinicalSessionContext from ops/session snapshots.
 * Pure scope evaluation lives in lib/clinical-scope — this module only wires
 * session/ops I/O (privileges, entrega LS, scope-from-ops build).
 */

import { isDbMode } from '../db-storage-bridge.mjs';
import { shouldEnforceTeamPatientMirror, shouldUseElevatedPatientCensus } from '../clinical-privileges.mjs';
import { readEntregaPhaseActive } from '../clinico-access.mjs';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { buildClinicalScopeContextFromOpsSnapshot } from '../clinical-scope-from-ops.mjs';
import { joinedTeamIdsForUser } from '../mobile-team-patient-scope.mjs';
import { buildGuardiasMap } from './guardia-grid.mjs';
import { applyOpsResolvedUser, invalidateMobileSidebarPatientCache } from './scope-ops-user.mjs';

/** True when LAN may apply/filter patient bundle rows for the signed-in user. */
export function isClinicalScopeReadyForPatientApply() {
  const user = clinicalSessionContext.user;
  if (!user?.user_id) return false;
  if (shouldUseElevatedPatientCensus(user)) return true;
  // Desktop: scope evaluate has a session fallback — do not block push/apply on scopeContext hydrate races.
  if (!shouldEnforceTeamPatientMirror()) return true;
  const ctx = clinicalSessionContext.scopeContext;
  if (!ctx) return false;
  return joinedTeamIdsForUser(ctx.teams, user).size > 0;
}

function applyOpsScopeContext(snapshot) {
  const ctx = buildClinicalScopeContextFromOpsSnapshot(snapshot, {
    guardiaMode: clinicalSessionContext.guardiaMode,
    entregaPhaseActive: readEntregaPhaseActive(),
    enforceTeamPatientScope: true,
  });
  if (!ctx) return false;
  clinicalSessionContext.scopeContext = ctx;
  clinicalSessionContext.teams = ctx.teams;
  clinicalSessionContext.guardias = ctx.guardias;
  clinicalSessionContext.guardiasMap = buildGuardiasMap(ctx.guardias);
  return true;
}

/**
 * iPad/PWA: hydrate teams/assignments from LAN clinicalOps (no SQLCipher merge).
 * @param {object|null|undefined} snapshot
 * @returns {boolean}
 */
export function applyClinicalScopeFromOpsSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || isDbMode()) return false;
  applyOpsResolvedUser(snapshot, clinicalSessionContext.user);
  if (!applyOpsScopeContext(snapshot)) return false;
  invalidateMobileSidebarPatientCache();
  return true;
}

export { prunePatientsOutsideVisibleScope as prunePatientsOutsideClinicalScope } from './patient-scope-prune.mjs';
