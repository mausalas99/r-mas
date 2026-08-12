import { resolveUserPlacement } from '../clinical-teams/teams-roster-directory-render.mjs';

/** @param {string} userId @param {object[]} teams */
function equiposAssignmentRank(userId, teams) {
  return userId && resolveUserPlacement(userId, teams) ? 1 : 0;
}

/** @param {string} iso */
function equiposActivityRank(iso) {
  const ts = Date.parse(String(iso || '')) || 0;
  return { ts, has: ts > 0 ? 1 : 0 };
}

/**
 * @param {object} a
 * @param {object} b
 * @param {object[]} teams
 */
export function compareEquiposRowsForAdmin(a, b, teams) {
  const assignDelta =
    equiposAssignmentRank(String(a.user_id || ''), teams) -
    equiposAssignmentRank(String(b.user_id || ''), teams);
  if (assignDelta) return assignDelta;

  const aAct = equiposActivityRank(a.last_activity_at);
  const bAct = equiposActivityRank(b.last_activity_at);
  if (aAct.has !== bAct.has) return aAct.has - bAct.has;
  if (aAct.ts !== bAct.ts) return bAct.ts - aAct.ts;
  return String(a.username || '').localeCompare(String(b.username || ''), 'es');
}

/**
 * Unassigned + unused first, then by username — faster admin pass.
 * @param {object[]} rows
 * @param {object[]} teams
 */
export function sortEquiposRowsForAdmin(rows, teams) {
  return (rows || []).slice().sort((a, b) => compareEquiposRowsForAdmin(a, b, teams));
}
