import { normalizeServiceKey } from './shared.mjs';
import { isOnCallToday } from './cycle-letters.mjs';

// Interconsultas teams don't branch on rank (they're not a Sala ward service),
// so getCycleConfig/isOnCallToday always resolve the same A–D/4 cycle regardless
// of what rank is passed here — the literal is just satisfying the shared signature.
const RANK = 'R1';

function yesterday(now) {
  const d = now instanceof Date ? now : new Date(String(now));
  const y = new Date(d.getTime());
  y.setDate(y.getDate() - 1);
  return y;
}

/**
 * Today's guardia/postguardia/activo split for the Interconsultas rotation.
 * Reuses the same on-call cycle logic as `userOnCallForInterconsultasTeam`
 * (sub_area_fraction A–D against a 4-day cycle) — does not reimplement it.
 *
 * Degenerate case (not exactly 4 Interconsultas teams, e.g. a dev/test DB):
 * guardia/postguardia are still picked by whichever team's cycle letter is
 * on-call today/yesterday (or null if none matches); activo is just
 * "everyone else" and may have 0, 1, or more than 2 teams.
 *
 * @param {object[]} teams
 * @param {Date|string} now
 */
export function getInterconsultaTeamRoles(teams, now) {
  const icTeams = (teams || []).filter((t) => normalizeServiceKey(t?.service).includes('interconsult'));
  const guardia = icTeams.find((t) => isOnCallToday(t, RANK, now)) || null;
  const postguardia = icTeams.find((t) => isOnCallToday(t, RANK, yesterday(now))) || null;
  const activo = icTeams.filter((t) => t !== guardia && t !== postguardia);
  return { guardia, postguardia, activo };
}
