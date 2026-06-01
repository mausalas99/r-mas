import {
  archiveRotationAndTeams,
  upsertActiveGuardia,
  setTeamGuardiaToday,
} from './clinical-access-db.mjs';

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
  mergeTeams(db, local.teams || [], incoming.teams || []);
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
  let winner = null;
  for (const src of sources) {
    const snap = src && src.clinicalOps;
    if (!snap || typeof snap !== 'object') continue;
    if (!winner) {
      winner = snap;
      continue;
    }
    const a = String(snap.exportedAt || '');
    const b = String(winner.exportedAt || '');
    if (a > b) winner = snap;
  }
  return winner;
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

function mergeTeamMembership(db, incomingRows) {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO team_membership (team_id, user_id) VALUES (?, ?)`
  );
  for (const row of incomingRows) {
    if (!row?.team_id || !row?.user_id) continue;
    stmt.run(String(row.team_id), String(row.user_id));
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
