import { loadCensusPatientIdSet } from './clinical-access-assignments.mjs';
import { fetchActiveGuardias } from './clinical-access-guardia.mjs';
import {
  clearMembershipRejoin,
  clearMembershipRemoval,
  recordMembershipRejoin,
  recordMembershipRemoval,
  rememberResolvedGuardia,
} from './clinical-access-directory.mjs';
import {
  effectiveTeamSala,
  getTeamById,
} from './clinical-access-teams-core.mjs';

export function joinTeam(db, teamId, userId, opts = {}) {
  const team = getTeamById(db, String(teamId || ''));
  const teamSala = team ? effectiveTeamSala(db, team) : '';
  const errors = validateSelfJoinTeamMembership(db, {
    userId,
    teamId,
    teamSala,
  });
  if (errors.length) throw new Error(errors.join(' '));
  return addTeamMember(db, teamId, userId, opts);
}

/**
 * Move team rows from a stale device user to the recovered LAN identity.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ fromUserId: string, toUserId: string }} opts
 */
export function migrateTeamMemberships(db, { fromUserId, toUserId }) {
  const from = String(fromUserId || '');
  const to = String(toUserId || '');
  if (!from || !to || from === to) return { moved: 0 };

  const memberships = db
    .prepare('SELECT team_id FROM team_membership WHERE user_id = ?')
    .all(from);
  let moved = 0;
  for (const row of memberships) {
    const teamId = String(row.team_id || '');
    if (!teamId) continue;
    const exists = db
      .prepare('SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?')
      .get(teamId, to);
    if (exists) {
      db.prepare('DELETE FROM team_membership WHERE team_id = ? AND user_id = ?').run(
        teamId,
        from
      );
    } else {
      db.prepare(
        'UPDATE team_membership SET user_id = ? WHERE team_id = ? AND user_id = ?'
      ).run(to, teamId, from);
      moved += 1;
    }
  }

  db.prepare('UPDATE team_guardia_today SET user_id = ? WHERE user_id = ?').run(to, from);
  db.prepare('UPDATE teams SET leader_user_id = ? WHERE leader_user_id = ?').run(to, from);
  db.prepare('UPDATE teams SET created_by = ? WHERE created_by = ?').run(to, from);
  db.prepare('UPDATE active_guardias SET covering_user_id = ? WHERE covering_user_id = ?').run(
    to,
    from
  );

  return { moved };
}

export function validateSalaTeamMembership(db, { userId, teamId, teamSala: _teamSala }) {
  const errors = [];

  if (!userId || !teamId) {
    errors.push('Usuario o equipo no válido.');
    return errors;
  }

  // No per-user / per-rank team caps — multiple R1/R2 (and any rank) may share a team.
  void db;
  return errors;
}

/** Staged (incoming) teams are self-joinable too, so residents can claim their spot ahead of the rotation. */
export function validateSelfJoinTeamMembership(db, { userId, teamId, teamSala }) {
  return validateSalaTeamMembership(db, { userId, teamId, teamSala });
}

/**
 * Soft membership hints (warn only — never block join/add).
 * Sala team-count soft-cap is no longer surfaced per team card / join toast.
 * @param {import('better-sqlite3').Database} _db
 * @param {{ userId?: string, teamId?: string, teamSala?: string, rank?: string }} [_opts]
 * @returns {string[]}
 */
export function getSalaTeamMembershipWarnings(_db, _opts = {}) {
  return [];
}

/**
 * Active entregas whose patient chart is not in the local census blob (LAN stub / deleted locally).
 * @param {import('better-sqlite3').Database} db
 * @param {string} [userId]
 */
export function fetchOrphanActiveGuardias(db, userId) {
  const census = loadCensusPatientIdSet(db);
  return fetchActiveGuardias(db, userId).filter((row) => {
    const patientId = String(row?.patient_id || '').trim();
    return patientId && !census.has(patientId);
  });
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ patientId?: string, guardiaId?: string }} opts
 */
export function resolveActiveGuardia(db, opts = {}) {
  const patientId = String(opts.patientId || '').trim();
  const guardiaId = String(opts.guardiaId || '').trim();
  const row = guardiaId
    ? db
        .prepare(
          `SELECT guardia_id, patient_id FROM active_guardias
           WHERE guardia_id = ? AND status = 'Active'`
        )
        .get(guardiaId)
    : patientId
      ? db
          .prepare(
            `SELECT guardia_id, patient_id FROM active_guardias
             WHERE patient_id = ? AND status = 'Active' LIMIT 1`
          )
          .get(patientId)
      : null;
  if (!row) return { resolved: false };

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE active_guardias SET status = 'Resolved', assigned_at = ? WHERE guardia_id = ?`
  ).run(now, row.guardia_id);
  rememberResolvedGuardia(db, {
    patient_id: String(row.patient_id),
    guardia_id: String(row.guardia_id),
    assigned_at: now,
  });
  return {
    resolved: true,
    guardia_id: String(row.guardia_id),
    patient_id: String(row.patient_id),
    assigned_at: now,
  };
}

function updateExistingTeamMemberFraction(db, teamId, userId, fraction) {
  db.prepare(
    `UPDATE team_membership SET sub_area_fraction = ? WHERE team_id = ? AND user_id = ?`
  ).run(fraction, teamId, userId);
  return { warnings: [] };
}

function resolveMemberSubAreaFraction(db, team, userId, opts) {
  const member = db.prepare(`SELECT rank FROM users WHERE user_id = ?`).get(userId);
  const rank = String(member?.rank || '');
  let fraction = opts.subAreaFraction ? String(opts.subAreaFraction).trim() : '';
  if (!fraction && rank === 'R2') {
    fraction = String(team.sub_area_fraction || '').trim();
  }
  return { rank, fraction };
}

function insertTeamMemberRow(db, teamId, userId, fraction) {
  // Rejoin first so joined_at can bump past any leave tombstone, then clear leave.
  recordMembershipRejoin(db, teamId, userId);
  clearMembershipRemoval(db, teamId, userId);
  db.prepare(
    `INSERT INTO team_membership (team_id, user_id, sub_area_fraction) VALUES (?, ?, ?)`
  ).run(teamId, userId, fraction || null);
}

/**
 * Leave every other team so admin reassignment is a move, not a second membership.
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} keepTeamId
 * @param {{ onlyRotationActive?: 0|1 }} [opts] Restrict to teams with this
 *   rotation_active value — used when pre-staffing next month's teams so it
 *   doesn't also remove the user from this month's still-active team.
 * @returns {number} removed count
 */
export function removeOtherTeamMemberships(db, userId, keepTeamId, opts = {}) {
  const uid = String(userId || '');
  const keep = String(keepTeamId || '');
  if (!uid) return 0;
  const rows =
    opts.onlyRotationActive == null
      ? db
          .prepare(`SELECT team_id FROM team_membership WHERE user_id = ? AND team_id != ?`)
          .all(uid, keep)
      : db
          .prepare(
            `SELECT tm.team_id FROM team_membership tm
             JOIN teams t ON t.team_id = tm.team_id
             WHERE tm.user_id = ? AND tm.team_id != ? AND t.rotation_active = ?`
          )
          .all(uid, keep, opts.onlyRotationActive);
  for (const row of rows) {
    removeTeamMember(db, String(row.team_id || ''), uid);
  }
  return rows.length;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 * @param {{ subAreaFraction?: string|null, exclusive?: boolean }} [opts]
 */
export function addTeamMember(db, teamId, userId, opts = {}) {
  const tid = String(teamId || '');
  const uid = String(userId || '');
  const team = db
    .prepare(
      `SELECT team_id, sala, created_by, service, sub_area_fraction, rotation_active FROM teams WHERE team_id = ?`
    )
    .get(tid);
  if (!team) throw new Error('Equipo no encontrado.');

  // Default: one team per user — leave others so R2/R1 can be moved/reassigned.
  // Staged (rotation_active=0) target: only bump other STAGED memberships —
  // never remove the user from this month's still-active team ahead of time.
  let movedFrom = 0;
  if (opts.exclusive !== false) {
    const scoped = Number(team.rotation_active) === 0 ? { onlyRotationActive: 0 } : {};
    movedFrom = removeOtherTeamMemberships(db, uid, tid, scoped);
  }

  const existing = db
    .prepare(`SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?`)
    .get(tid, uid);
  if (existing) {
    const fraction = opts.subAreaFraction ? String(opts.subAreaFraction).trim() : '';
    if (fraction) {
      const updated = updateExistingTeamMemberFraction(db, tid, uid, fraction);
      return { ...updated, movedFrom };
    }
    throw new Error('Ya es integrante de este equipo.');
  }

  const teamSala = effectiveTeamSala(db, team);
  const errors = validateSalaTeamMembership(db, { userId: uid, teamId: tid, teamSala });
  if (errors.length) throw new Error(errors.join(' '));
  const warnings = getSalaTeamMembershipWarnings(db, { userId: uid, teamId: tid, teamSala });

  const { rank, fraction } = resolveMemberSubAreaFraction(db, team, uid, opts);
  insertTeamMemberRow(db, tid, uid, fraction);
  if (rank === 'R2' && fraction) {
    db.prepare(`UPDATE teams SET sub_area_fraction = ? WHERE team_id = ?`).run(fraction, tid);
  }

  return { warnings, movedFrom };
}

/**
 * Clear Active handoffs where this user is the covering R1.
 * Must never block leave/inherit — pendientes are resolved, not used as a gate.
 * Matches covering_user only (not source_team): night R leaving their membership
 * team still has source_team_id = day team of each patient.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} _teamId unused; kept for call-site stability
 * @param {string} userId
 * @returns {number} entregas resolved
 */
function resolveActiveGuardiasForTeamLeave(db, _teamId, userId) {
  const uid = String(userId || '');
  if (!uid) return 0;
  const rows = db
    .prepare(
      `SELECT guardia_id, patient_id FROM active_guardias
       WHERE status = 'Active' AND covering_user_id = ?`
    )
    .all(uid);
  for (const row of rows) {
    resolveActiveGuardia(db, {
      guardiaId: String(row.guardia_id || ''),
      patientId: String(row.patient_id || ''),
    });
  }
  return rows.length;
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} userId */
export function memberHasActiveGuardiaForTeam(db, teamId, userId) {
  // Informational only — leave/remove must not gate on this.
  const row = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM active_guardias
       WHERE status = 'Active' AND covering_user_id = ?`
    )
    .get(String(userId || ''));
  return Number(row?.cnt || 0) > 0;
}

export function removeTeamMember(db, teamId, userId) {
  const tid = String(teamId || '');
  const uid = String(userId || '');
  // Resolve first so Active pendientes never block membership delete.
  resolveActiveGuardiasForTeamLeave(db, tid, uid);
  recordMembershipRemoval(db, tid, uid);
  clearMembershipRejoin(db, tid, uid);
  db.prepare(`DELETE FROM team_membership WHERE team_id = ? AND user_id = ?`).run(tid, uid);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 */
export function setTeamGuardiaToday(db, teamId, userId) {
  const declaredAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO team_guardia_today (team_id, user_id, declared_at)
     VALUES (?, ?, ?)
     ON CONFLICT(team_id) DO UPDATE SET
       user_id = excluded.user_id,
       declared_at = excluded.declared_at`
  ).run(teamId, userId, declaredAt);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 */
export function getTeamGuardiaToday(db, teamId) {
  return db
    .prepare(`SELECT team_id, user_id, declared_at FROM team_guardia_today WHERE team_id = ?`)
    .get(teamId);
}
