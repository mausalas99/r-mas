/** Renderer privilege rules; the pure rank rules live in clinical-privileges-rules.mjs (shared with lib/db). */

import { hasElevatedTeamPrivileges } from './clinical-privileges-rules.mjs';
import { isWebClinicalClient } from './db-storage-bridge.mjs';
import { isMobileWeb } from './mobile-web.mjs';

/** iPad/PWA or any browser LAN session — never full Admin/R4 ward census. */
export function shouldEnforceTeamPatientMirror() {
  return isMobileWeb() || isWebClinicalClient();
}

/**
 * Desktop Nube used to hard-hide non-joined-team charts (broke visibility after team
 * archive + admin reassignment). Desktop now shows the full census and narrows via
 * Filtros (default sala + equipo). Kept as a named policy hook for tests/callers.
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} [user]
 */
export function shouldUseCloudTeamPatientMirror(_user) {
  return false;
}

/** Sidebar hard team mirror — iPad/PWA only (desktop uses Filtros instead). */
export function shouldFilterPatientsByJoinedTeam(user) {
  if (shouldEnforceTeamPatientMirror()) return true;
  return shouldUseCloudTeamPatientMirror(user);
}

/**
 * Desktop: full patient list + Filtros censo (vs iPad hard team mirror).
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} [user]
 */
export function shouldUseDesktopCensusWithFilters(user) {
  if (!user?.user_id) return false;
  if (shouldEnforceTeamPatientMirror()) return false;
  return true;
}

/**
 * Desktop elevated census (R4/Admin): full ward + Filtros censo.
 * iPad/PWA always uses joined-team scope regardless of rank.
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function shouldUseElevatedPatientCensus(user) {
  if (!hasElevatedTeamPrivileges(user)) return false;
  if (shouldEnforceTeamPatientMirror()) return false;
  return true;
}

/** Filtros censo toolbar — desktop always; iPad/PWA when team-mirrored. */
export function shouldShowClinicalCensusFilters(user) {
  if (!user?.user_id) return false;
  if (shouldUseDesktopCensusWithFilters(user)) return true;
  if (shouldUseElevatedPatientCensus(user)) return true;
  return shouldFilterPatientsByJoinedTeam(user);
}

export {
  hasProgramAdminPrivileges,
  effectiveClinicalRank,
  canConfigureRotation,
  canManageInternoQr,
  hasElevatedTeamPrivileges,
  canViewUserDirectory,
  canManageTeamRoster,
  canDeleteDirectoryUser,
} from './clinical-privileges-rules.mjs';
