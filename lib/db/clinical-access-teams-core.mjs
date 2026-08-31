import crypto from 'node:crypto';
import { canManageTeamRoster } from './clinical-privileges.mjs';
import { getClinicalProfile } from './clinical-access-users.mjs';
import { recordTeamArchive } from './clinical-access-directory.mjs';

/**
 * True when the current rotation still has live teams (pre–nueva rotación).
 * Each sala rotates independently, so this is scoped per sala — otherwise the
 * first sala to get an active team would force every other sala's next new
 * team into staged mode too.
 * @param {import('better-sqlite3').Database} db
 * @param {string|null} [sala] omit for a hospital-wide check (rarely correct — prefer passing sala)
 */
export function hasCurrentRotationTeams(db, sala) {
  if (sala == null) {
    return !!db
      .prepare(
        `SELECT 1 AS ok FROM teams WHERE archived_at IS NULL AND rotation_active = 1 LIMIT 1`
      )
      .get();
  }
  return !!db
    .prepare(
      `SELECT 1 AS ok FROM teams WHERE archived_at IS NULL AND rotation_active = 1 AND sala = ? LIMIT 1`
    )
    .get(sala);
}

/** New teams staged as incoming (rotation_active=0) while the month is still active. */
export function resolveRotationActiveForNewTeam(db, sala) {
  return hasCurrentRotationTeams(db, sala) ? 0 : 1;
}

export function createTeam(db, teamInput) {
  const input = teamInput && typeof teamInput === 'object' ? teamInput : {};
  const teamId = crypto.randomUUID();
  const rotationActive = resolveRotationActiveForNewTeam(db, input.sala ?? null);
  db.prepare(
    `INSERT INTO teams (team_id, name, service, sub_area_fraction, on_call_day_index, sala, team_leader_name, created_by, leader_user_id, rotation_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    teamId,
    String(input.name),
    String(input.service),
    input.subAreaFraction ?? null,
    Number(input.onCallDayIndex),
    input.sala ?? null,
    input.teamLeaderName ?? null,
    input.createdBy ?? null,
    input.leaderUserId ?? input.createdBy ?? null,
    rotationActive
  );
  return {
    team_id: teamId,
    name: String(input.name),
    service: String(input.service),
    sub_area_fraction: input.subAreaFraction ?? null,
    on_call_day_index: Number(input.onCallDayIndex),
    sala: input.sala ?? null,
    team_leader_name: input.teamLeaderName ?? null,
    created_by: input.createdBy ?? null,
    leader_user_id: input.leaderUserId ?? input.createdBy ?? null,
    rotation_active: rotationActive,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function listActiveTeams(db) {
  return db
    .prepare(
      `SELECT team_id, name, service, sub_area_fraction, on_call_day_index, created_by, archived_at, sala, team_leader_name, leader_user_id, rotation_active, succeeds_team_id
       FROM teams
       WHERE archived_at IS NULL
       ORDER BY name`
    )
    .all();
}

/** Teams visible for join / census during the active rotation month. */
export function listRotationVisibleTeams(db) {
  return db
    .prepare(
      `SELECT team_id, name, service, sub_area_fraction, on_call_day_index, created_by, archived_at, sala, team_leader_name, leader_user_id, rotation_active, succeeds_team_id
       FROM teams
       WHERE archived_at IS NULL AND rotation_active = 1
       ORDER BY name`
    )
    .all();
}

/**
 * Teams for Mi rotación: current rotation + staged teams the user already belongs to.
 * @param {import('better-sqlite3').Database} db
 * @param {string} [userId]
 */
export function listTeamsForRenderer(db, userId) {
  const visible = listRotationVisibleTeams(db);
  const uid = String(userId || '').trim();
  if (!uid) return visible;
  const staged = db
    .prepare(
      `SELECT t.team_id, t.name, t.service, t.sub_area_fraction, t.on_call_day_index, t.created_by,
              t.archived_at, t.sala, t.team_leader_name, t.leader_user_id, t.rotation_active, t.succeeds_team_id
       FROM teams t
       INNER JOIN team_membership tm ON tm.team_id = t.team_id
       WHERE t.archived_at IS NULL AND t.rotation_active = 0 AND tm.user_id = ?
       ORDER BY t.name`
    )
    .all(uid);
  if (!staged.length) return visible;
  const seen = new Set(visible.map((t) => String(t.team_id)));
  return visible.concat(staged.filter((t) => !seen.has(String(t.team_id))));
}

/**
 * Recently archived teams (for month handoff: Dr. Fer → Dra. Leslie).
 * @param {import('better-sqlite3').Database} db
 * @param {{ limit?: number }} [opts]
 */
export function listArchivedTeams(db, opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 80, 1), 200);
  return db
    .prepare(
      `SELECT team_id, name, service, sub_area_fraction, on_call_day_index, created_by, archived_at, sala, team_leader_name, leader_user_id, rotation_active, succeeds_team_id
       FROM teams
       WHERE archived_at IS NOT NULL
       ORDER BY archived_at DESC
       LIMIT ?`
    )
    .all(limit);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ sala?: string, forUserId?: string }} opts
 */
export function clearTeamGuardiaToday(db, teamId) {
  db.prepare(`DELETE FROM team_guardia_today WHERE team_id = ?`).run(String(teamId || ''));
}

/**
 * Teams may lack `sala` when created before the field was required; infer from creator profile.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ sala?: string|null, created_by?: string|null }} team
 */
export function effectiveTeamSala(db, team) {
  const direct = String(team?.sala || '').trim();
  if (direct) return direct;
  const createdBy = String(team?.created_by || '').trim();
  if (!createdBy) return '';
  const row = db.prepare('SELECT sala FROM users WHERE user_id = ?').get(createdBy);
  return String(row?.sala || '').trim();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {object} team
 */
export function withEffectiveTeamSala(db, team) {
  const resolved = effectiveTeamSala(db, team);
  return {
    ...team,
    sala: resolved || team.sala || null,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} sala
 */
export const SOFT_MAX_TEAMS_PER_SALA = 4;
export const SOFT_MAX_R1_PER_TEAM = 2;

export function countTeamsInEffectiveSala(db, sala) {
  const target = String(sala || '').trim();
  if (!target) return 0;
  return listActiveTeams(db).filter((team) => effectiveTeamSala(db, team) === target).length;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} sala
 * @returns {string|null}
 */
export function getSalaTeamCountWarning(db, sala) {
  const target = String(sala || '').trim();
  if (!target) return null;
  if (countTeamsInEffectiveSala(db, target) >= SOFT_MAX_TEAMS_PER_SALA) {
    return `Ya hay ${SOFT_MAX_TEAMS_PER_SALA} equipos en esta Sala (recomendado máximo).`;
  }
  return null;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} sala
 */
export function userHasR1MembershipInEffectiveSala(db, userId, sala, exceptTeamId) {
  const uid = String(userId || '');
  const target = String(sala || '').trim();
  const skipTeam = String(exceptTeamId || '');
  if (!uid || !target) return false;
  const user = db.prepare(`SELECT rank FROM users WHERE user_id = ?`).get(uid);
  if (String(user?.rank || '') !== 'R1') return false;
  for (const team of listActiveTeams(db)) {
    if (skipTeam && String(team.team_id) === skipTeam) continue;
    if (effectiveTeamSala(db, team) !== target) continue;
    const member = db
      .prepare(`SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?`)
      .get(team.team_id, uid);
    if (member) return true;
  }
  return false;
}

export function promoteTeamLeader(db, teamId, userId) {
  db.prepare(
    `UPDATE teams SET leader_user_id = ? WHERE team_id = ?`
  ).run(userId, teamId);
  return getTeamById(db, teamId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 */
export function getTeamById(db, teamId) {
  return db.prepare(
    `SELECT team_id, name, service, sub_area_fraction, on_call_day_index, created_by,
            archived_at, sala, team_leader_name, leader_user_id, rotation_active, succeeds_team_id
     FROM teams WHERE team_id = ?`
  ).get(teamId);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 */
export function assertCanManageTeamRoster(db, userId) {
  const profile = getClinicalProfile(db, String(userId || ''));
  if (!canManageTeamRoster(profile)) {
    throw new Error(
      'Solo R4, Admin o usuarios con privilegios de administración pueden gestionar equipos.'
    );
  }
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {{ name?: string, sala?: string, callerUserId: string }} opts
 */
export function updateTeam(db, teamId, { name, sala, succeedsTeamId, callerUserId }) {
  assertCanManageTeamRoster(db, callerUserId);
  const tid = String(teamId || '').trim();
  const team = getTeamById(db, tid);
  if (!team || team.archived_at) throw new Error('Equipo no encontrado.');

  const nextName = name != null ? String(name).trim() : String(team.name || '').trim();
  const nextSala =
    sala != null
      ? String(sala).trim()
      : String(team.sala || effectiveTeamSala(db, team) || '').trim();
  if (!nextName) throw new Error('Indica el nombre del equipo.');
  if (!nextSala) throw new Error('Selecciona la sala del equipo.');

  let nextSucceeds = team.succeeds_team_id ?? null;
  if (succeedsTeamId !== undefined) {
    const sid = String(succeedsTeamId || '').trim();
    if (!sid) {
      nextSucceeds = null;
    } else {
      if (sid === tid) throw new Error('Un equipo no puede heredar de sí mismo.');
      const source = getTeamById(db, sid);
      if (!source || source.archived_at) {
        throw new Error('El equipo del que hereda no existe o ya está archivado.');
      }
      nextSucceeds = sid;
    }
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE teams SET name = ?, sala = ?, team_leader_name = ?, succeeds_team_id = ?, updated_at = ? WHERE team_id = ?`
  ).run(nextName, nextSala, nextName, nextSucceeds, now, tid);

  const warning = getSalaTeamCountWarning(db, nextSala);
  return {
    ...withEffectiveTeamSala(db, getTeamById(db, tid)),
    members: listTeamMembers(db, tid),
    warnings: warning ? [warning] : [],
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} callerUserId
 */
export function archiveTeam(db, teamId, callerUserId) {
  assertCanManageTeamRoster(db, callerUserId);
  const tid = String(teamId || '').trim();
  const team = getTeamById(db, tid);
  if (!team || team.archived_at) throw new Error('Equipo no encontrado.');

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE teams SET archived_at = ?, rotation_active = 0, updated_at = ? WHERE team_id = ?`
  ).run(now, now, tid);
  db.prepare(`DELETE FROM team_membership WHERE team_id = ?`).run(tid);
  clearTeamGuardiaToday(db, tid);
  recordTeamArchive(db, tid, now);
  return { team_id: tid, archived_at: now };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @returns {{ team_id: string }|null}
 */
export function findUserTeamForAutoAssign(db, userId) {
  return db.prepare(
    `SELECT tm.team_id
     FROM team_membership tm
     JOIN teams t ON t.team_id = tm.team_id
     WHERE tm.user_id = ? AND t.rotation_active = 1 AND t.archived_at IS NULL
     LIMIT 1`
  ).get(userId) || null;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 */
export function listTeamMembers(db, teamId) {
  return db
    .prepare(
      `SELECT tm.team_id, tm.user_id, tm.sub_area_fraction, u.username, u.rank, u.clinical_name
       FROM team_membership tm
       JOIN users u ON u.user_id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY u.rank DESC, u.username`
    )
    .all(teamId);
}
