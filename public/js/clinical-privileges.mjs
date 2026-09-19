/** Renderer mirror of lib/db/clinical-privileges.mjs */

import { isWebClinicalClient } from './db-storage-bridge.mjs';
import { isMobileWeb } from './mobile-web.mjs';

/** iPad/PWA or any browser LAN session — never full Admin ward census. */
export function shouldEnforceTeamPatientMirror() {
  return isMobileWeb() || isWebClinicalClient();
}

/**
 * No team-based visibility partition anywhere (Admin/Team both see every patient,
 * on every device). Kept as a named policy hook for existing callers/tests.
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} [_user]
 */
export function shouldFilterPatientsByJoinedTeam(_user) {
  return false;
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

/** @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user */
export function hasProgramAdminPrivileges(user) {
  if (!user) return false;
  if (user.is_program_admin === 1 || user.is_program_admin === true) return true;
  return String(user.rank || '') === 'Admin';
}

/**
 * Rotation-roster admin (Nueva rotación, equipos queue admin actions): Admin only.
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function canConfigureRotation(user) {
  return hasProgramAdminPrivileges(user);
}

/**
 * Cross-team browse and global patient census: Admin or program admin.
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function hasElevatedTeamPrivileges(user) {
  return hasProgramAdminPrivileges(user);
}

/**
 * Desktop elevated census (Admin): full census + Filtros censo.
 * iPad/PWA always uses joined-team scope regardless of rank.
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function shouldUseElevatedPatientCensus(user) {
  if (!hasElevatedTeamPrivileges(user)) return false;
  if (shouldEnforceTeamPatientMirror()) return false;
  return true;
}

/** Filtros censo toolbar — every signed-in user sees the full census, so always show it. */
export function shouldShowClinicalCensusFilters(user) {
  return !!user?.user_id;
}

/** @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user */
export function canViewUserDirectory(user) {
  return hasElevatedTeamPrivileges(user);
}

/** @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user */
export function canManageTeamRoster(user) {
  return hasElevatedTeamPrivileges(user);
}

/** Remove LAN directory users from the clinical DB (Admin, program admin). */
export function canDeleteDirectoryUser(user) {
  return canManageTeamRoster(user);
}
