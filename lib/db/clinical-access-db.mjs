import crypto from 'node:crypto';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ clientId: string, rank?: string }} opts
 */
export function ensureClinicalUser(db, { clientId, rank = 'R1' }) {
  const username = String(clientId || 'local-device').slice(0, 64);
  const allowed = new Set(['R1', 'R2', 'R3', 'R4', 'Admin']);
  const safeRank = allowed.has(rank) ? rank : 'R1';

  const existing = db
    .prepare(
      'SELECT user_id, username, rank, public_key, encrypted_private_key FROM users WHERE username = ?'
    )
    .get(username);

  if (existing) {
    return {
      userId: existing.user_id,
      username: existing.username,
      rank: existing.rank,
      publicKeyPem: existing.public_key,
      privateKeyPem: existing.encrypted_private_key,
    };
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const userId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, username, 'local-device', safeRank, publicKey, privateKey);

  return {
    userId,
    username,
    rank: safeRank,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} [userId]
 */
export function fetchActiveGuardias(db, userId) {
  if (userId) {
    return db
      .prepare(
        `SELECT guardia_id, patient_id, covering_user_id, source_team_id, is_critical,
                pendientes_json, vitals_frequency, last_vitals_check, assigned_at, status
         FROM active_guardias
         WHERE status = 'Active' AND covering_user_id = ?`
      )
      .all(userId);
  }
  return db
    .prepare(
      `SELECT guardia_id, patient_id, covering_user_id, source_team_id, is_critical,
              pendientes_json, vitals_frequency, last_vitals_check, assigned_at, status
       FROM active_guardias
       WHERE status = 'Active'`
    )
    .all();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} publicKeyPem
 */
export function findUserByPublicKey(db, publicKeyPem) {
  return db
    .prepare('SELECT user_id, username, rank, public_key FROM users WHERE public_key = ?')
    .get(publicKeyPem);
}

/** @param {Date} d */
function toStoredIso(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ monthEndAt: string, effectiveAt: string, previewDays?: number, createdBy?: string }} opts
 */
export function upsertRotationCycle(db, { monthEndAt, effectiveAt, previewDays = 2, createdBy }) {
  const effective = new Date(effectiveAt);
  const previewStart = new Date(effective);
  previewStart.setDate(previewStart.getDate() - Number(previewDays));
  const cycleId = crypto.randomUUID();
  const row = {
    cycle_id: cycleId,
    month_end_at: monthEndAt,
    preview_days: previewDays,
    preview_start_at: toStoredIso(previewStart),
    effective_at: toStoredIso(effective),
    created_by: createdBy ?? null,
  };
  db.prepare(
    `INSERT INTO rotation_cycles (cycle_id, month_end_at, preview_days, preview_start_at, effective_at, created_by)
     VALUES (@cycle_id, @month_end_at, @preview_days, @preview_start_at, @effective_at, @created_by)`
  ).run(row);
  return row;
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function getActiveRotationCycle(db) {
  return db
    .prepare(
      `SELECT * FROM rotation_cycles WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 1`
    )
    .get();
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function archiveRotationAndTeams(db) {
  const now = new Date().toISOString();
  db.prepare(`UPDATE rotation_cycles SET archived_at = ? WHERE archived_at IS NULL`).run(now);
  db.prepare(`UPDATE teams SET archived_at = ? WHERE archived_at IS NULL`).run(now);
  db.prepare(`DELETE FROM active_guardias`).run();
  db.prepare(`DELETE FROM team_guardia_today`).run();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ patientId: string, teamId: string, effectiveAt: string }} opts
 */
export function assignPatientToTeam(db, { patientId, teamId, effectiveAt }) {
  db.prepare(
    `INSERT INTO patient_team_assignment (patient_id, team_id, effective_at)
     VALUES (?, ?, ?)`
  ).run(patientId, teamId, effectiveAt);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} nowIso
 */
export function fetchIncomingAssignments(db, nowIso) {
  const cycle = getActiveRotationCycle(db);
  if (!cycle) return [];
  return db
    .prepare(
      `SELECT pta.patient_id, pta.team_id, pta.effective_at, pta.created_at,
              p.id, p.name, p.bed_label, p.service, p.sub_area, p.interconsult_type,
              p.prognosis_classification, p.negativa_maniobras_firmada
       FROM patient_team_assignment pta
       JOIN patients p ON p.id = pta.patient_id
       WHERE ? >= ? AND ? < pta.effective_at`
    )
    .all(nowIso, cycle.preview_start_at, nowIso);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ name: string, service: string, onCallDayIndex: number, subAreaFraction?: string, createdBy?: string }} opts
 */
export function createTeam(db, { name, service, onCallDayIndex, subAreaFraction, createdBy }) {
  const teamId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO teams (team_id, name, service, sub_area_fraction, on_call_day_index, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    teamId,
    String(name),
    String(service),
    subAreaFraction ?? null,
    Number(onCallDayIndex),
    createdBy ?? null
  );
  return {
    team_id: teamId,
    name: String(name),
    service: String(service),
    sub_area_fraction: subAreaFraction ?? null,
    on_call_day_index: Number(onCallDayIndex),
    created_by: createdBy ?? null,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function listActiveTeams(db) {
  return db
    .prepare(
      `SELECT team_id, name, service, sub_area_fraction, on_call_day_index, created_by, archived_at
       FROM teams
       WHERE archived_at IS NULL
       ORDER BY name`
    )
    .all();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 */
export function addTeamMember(db, teamId, userId) {
  db.prepare(`INSERT OR IGNORE INTO team_membership (team_id, user_id) VALUES (?, ?)`).run(
    teamId,
    userId
  );
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 */
export function removeTeamMember(db, teamId, userId) {
  db.prepare(`DELETE FROM team_membership WHERE team_id = ? AND user_id = ?`).run(teamId, userId);
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

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 */
export function listTeamMembers(db, teamId) {
  return db
    .prepare(
      `SELECT tm.team_id, tm.user_id, u.username, u.rank
       FROM team_membership tm
       JOIN users u ON u.user_id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY u.username`
    )
    .all(teamId);
}

/**
 * Snapshot for renderer scope evaluation (V2).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} [userId]
 */
export function getClinicalScopeContext(db, userId) {
  const nowIso = new Date().toISOString();
  const teams = listActiveTeams(db).map((team) => ({
    ...team,
    members: listTeamMembers(db, team.team_id),
  }));
  const guardias = fetchActiveGuardias(db, userId || undefined);
  const cycle = getActiveRotationCycle(db);
  const assignments = fetchIncomingAssignments(db, nowIso);
  const salaGuardiaToday = db
    .prepare(`SELECT team_id, user_id, declared_at FROM team_guardia_today`)
    .all();
  return {
    teams,
    guardias,
    cycle: cycle ?? null,
    assignments,
    salaGuardiaToday,
    now: nowIso,
  };
}
