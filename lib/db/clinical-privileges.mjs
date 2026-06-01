/** Clinical rank (R1–R4) vs program-admin capabilities (rotation config, full scope). */

const CLINICAL_RANKS = new Set(['R1', 'R2', 'R3', 'R4']);

/**
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function hasProgramAdminPrivileges(user) {
  if (!user) return false;
  if (user.is_program_admin === 1 || user.is_program_admin === true) return true;
  return String(user.rank || '') === 'Admin';
}

/**
 * Rank used for Entrega targets, team rules, and UI labels (never Admin).
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function effectiveClinicalRank(user) {
  const rank = String(user?.rank || 'R1');
  if (CLINICAL_RANKS.has(rank)) return rank;
  if (rank === 'Admin') return 'R1';
  return 'R1';
}

/**
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function canConfigureRotation(user) {
  const rank = effectiveClinicalRank(user);
  if (rank === 'R4') return true;
  return hasProgramAdminPrivileges(user);
}

/**
 * Cross-sala team browse and global patient census (R4, Admin, program admin).
 * @param {{ rank?: string, is_program_admin?: number|boolean }|null|undefined} user
 */
export function hasElevatedTeamPrivileges(user) {
  if (!user) return false;
  if (hasProgramAdminPrivileges(user)) return true;
  return effectiveClinicalRank(user) === 'R4';
}
