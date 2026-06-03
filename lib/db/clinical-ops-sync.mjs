import { createRequire } from 'node:module';
import {
  archiveRotationAndTeams,
  upsertActiveGuardia,
  setTeamGuardiaToday,
} from './clinical-access-db.mjs';
import { isValidUsernameFormat, normalizeUsername } from './clinical-username.mjs';

const require = createRequire(import.meta.url);
const { mergeClinicalOpsFromSourcesData } = require('./clinical-ops-bundle-merge.cjs');

const META_ROTATION_NUEVA_AT = 'rotation_nueva_at';

/**
 * @param {import('better-sqlite3').Database} db
 */
export function exportClinicalOpsSnapshot(db) {
  const rotationNuevaAt =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_ROTATION_NUEVA_AT)?.value ??
    null;
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    rotationNuevaAt,
    rotation_cycles: db.prepare(`SELECT * FROM rotation_cycles ORDER BY created_at`).all(),
    patient_team_assignment: db
      .prepare(`SELECT * FROM patient_team_assignment ORDER BY created_at`)
      .all(),
    team_guardia_today: db.prepare(`SELECT * FROM team_guardia_today`).all(),
    teams: db.prepare(`SELECT * FROM teams ORDER BY name`).all(),
    team_membership: db.prepare(`SELECT * FROM team_membership`).all(),
    active_guardias: db
      .prepare(`SELECT * FROM active_guardias WHERE status = 'Active' ORDER BY assigned_at`)
      .all(),
    clinical_users: db
      .prepare(
        `SELECT user_id, username, rank, clinical_name, sala, is_program_admin, created_at
         FROM users ORDER BY username`
      )
      .all()
      .filter((row) => isValidUsernameFormat(normalizeUsername(row?.username || ''))),
    entrega_template_user: db
      .prepare(`SELECT * FROM entrega_template_user ORDER BY created_at`)
      .all(),
    entrega_template_team: db
      .prepare(`SELECT * FROM entrega_template_team ORDER BY created_at`)
      .all(),
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} iso
 */
export function stampRotationNuevaAt(db, iso) {
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_ROTATION_NUEVA_AT, iso);
}

/**
 * Merge V2 clinical ops tables from a LAN / save-all snapshot.
 *
 * Strategy (see lan-sync.mjs header comment):
 * - team_guardia_today, teams metadata: last-write per row
 * - rotation.nueva: newer rotationNuevaAt triggers archive on peer
 * - patient_team_assignment, team_membership: union (no silent deletes)
 * - active_guardias: last-write per patient by assigned_at
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} incoming
 * @param {object} [localSnapshot]
 */
export function mergeClinicalOpsSnapshot(db, incoming, localSnapshot = null) {
  if (!incoming || typeof incoming !== 'object') return { merged: false };

  const local =
    localSnapshot && typeof localSnapshot === 'object'
      ? localSnapshot
      : exportClinicalOpsSnapshot(db);

  const remoteNueva = incoming.rotationNuevaAt ? String(incoming.rotationNuevaAt) : '';
  const localNueva = local.rotationNuevaAt ? String(local.rotationNuevaAt) : '';
  let localGuardias = local.active_guardias || [];
  let localTeamGuardia = local.team_guardia_today || [];
  if (remoteNueva && (!localNueva || remoteNueva > localNueva)) {
    archiveRotationAndTeams(db);
    stampRotationNuevaAt(db, remoteNueva);
    localGuardias = [];
    localTeamGuardia = [];
  }

  mergeRotationCycles(db, local.rotation_cycles || [], incoming.rotation_cycles || []);
  mergeClinicalUsers(db, incoming.clinical_users || []);
  ensureStubLanUsersReferenced(db, incoming);
  mergeTeams(db, local.teams || [], incoming.teams || []);
  mergeEntregaTemplateUser(db, local.entrega_template_user || [], incoming.entrega_template_user || []);
  mergeEntregaTemplateTeam(db, local.entrega_template_team || [], incoming.entrega_template_team || []);
  mergeTeamMembership(db, incoming.team_membership || []);
  mergePatientTeamAssignments(db, incoming.patient_team_assignment || []);
  mergeTeamGuardiaToday(db, localTeamGuardia, incoming.team_guardia_today || []);
  mergeActiveGuardias(db, localGuardias, incoming.active_guardias || []);

  return { merged: true };
}

/**
 * Pick the newer of two LAN bundle clinicalOps payloads by exportedAt.
 * @param {object[]} sources
 */
export function pickNewerClinicalOpsSnapshot(sources) {
  return mergeClinicalOpsFromSourcesData(sources);
}

function mergeRotationCycles(db, localRows, incomingRows) {
  const upsert = db.prepare(
    `INSERT INTO rotation_cycles
       (cycle_id, month_end_at, preview_days, preview_start_at, effective_at, archived_at, created_by, created_at)
     VALUES (@cycle_id, @month_end_at, @preview_days, @preview_start_at, @effective_at, @archived_at, @created_by, @created_at)
     ON CONFLICT(cycle_id) DO UPDATE SET
       archived_at = COALESCE(excluded.archived_at, rotation_cycles.archived_at),
       month_end_at = excluded.month_end_at,
       preview_days = excluded.preview_days,
       preview_start_at = excluded.preview_start_at,
       effective_at = excluded.effective_at`
  );
  const byId = new Map();
  for (const row of localRows) {
    if (row && row.cycle_id) byId.set(String(row.cycle_id), row);
  }
  for (const row of incomingRows) {
    if (row && row.cycle_id) byId.set(String(row.cycle_id), row);
  }
  for (const row of byId.values()) upsert.run(row);
}

function mergeTeams(db, localRows, incomingRows) {
  const localById = indexBy(localRows, 'team_id');
  const incomingById = indexBy(incomingRows, 'team_id');
  const allIds = new Set([...localById.keys(), ...incomingById.keys()]);

  for (const teamId of allIds) {
    const localRow = localById.get(teamId);
    const incomingRow = incomingById.get(teamId);
    const winner = pickLastWriteRow(localRow, incomingRow, 'created_at');
    if (!winner) continue;

    const existing = db.prepare(`SELECT team_id FROM teams WHERE team_id = ?`).get(teamId);
    if (existing) {
      db.prepare(
        `UPDATE teams SET name = ?, service = ?, sub_area_fraction = ?, on_call_day_index = ?,
         created_by = ?, archived_at = ?, sala = ?, team_leader_name = ?, leader_user_id = ?, rotation_active = ?
         WHERE team_id = ?`
      ).run(
        winner.name,
        winner.service,
        winner.sub_area_fraction ?? null,
        Number(winner.on_call_day_index ?? 0),
        winner.created_by ?? null,
        winner.archived_at ?? null,
        winner.sala ?? null,
        winner.team_leader_name ?? null,
        winner.leader_user_id ?? null,
        Number(winner.rotation_active ?? 1),
        teamId
      );
    } else {
      db.prepare(
        `INSERT INTO teams (team_id, name, service, sub_area_fraction, on_call_day_index, created_by, archived_at, sala, team_leader_name, leader_user_id, rotation_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        teamId,
        winner.name,
        winner.service,
        winner.sub_area_fraction ?? null,
        Number(winner.on_call_day_index ?? 0),
        winner.created_by ?? null,
        winner.archived_at ?? null,
        winner.sala ?? null,
        winner.team_leader_name ?? null,
        winner.leader_user_id ?? null,
        Number(winner.rotation_active ?? 1)
      );
    }
  }
}

function mergeClinicalUsers(db, incomingRows) {
  for (const row of incomingRows || []) {
    const handle = normalizeUsername(row?.username || '');
    const uid = String(row?.user_id || '');
    if (!uid || !handle || !isValidUsernameFormat(handle)) continue;

    const byHandle = db
      .prepare(`SELECT user_id FROM users WHERE username = ? COLLATE NOCASE`)
      .get(handle);
    if (byHandle && String(byHandle.user_id) !== uid) {
      db.prepare(
        `UPDATE users SET rank = ?, clinical_name = ?, sala = ?,
         is_program_admin = COALESCE(?, is_program_admin)
         WHERE user_id = ?`
      ).run(
        String(row.rank || 'R1'),
        row.clinical_name ?? null,
        row.sala ?? null,
        row.is_program_admin != null ? Number(row.is_program_admin) : null,
        String(byHandle.user_id)
      );
      continue;
    }

    const existing = db.prepare(`SELECT user_id FROM users WHERE user_id = ?`).get(uid);
    if (existing) {
      db.prepare(
        `UPDATE users SET username = ?, rank = ?, clinical_name = ?, sala = ?,
         is_program_admin = COALESCE(?, is_program_admin)
         WHERE user_id = ?`
      ).run(
        handle,
        String(row.rank || 'R1'),
        row.clinical_name ?? null,
        row.sala ?? null,
        row.is_program_admin != null ? Number(row.is_program_admin) : null,
        uid
      );
      continue;
    }

    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala, is_program_admin)
       VALUES (?, ?, '', ?, '', '', ?, ?, ?)`
    ).run(
      uid,
      handle,
      String(row.rank || 'R1'),
      row.clinical_name ?? null,
      row.sala ?? null,
      row.is_program_admin != null ? Number(row.is_program_admin) : 0
    );
  }
}

/** @param {import('better-sqlite3').Database} db @param {string} userId */
function stubUsernameForLanUserId(db, userId) {
  const uid = String(userId || '').trim();
  const compact = uid.replace(/-/g, '').toLowerCase();
  let base = ('peer_' + compact.slice(0, 20)).replace(/[^a-z0-9_]/g, 'x');
  if (!isValidUsernameFormat(base)) base = 'peer_' + compact.slice(0, 8).replace(/[^a-z0-9]/g, 'x') || 'peer_user';
  let candidate = base;
  let n = 2;
  while (
    db.prepare(`SELECT 1 AS ok FROM users WHERE username = ? COLLATE NOCASE AND user_id <> ?`).get(
      candidate,
      uid
    )
  ) {
    candidate = base.slice(0, 28) + '_' + String(n);
    n += 1;
  }
  return candidate;
}

/**
 * 6.5.6 peers export teams/membership but not clinical_users — stub missing user_ids
 * so FK team_membership → users does not abort the whole LAN merge.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} incoming
 */
function ensureStubLanUsersReferenced(db, incoming) {
  const needed = new Set();
  for (const row of incoming?.team_membership || []) {
    const uid = String(row?.user_id || '').trim();
    if (uid) needed.add(uid);
  }
  for (const row of incoming?.teams || []) {
    for (const key of ['created_by', 'leader_user_id']) {
      const uid = String(row?.[key] || '').trim();
      if (uid) needed.add(uid);
    }
  }
  for (const row of incoming?.team_guardia_today || []) {
    const uid = String(row?.user_id || '').trim();
    if (uid) needed.add(uid);
  }
  for (const row of incoming?.active_guardias || []) {
    const uid = String(row?.covering_user_id || '').trim();
    if (uid) needed.add(uid);
  }
  for (const row of incoming?.entrega_template_user || []) {
    const uid = String(row?.user_id || '').trim();
    if (uid) needed.add(uid);
  }
  for (const row of incoming?.entrega_template_team || []) {
    const uid = String(row?.created_by || '').trim();
    if (uid) needed.add(uid);
  }
  if (!needed.size) return;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala, is_program_admin)
     VALUES (?, ?, '', 'R1', '', '', NULL, NULL, 0)`
  );

  for (const uid of needed) {
    const exists = db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid);
    if (exists) continue;
    insert.run(uid, stubUsernameForLanUserId(db, uid));
  }
}

function mergeEntregaTemplateUser(db, localRows, incomingRows) {
  const localById = indexBy(localRows, 'template_id');
  const incomingById = indexBy(incomingRows, 'template_id');
  const allIds = new Set([...localById.keys(), ...incomingById.keys()]);

  for (const templateId of allIds) {
    const winner = pickLastWriteRow(localById.get(templateId), incomingById.get(templateId), 'created_at');
    if (!winner?.user_id) continue;

    const existing = db
      .prepare(`SELECT template_id FROM entrega_template_user WHERE template_id = ?`)
      .get(templateId);
    if (existing) {
      db.prepare(
        `UPDATE entrega_template_user SET user_id = ?, name = ?, payload_json = ? WHERE template_id = ?`
      ).run(String(winner.user_id), winner.name, winner.payload_json, templateId);
    } else {
      try {
        db.prepare(
          `INSERT INTO entrega_template_user (template_id, user_id, name, payload_json, created_at)
           VALUES (?, ?, ?, ?, COALESCE(?, datetime('now')))`
        ).run(
          templateId,
          String(winner.user_id),
          winner.name,
          winner.payload_json,
          winner.created_at ? String(winner.created_at) : null
        );
      } catch (_err) {
        /* skip rows whose user_id still cannot be satisfied */
      }
    }
  }
}

function mergeEntregaTemplateTeam(db, localRows, incomingRows) {
  const localById = indexBy(localRows, 'template_id');
  const incomingById = indexBy(incomingRows, 'template_id');
  const allIds = new Set([...localById.keys(), ...incomingById.keys()]);

  for (const templateId of allIds) {
    const winner = pickLastWriteRow(localById.get(templateId), incomingById.get(templateId), 'created_at');
    if (!winner?.team_id) continue;

    const existing = db
      .prepare(`SELECT template_id FROM entrega_template_team WHERE template_id = ?`)
      .get(templateId);
    if (existing) {
      db.prepare(
        `UPDATE entrega_template_team
         SET team_id = ?, name = ?, payload_json = ?, created_by = ?
         WHERE template_id = ?`
      ).run(
        String(winner.team_id),
        winner.name,
        winner.payload_json,
        winner.created_by ?? null,
        templateId
      );
    } else {
      try {
        db.prepare(
          `INSERT INTO entrega_template_team
             (template_id, team_id, name, payload_json, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`
        ).run(
          templateId,
          String(winner.team_id),
          winner.name,
          winner.payload_json,
          winner.created_by ?? null,
          winner.created_at ? String(winner.created_at) : null
        );
      } catch (_err) {
        /* skip rows whose team_id still cannot be satisfied */
      }
    }
  }
}

function mergeTeamMembership(db, incomingRows) {
  const stmt = db.prepare(
    `INSERT INTO team_membership (team_id, user_id, sub_area_fraction) VALUES (?, ?, ?)
     ON CONFLICT(team_id, user_id) DO UPDATE SET
       sub_area_fraction = COALESCE(excluded.sub_area_fraction, team_membership.sub_area_fraction)`
  );
  for (const row of incomingRows) {
    if (!row?.team_id || !row?.user_id) continue;
    try {
      stmt.run(
        String(row.team_id),
        String(row.user_id),
        row.sub_area_fraction != null ? String(row.sub_area_fraction) : null
      );
    } catch (_err) {
      /* skip rows whose user_id still cannot be satisfied */
    }
  }
}

function mergePatientTeamAssignments(db, incomingRows) {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO patient_team_assignment (patient_id, team_id, effective_at, created_at)
     VALUES (?, ?, ?, COALESCE(?, datetime('now')))`
  );
  for (const row of incomingRows) {
    if (!row?.patient_id || !row?.team_id || !row?.effective_at) continue;
    stmt.run(
      String(row.patient_id),
      String(row.team_id),
      String(row.effective_at),
      row.created_at ? String(row.created_at) : null
    );
  }
}

function mergeTeamGuardiaToday(db, localRows, incomingRows) {
  const localByTeam = indexBy(localRows, 'team_id');
  const incomingByTeam = indexBy(incomingRows, 'team_id');
  const allTeams = new Set([...localByTeam.keys(), ...incomingByTeam.keys()]);

  for (const teamId of allTeams) {
    const winner = pickLastWriteRow(localByTeam.get(teamId), incomingByTeam.get(teamId), 'declared_at');
    if (!winner?.user_id) continue;
    setTeamGuardiaToday(db, teamId, String(winner.user_id));
  }
}

function mergeActiveGuardias(db, localRows, incomingRows) {
  const localByPatient = indexBy(localRows, 'patient_id');
  const incomingByPatient = indexBy(incomingRows, 'patient_id');
  const allPatients = new Set([...localByPatient.keys(), ...incomingByPatient.keys()]);

  for (const patientId of allPatients) {
    const winner = pickLastWriteRow(
      localByPatient.get(patientId),
      incomingByPatient.get(patientId),
      'assigned_at'
    );
    if (!winner) continue;
    upsertActiveGuardia(db, {
      patientId,
      coveringUserId: String(winner.covering_user_id || ''),
      sourceTeamId: String(winner.source_team_id || ''),
      guardiaId: winner.guardia_id ? String(winner.guardia_id) : undefined,
      isCritical: winner.is_critical,
      pendientesJson: winner.pendientes_json,
      vitalsFrequency: winner.vitals_frequency,
      lastVitalsCheck: winner.last_vitals_check ? String(winner.last_vitals_check) : undefined,
    });
  }
}

function indexBy(rows, key) {
  const map = new Map();
  for (const row of rows || []) {
    if (row && row[key] != null) map.set(String(row[key]), row);
  }
  return map;
}

function pickLastWriteRow(localRow, incomingRow, tsField) {
  if (!localRow) return incomingRow || null;
  if (!incomingRow) return localRow;
  const a = String(localRow[tsField] || '');
  const b = String(incomingRow[tsField] || '');
  return b >= a ? incomingRow : localRow;
}
