// Entrega covering resolution — suggests/locks the on-call R1 for the quick
// handoff modal. The old entrega-phase lifecycle (start/end, roster panel,
// phase bar, grid-view toggle) was removed 2026-09-24: it lost its only UI
// button in 7.2.6 and was unreachable. See PLAN.md decisions 2026-09-24.
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import {
  getJoinedTeams,
  salaOnCallR1,
} from '../../clinico-access.mjs';
import { normalizeUsers, userOptionLabel } from './clinical-entrega-util.mjs';
import { resolveActivatorEntregaCovering } from './clinical-entrega-phase-helpers.mjs';

export function resolveR1GuardiaCovering(
  teams,
  users,
  sala,
  now = new Date(),
  salaGuardiaToday = [],
  preferredUserId = ''
) {
  const salaNorm = String(sala || '').trim();
  if (!salaNorm) return null;
  const onCall = salaOnCallR1(teams, salaNorm, now, salaGuardiaToday);
  if (!onCall.length) return null;
  const pref = String(preferredUserId || '');
  const pick = (pref && onCall.find((r) => String(r.user_id) === pref)) || onCall[0];
  const u = normalizeUsers(users).find((x) => x.user_id === String(pick.user_id));
  return {
    coveringUserId: String(pick.user_id),
    teamId: String(pick.team_id || ''),
    sala: salaNorm,
    coveringLabel: u ? userOptionLabel(u) : String(pick.user_id),
  };
}

/**
 * Covering R1 suggestion for the entrega modal — activator when they declared
 * / are on guardia, else the sala's on-call R1.
 * @param {{
 *   userId: string,
 *   rank?: string,
 *   users: object[],
 *   teams: object[],
 *   sala: string,
 *   salaGuardiaToday?: object[],
 *   guardiaActivated?: boolean,
 *   guardiaMode?: boolean,
 *   now?: Date|string,
 * }} opts
 */
export function resolveEntregaPhaseCovering(opts) {
  const activatorCovering = resolveActivatorEntregaCovering(opts);
  if (activatorCovering) return activatorCovering;

  const userId = String(opts.userId || '');
  const teams = opts.teams || [];
  const users = opts.users || [];
  const sala = String(opts.sala || '').trim();
  const salaGuardiaToday = opts.salaGuardiaToday || [];
  const now = opts.now ? new Date(opts.now) : new Date();
  return resolveR1GuardiaCovering(teams, users, sala, now, salaGuardiaToday, userId);
}

/** @param {object[]} teams @param {string} userId */
export function resolveUserSalaForEntrega(teams, userId) {
  const fromProfile = String(clinicalSessionContext.user?.sala || '').trim();
  if (fromProfile) return fromProfile;
  const joined = getJoinedTeams(teams || [], userId);
  for (const t of joined) {
    const sala = String(t.sala || '').trim();
    if (sala) return sala;
  }
  return '';
}
