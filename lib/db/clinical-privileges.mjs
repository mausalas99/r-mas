/** Clinical rank (Admin vs Team) capabilities: Admin gets full read/write, CSV export, and roster admin. */

/**
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
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
 * LAN user directory — Admin rank or program admin (acceso total).
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function canViewUserDirectory(user) {
  return hasElevatedTeamPrivileges(user);
}

/**
 * Create empty teams and assign members from the LAN directory.
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function canManageTeamRoster(user) {
  return hasElevatedTeamPrivileges(user);
}

/** Remove LAN directory users from the clinical DB (Admin, program admin). */
export function canDeleteDirectoryUser(user) {
  return canManageTeamRoster(user);
}
