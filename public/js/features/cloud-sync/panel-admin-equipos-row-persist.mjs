import { resolveMembershipCycleForUser } from '../../clinico-access.mjs';
import { assignDraftToTeam, resolveClinicalProfileUserId } from './panel-admin-equipos-persist-core.mjs';

/** @returns {import('../../preload.js').ElectronAPI | null} */
export function equiposDbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/** @param {unknown} el */
function isSelectLike(el) {
  return (
    !!el &&
    typeof el === 'object' &&
    'value' in el &&
    typeof /** @type {{ selectedIndex?: unknown }} */ (el).selectedIndex === 'number'
  );
}

/** @param {unknown} el */
function selectValue(el) {
  if (!isSelectLike(el)) return '';
  return String(/** @type {{ value?: unknown }} */ (el).value || '').trim();
}

/** @param {HTMLElement | null | undefined} row */
export function readEquiposRowRank(row) {
  const rankSel = row?.querySelector?.('.cloud-sync-admin-equipos-rank');
  const fromSelect = selectValue(rankSel);
  if (fromSelect) return fromSelect;
  return String(row?.getAttribute?.('data-user-rank') || 'R1').trim() || 'R1';
}

/** @param {HTMLElement | null | undefined} row */
export function readEquiposRowSala(row) {
  const fromSelect = selectValue(row?.querySelector?.('.cloud-sync-admin-equipos-user-sala'));
  if (fromSelect) return fromSelect;
  return String(row?.getAttribute?.('data-sala') || '').trim();
}

/**
 * Snapshot of a row's pending assign/rank fields (DOM → payload).
 * @param {HTMLElement} row
 * @param {object[]} teams
 */
export function readEquiposRowDraft(row, teams) {
  const username = String(
    row.getAttribute('data-cloud-username') || row.getAttribute('data-username') || ''
  ).trim();
  const displayName = String(row.getAttribute('data-cloud-display') || '').trim();
  const userId = String(row.getAttribute('data-user-id') || '').trim();
  const sala = readEquiposRowSala(row);
  const rank = readEquiposRowRank(row);
  const teamId = selectValue(row.querySelector('.cloud-sync-admin-equipos-team'));
  let subAreaFraction = selectValue(row.querySelector('.cloud-sync-admin-equipos-cycle'));
  const team = (teams || []).find((t) => String(t.team_id) === teamId) || null;
  if (!subAreaFraction && team) {
    subAreaFraction = resolveMembershipCycleForUser(team, userId, rank);
  }
  return { username, displayName, userId, sala, rank, teamId, subAreaFraction, team, row };
}

/**
 * Persist rank (+ optional team membership) for one draft. No UI reload.
 * @param {ReturnType<typeof equiposDbApi>} api
 * @param {ReturnType<typeof readEquiposRowDraft>} draft
 */
export async function persistEquiposRowDraft(api, draft) {
  if (!api) return { ok: false, error: 'Base clínica no disponible.' };
  if (!String(draft.username || '').trim()) return { ok: false, error: 'Usuario inválido.' };

  const profile = await resolveClinicalProfileUserId(api, draft);
  if (!profile.ok) return { ok: false, error: profile.error };

  const assign = await assignDraftToTeam(api, draft, profile.userId);
  if (!assign.ok) return { ok: false, error: assign.error };

  return {
    ok: true,
    resolvedUserId: profile.userId,
    assigned: assign.assigned,
    movedFrom: assign.movedFrom,
    warnings: assign.warnings,
  };
}
