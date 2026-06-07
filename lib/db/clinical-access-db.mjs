import crypto from 'node:crypto';
import { verifyAdminAccessCode } from '../admin-access-code.mjs';
import {
  completePendienteItem,
  normalizePendientesJson,
  serializePendientesJson,
} from '../entrega/entrega-pendientes.mjs';
import { canManageTeamRoster } from './clinical-privileges.mjs';
import {
  isLanDirectoryPendingUsername,
  isValidUsernameFormat,
  normalizeUsername,
} from './clinical-username.mjs';
import { getBlob } from './clinical-blobs.mjs';

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ clientId: string, rank?: string, clinicalName?: string, sala?: string }} opts
 */
export function ensureClinicalUser(db, { clientId, rank = 'R1', clinicalName, sala }) {
  const username = String(clientId || 'local-device').slice(0, 64);
  const allowed = new Set(['R1', 'R2', 'R3', 'R4', 'Admin']);
  const safeRank = allowed.has(rank) ? rank : 'R1';

  const existing = db
    .prepare(
      'SELECT user_id, username, rank, public_key, encrypted_private_key FROM users WHERE username = ?'
    )
    .get(username);

  if (existing) {
    const row = db
      .prepare(
        'SELECT user_id, username, rank, public_key, encrypted_private_key, is_program_admin FROM users WHERE user_id = ?'
      )
      .get(existing.user_id);
    // Update clinical_name and sala if provided
    if (clinicalName != null || sala != null) {
      const sets = [];
      const vals = [];
      if (clinicalName != null) { sets.push('clinical_name = ?'); vals.push(clinicalName); }
      if (sala != null) { sets.push('sala = ?'); vals.push(sala); }
      vals.push(existing.user_id);
      db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE user_id = ?`).run(...vals);
    }
    return {
      userId: row.user_id,
      username: row.username,
      rank: row.rank,
      isProgramAdmin: row.is_program_admin === 1,
      publicKeyPem: row.public_key,
      privateKeyPem: row.encrypted_private_key,
    };
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const userId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, username, 'local-device', safeRank, publicKey, privateKey,
    clinicalName || null,
    sala || null
  );

  return {
    userId,
    username,
    rank: safeRank,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

/** @param {object} row */
function mapClinicalUserRow(row) {
  return {
    userId: row.user_id,
    username: row.username,
    rank: row.rank,
    isProgramAdmin: row.is_program_admin === 1,
    publicKeyPem: row.public_key,
    privateKeyPem: row.encrypted_private_key,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} username
 */
export function findClinicalUserByUsername(db, username) {
  const handle = normalizeUsername(username);
  if (!isValidUsernameFormat(handle)) return null;
  const row = db
    .prepare(
      `SELECT user_id, username, rank, public_key, encrypted_private_key, is_program_admin
       FROM users WHERE username = ?`
    )
    .get(handle);
  return row ? mapClinicalUserRow(row) : null;
}

/**
 * Prefer a previously bound clinical identity (user id / LAN handle) over a fresh device row.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   clientId: string,
 *   rank?: string,
 *   clinicalName?: string,
 *   sala?: string,
 *   preferredUserId?: string,
 *   preferredUsername?: string,
 * }} opts
 */
export function resolveBootstrapClinicalUser(db, opts) {
  const preferredUsername = opts.preferredUsername
    ? normalizeUsername(String(opts.preferredUsername))
    : '';
  if (preferredUsername && isValidUsernameFormat(preferredUsername)) {
    const byHandle = findClinicalUserByUsername(db, preferredUsername);
    if (byHandle) return byHandle;
  }

  const preferredUserId = String(opts.preferredUserId || '').trim();
  if (preferredUserId) {
    const row = db
      .prepare(
        `SELECT user_id, username, rank, public_key, encrypted_private_key, is_program_admin
         FROM users WHERE user_id = ?`
      )
      .get(preferredUserId);
    if (row) {
      const mapped = mapClinicalUserRow(row);
      if (
        !preferredUsername ||
        normalizeUsername(mapped.username) === preferredUsername
      ) {
        return mapped;
      }
    }
  }

  return ensureClinicalUser(db, {
    clientId: opts.clientId,
    rank: opts.rank,
    clinicalName: opts.clinicalName,
    sala: opts.sala,
  });
}

/**
 * Attach session to an existing LAN username (no device-row fallback).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} username
 */
export function attachClinicalIdentityByUsername(db, username) {
  const handle = normalizeUsername(username);
  if (!isValidUsernameFormat(handle)) {
    throw new Error('Usuario inválido.');
  }
  const user = findClinicalUserByUsername(db, handle);
  if (!user) {
    throw new Error('No encontramos ese usuario en esta base de datos.');
  }
  return user;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} [userId]
 */
/**
 * @param {import('better-sqlite3').Database} db
 */
export function listClinicalUsers(db) {
  return db
    .prepare(`SELECT user_id, username, rank, clinical_name, sala FROM users ORDER BY username`)
    .all();
}

/**
 * Users visible in the LAN directory: registered @handles plus teammates
 * synced from LAN who have a clinical name but have not claimed @usuario yet.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function listLanDirectoryUsers(db) {
  const onActiveTeam = db
    .prepare(
      `SELECT 1 AS ok FROM team_membership tm
       JOIN teams t ON t.team_id = tm.team_id
       WHERE tm.user_id = ? AND t.archived_at IS NULL
       LIMIT 1`
    )
    .pluck(true);

  /** @type {Map<string, object>} */
  const byId = new Map();

  for (const row of listClinicalUsers(db)) {
    const handle = normalizeUsername(row?.username || '');
    const uid = String(row.user_id || '');
    if (!uid) continue;

    if (isValidUsernameFormat(handle) && !isLanDirectoryPendingUsername(handle)) {
      byId.set(uid, { ...row, username: handle, lanDirectoryPending: false });
      continue;
    }

    const clinicalName = String(row.clinical_name || '').trim();
    const onTeam = !!onActiveTeam.get(uid);
    if (!onTeam && !clinicalName) continue;

    byId.set(uid, {
      ...row,
      username: handle,
      lanDirectoryPending: isLanDirectoryPendingUsername(handle) || !clinicalName,
    });
  }

  return [...byId.values()].sort((a, b) => {
    const ha = normalizeUsername(a.username || '');
    const hb = normalizeUsername(b.username || '');
    if (ha && hb) return ha.localeCompare(hb);
    if (ha) return -1;
    if (hb) return 1;
    return String(a.clinical_name || '').localeCompare(String(b.clinical_name || ''), 'es');
  });
}

const META_LAN_DELETED_USER_IDS = 'lan_clinical_users_deleted';
const META_LAN_RESOLVED_GUARDIAS = 'lan_guardias_resolved';
const META_LAN_MEMBERSHIP_REMOVALS = 'lan_team_membership_removals';
const META_LAN_MEMBERSHIP_REJOINS = 'lan_team_membership_rejoins';
const META_LAN_ARCHIVED_TEAMS = 'lan_teams_archived';

/** @param {import('better-sqlite3').Database} db */
export function getLanMembershipRemovals(db) {
  const raw =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_LAN_MEMBERSHIP_REMOVALS)?.value ??
    '[]';
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        team_id: String(row?.team_id || '').trim(),
        user_id: String(row?.user_id || '').trim(),
        removed_at: String(row?.removed_at || '').trim(),
      }))
      .filter((row) => row.team_id && row.user_id && row.removed_at);
  } catch {
    return [];
  }
}

/** @param {import('better-sqlite3').Database} db @param {object[]} rows */
export function persistLanMembershipRemovals(db, rows) {
  const map = new Map();
  for (const row of rows || []) {
    const teamId = String(row?.team_id || '').trim();
    const userId = String(row?.user_id || '').trim();
    const removedAt = String(row?.removed_at || '').trim();
    if (!teamId || !userId || !removedAt) continue;
    const key = `${teamId}\0${userId}`;
    const prev = map.get(key);
    if (!prev || removedAt >= String(prev.removed_at || '')) {
      map.set(key, { team_id: teamId, user_id: userId, removed_at: removedAt });
    }
  }
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_LAN_MEMBERSHIP_REMOVALS, JSON.stringify([...map.values()]));
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} userId */
export function recordLanMembershipRemoval(db, teamId, userId) {
  const tid = String(teamId || '').trim();
  const uid = String(userId || '').trim();
  if (!tid || !uid) return;
  const next = getLanMembershipRemovals(db).filter(
    (row) => !(row.team_id === tid && row.user_id === uid)
  );
  next.push({ team_id: tid, user_id: uid, removed_at: new Date().toISOString() });
  persistLanMembershipRemovals(db, next);
}

/** @param {import('better-sqlite3').Database} db */
export function getLanMembershipRejoins(db) {
  const raw =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_LAN_MEMBERSHIP_REJOINS)?.value ??
    '[]';
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        team_id: String(row?.team_id || '').trim(),
        user_id: String(row?.user_id || '').trim(),
        joined_at: String(row?.joined_at || '').trim(),
      }))
      .filter((row) => row.team_id && row.user_id && row.joined_at);
  } catch {
    return [];
  }
}

/** @param {import('better-sqlite3').Database} db @param {object[]} rows */
export function persistLanMembershipRejoins(db, rows) {
  const map = new Map();
  for (const row of rows || []) {
    const teamId = String(row?.team_id || '').trim();
    const userId = String(row?.user_id || '').trim();
    const joinedAt = String(row?.joined_at || '').trim();
    if (!teamId || !userId || !joinedAt) continue;
    const key = `${teamId}\0${userId}`;
    const prev = map.get(key);
    if (!prev || joinedAt >= String(prev.joined_at || '')) {
      map.set(key, { team_id: teamId, user_id: userId, joined_at: joinedAt });
    }
  }
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_LAN_MEMBERSHIP_REJOINS, JSON.stringify([...map.values()]));
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} userId */
export function recordLanMembershipRejoin(db, teamId, userId) {
  const tid = String(teamId || '').trim();
  const uid = String(userId || '').trim();
  if (!tid || !uid) return;
  const next = getLanMembershipRejoins(db).filter(
    (row) => !(row.team_id === tid && row.user_id === uid)
  );
  next.push({ team_id: tid, user_id: uid, joined_at: new Date().toISOString() });
  persistLanMembershipRejoins(db, next);
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} userId */
export function clearLanMembershipRejoin(db, teamId, userId) {
  const tid = String(teamId || '').trim();
  const uid = String(userId || '').trim();
  if (!tid || !uid) return;
  const next = getLanMembershipRejoins(db).filter(
    (row) => !(row.team_id === tid && row.user_id === uid)
  );
  persistLanMembershipRejoins(db, next);
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} userId */
export function clearLanMembershipRemoval(db, teamId, userId) {
  const tid = String(teamId || '').trim();
  const uid = String(userId || '').trim();
  if (!tid || !uid) return;
  const next = getLanMembershipRemovals(db).filter(
    (row) => !(row.team_id === tid && row.user_id === uid)
  );
  persistLanMembershipRemovals(db, next);
}

/** @param {import('better-sqlite3').Database} db @param {object[]} removals */
export function applyLanMembershipRemovals(db, removals) {
  const stmt = db.prepare(`DELETE FROM team_membership WHERE team_id = ? AND user_id = ?`);
  for (const row of removals || []) {
    const tid = String(row?.team_id || '').trim();
    const uid = String(row?.user_id || '').trim();
    if (!tid || !uid) continue;
    stmt.run(tid, uid);
  }
}

/** @param {import('better-sqlite3').Database} db */
/** @param {import('better-sqlite3').Database} db */
export function getLanArchivedTeams(db) {
  const raw =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_LAN_ARCHIVED_TEAMS)?.value ??
    '[]';
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        team_id: String(row?.team_id || '').trim(),
        archived_at: String(row?.archived_at || '').trim(),
      }))
      .filter((row) => row.team_id && row.archived_at);
  } catch {
    return [];
  }
}

/** @param {import('better-sqlite3').Database} db @param {object[]} rows */
export function persistLanArchivedTeams(db, rows) {
  const map = new Map();
  for (const row of rows || []) {
    const teamId = String(row?.team_id || '').trim();
    const archivedAt = String(row?.archived_at || '').trim();
    if (!teamId || !archivedAt) continue;
    const prev = map.get(teamId);
    if (!prev || archivedAt >= String(prev.archived_at || '')) {
      map.set(teamId, { team_id: teamId, archived_at: archivedAt });
    }
  }
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_LAN_ARCHIVED_TEAMS, JSON.stringify([...map.values()]));
}

/** @param {import('better-sqlite3').Database} db @param {string} teamId @param {string} [archivedAt] */
export function recordLanTeamArchive(db, teamId, archivedAt) {
  const tid = String(teamId || '').trim();
  if (!tid) return;
  const at = String(archivedAt || '').trim() || new Date().toISOString();
  const next = getLanArchivedTeams(db).filter((row) => row.team_id !== tid);
  next.push({ team_id: tid, archived_at: at });
  persistLanArchivedTeams(db, next);
}

/** @returns {Array<{ patient_id: string, guardia_id?: string, assigned_at: string }>} */
export function getLanResolvedGuardias(db) {
  const raw =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_LAN_RESOLVED_GUARDIAS)?.value ??
    '[]';
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        patient_id: String(row?.patient_id || '').trim(),
        guardia_id: row?.guardia_id ? String(row.guardia_id) : undefined,
        assigned_at: String(row?.assigned_at || '').trim(),
      }))
      .filter((row) => row.patient_id && row.assigned_at);
  } catch {
    return [];
  }
}

/** @param {import('better-sqlite3').Database} db @param {Array<{ patient_id: string, guardia_id?: string, assigned_at: string }>} rows */
function persistLanResolvedGuardias(db, rows) {
  const byPatient = new Map();
  for (const row of rows || []) {
    const pid = String(row?.patient_id || '').trim();
    if (!pid) continue;
    const at = String(row?.assigned_at || '').trim();
    if (!at) continue;
    const prev = byPatient.get(pid);
    if (!prev || at >= String(prev.assigned_at || '')) {
      byPatient.set(pid, {
        patient_id: pid,
        guardia_id: row?.guardia_id ? String(row.guardia_id) : undefined,
        assigned_at: at,
      });
    }
  }
  const next = [...byPatient.values()].sort((a, b) =>
    String(a.assigned_at).localeCompare(String(b.assigned_at))
  );
  const capped = next.length > 200 ? next.slice(next.length - 200) : next;
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_LAN_RESOLVED_GUARDIAS, JSON.stringify(capped));
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ patient_id: string, guardia_id?: string, assigned_at: string }} row
 */
export function rememberLanResolvedGuardia(db, row) {
  const pid = String(row?.patient_id || '').trim();
  const at = String(row?.assigned_at || '').trim();
  if (!pid || !at) return;
  const next = getLanResolvedGuardias(db).filter((r) => String(r.patient_id) !== pid);
  next.push({
    patient_id: pid,
    guardia_id: row?.guardia_id ? String(row.guardia_id) : undefined,
    assigned_at: at,
  });
  persistLanResolvedGuardias(db, next);
}

/**
 * Union LAN entrega-resolution tombstones and apply to active rows on this device.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} incoming
 * @param {object} [localSnapshot]
 */
export function applyLanResolvedGuardiasFromSnapshot(db, incoming, localSnapshot = null) {
  const merged = persistLanResolvedGuardiasUnion(db, incoming, localSnapshot);
  let applied = 0;
  for (const row of merged) {
    const active = db
      .prepare(
        `SELECT guardia_id, assigned_at FROM active_guardias
         WHERE patient_id = ? AND status = 'Active'`
      )
      .get(row.patient_id);
    if (!active) continue;
    if (String(row.assigned_at || '') >= String(active.assigned_at || '')) {
      db.prepare(
        `UPDATE active_guardias SET status = 'Resolved', assigned_at = ? WHERE guardia_id = ?`
      ).run(row.assigned_at, active.guardia_id);
      applied += 1;
    }
  }
  return { applied, merged };
}

/** @param {import('better-sqlite3').Database} db @param {object} incoming @param {object} [localSnapshot] */
function persistLanResolvedGuardiasUnion(db, incoming, localSnapshot = null) {
  const lists = [
    getLanResolvedGuardias(db),
    ...(Array.isArray(localSnapshot?.active_guardias_resolved)
      ? [localSnapshot.active_guardias_resolved]
      : []),
    ...(Array.isArray(incoming?.active_guardias_resolved) ? [incoming.active_guardias_resolved] : []),
  ];
  const merged = [];
  const byPatient = new Map();
  for (const list of lists) {
    for (const row of list || []) {
      const pid = String(row?.patient_id || '').trim();
      const at = String(row?.assigned_at || '').trim();
      if (!pid || !at) continue;
      const prev = byPatient.get(pid);
      if (!prev || at >= String(prev.assigned_at || '')) {
        byPatient.set(pid, {
          patient_id: pid,
          guardia_id: row?.guardia_id ? String(row.guardia_id) : undefined,
          assigned_at: at,
        });
      }
    }
  }
  for (const row of byPatient.values()) merged.push(row);
  persistLanResolvedGuardias(db, merged);
  return merged;
}

export function getLanDeletedUserIds(db) {
  const raw =
    db.prepare(`SELECT value FROM app_meta WHERE key = ?`).get(META_LAN_DELETED_USER_IDS)?.value ??
    '[]';
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map((id) => String(id || '').trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

/** @param {import('better-sqlite3').Database} db @param {string[]} ids */
function persistLanDeletedUserIds(db, ids) {
  const unique = [...new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean))];
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(META_LAN_DELETED_USER_IDS, JSON.stringify(unique));
}

/** @param {import('better-sqlite3').Database} db @param {string} userId */
function addLanDeletedUserId(db, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return;
  const next = getLanDeletedUserIds(db);
  if (!next.includes(uid)) next.push(uid);
  persistLanDeletedUserIds(db, next);
}

/**
 * Drop FK references then remove the user row (no permission checks).
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 */
export function purgeClinicalUserFromDb(db, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return;
  if (!db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid)) return;

  db.prepare(`DELETE FROM active_guardias WHERE covering_user_id = ?`).run(uid);
  db.prepare(`DELETE FROM team_membership WHERE user_id = ?`).run(uid);
  db.prepare(`DELETE FROM team_guardia_today WHERE user_id = ?`).run(uid);
  db.prepare(`DELETE FROM entrega_template_user WHERE user_id = ?`).run(uid);
  db.prepare(`UPDATE teams SET created_by = NULL WHERE created_by = ?`).run(uid);
  db.prepare(`UPDATE teams SET leader_user_id = NULL WHERE leader_user_id = ?`).run(uid);
  db.prepare(`UPDATE rotation_cycles SET created_by = NULL WHERE created_by = ?`).run(uid);
  db.prepare(`UPDATE entrega_template_team SET created_by = NULL WHERE created_by = ?`).run(uid);
  if (tableExists(db, 'sala_interno_access')) {
    db.prepare(`UPDATE sala_interno_access SET rotated_by = NULL WHERE rotated_by = ?`).run(uid);
  }
  db.prepare(`DELETE FROM users WHERE user_id = ?`).run(uid);
  purgeLanMembershipMetaForUser(db, uid);
}

/** Drop LAN leave/rejoin meta rows for a purged or deleted user. */
export function purgeLanMembershipMetaForUser(db, userId) {
  const uid = String(userId || '').trim();
  if (!uid) return;
  const dropUser = (rows) =>
    (rows || []).filter((row) => String(row?.user_id || '').trim() !== uid);
  persistLanMembershipRemovals(db, dropUser(getLanMembershipRemovals(db)));
  persistLanMembershipRejoins(db, dropUser(getLanMembershipRejoins(db)));
}

function tableExists(db, name) {
  return !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name);
}

/**
 * Admin removes a LAN directory user on this Mac; tombstone prevents LAN merge from re-adding.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ targetUserId: string, callerUserId: string }} opts
 */
/**
 * Union LAN tombstones and purge deleted users so peers cannot re-add via merge.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} incoming
 * @param {object} [localSnapshot]
 */
export function applyLanDeletedUsersFromSnapshot(db, incoming, localSnapshot = null) {
  const localIds = Array.isArray(localSnapshot?.clinical_users_deleted)
    ? localSnapshot.clinical_users_deleted
    : getLanDeletedUserIds(db);
  const incomingIds = Array.isArray(incoming?.clinical_users_deleted)
    ? incoming.clinical_users_deleted
    : [];
  const resurrected = new Set(
    (incoming?.clinical_users || [])
      .map((row) => String(row?.user_id || '').trim())
      .filter(Boolean)
  );
  const merged = [
    ...new Set(
      [...getLanDeletedUserIds(db), ...localIds, ...incomingIds]
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    ),
  ];
  persistLanDeletedUserIds(db, merged);
  let purged = 0;
  let resurrectedCount = 0;
  for (const uid of merged) {
    if (resurrected.has(uid)) {
      resurrectedCount += 1;
      continue;
    }
    db.prepare(`DELETE FROM team_membership WHERE user_id = ?`).run(uid);
    const had = db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid);
    purgeClinicalUserFromDb(db, uid);
    if (had) purged += 1;
  }
  return { purged, resurrected: resurrectedCount };
}

export function deleteLanDirectoryUser(db, { targetUserId, callerUserId }) {
  const caller = getClinicalProfile(db, String(callerUserId || ''));
  if (!canManageTeamRoster(caller)) {
    throw new Error(
      'Solo R4, Admin o usuarios con privilegios de administración pueden eliminar usuarios LAN.'
    );
  }
  const uid = String(targetUserId || '').trim();
  const callerId = String(callerUserId || '').trim();
  if (!uid) throw new Error('Usuario no indicado.');
  if (callerId && uid === callerId) {
    throw new Error('No puedes eliminar tu propio usuario clínico en esta Mac.');
  }
  if (!db.prepare(`SELECT 1 AS ok FROM users WHERE user_id = ?`).get(uid)) {
    throw new Error('Usuario no encontrado en esta Mac.');
  }

  const memberships = db
    .prepare(`SELECT team_id FROM team_membership WHERE user_id = ?`)
    .all(uid);
  for (const row of memberships) {
    recordLanMembershipRemoval(db, String(row.team_id || ''), uid);
  }
  db.prepare(`DELETE FROM team_membership WHERE user_id = ?`).run(uid);

  addLanDeletedUserId(db, uid);
  purgeClinicalUserFromDb(db, uid);
  return { userId: uid, deleted: true };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   patientId: string,
 *   coveringUserId: string,
 *   sourceTeamId: string,
 *   guardiaId?: string,
 *   isCritical?: number|boolean,
 *   pendientesJson?: string,
 *   vitalsFrequency?: string,
 *   lastVitalsCheck?: string,
 * }} opts
 */
export function upsertActiveGuardia(db, opts) {
  const patientId = String(opts.patientId || '');
  const coveringUserId = String(opts.coveringUserId || '');
  const sourceTeamId = String(opts.sourceTeamId || '');
  if (!patientId || !coveringUserId || !sourceTeamId) {
    throw new Error('patientId, coveringUserId, and sourceTeamId are required');
  }

  const allowedFreq = new Set(['1h', '2h', '4h', 'Shift_Once', 'None']);
  const vitalsFrequency = allowedFreq.has(String(opts.vitalsFrequency))
    ? String(opts.vitalsFrequency)
    : 'None';

  const existing = db
    .prepare(
      `SELECT guardia_id FROM active_guardias WHERE patient_id = ? AND status = 'Active' LIMIT 1`
    )
    .get(patientId);

  const guardiaId = opts.guardiaId
    ? String(opts.guardiaId)
    : existing?.guardia_id
      ? String(existing.guardia_id)
      : crypto.randomUUID();

  const isCritical = opts.isCritical ? 1 : 0;
  const pendientesJson =
    opts.pendientesJson != null ? String(opts.pendientesJson) : '[]';
  const lastVitalsCheck = opts.lastVitalsCheck || new Date().toISOString();

  if (existing || opts.guardiaId) {
    db.prepare(
      `UPDATE active_guardias
       SET covering_user_id = ?,
           source_team_id = ?,
           is_critical = ?,
           pendientes_json = ?,
           vitals_frequency = ?,
           last_vitals_check = ?,
           status = 'Active'
       WHERE guardia_id = ?`
    ).run(
      coveringUserId,
      sourceTeamId,
      isCritical,
      pendientesJson,
      vitalsFrequency,
      lastVitalsCheck,
      guardiaId
    );
  } else {
    db.prepare(
      `INSERT INTO active_guardias (
         guardia_id, patient_id, covering_user_id, source_team_id,
         is_critical, pendientes_json, vitals_frequency, last_vitals_check, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')`
    ).run(
      guardiaId,
      patientId,
      coveringUserId,
      sourceTeamId,
      isCritical,
      pendientesJson,
      vitalsFrequency,
      lastVitalsCheck
    );
  }

  return db
    .prepare(
      `SELECT guardia_id, patient_id, covering_user_id, source_team_id, is_critical,
              pendientes_json, vitals_frequency, last_vitals_check, assigned_at, status
       FROM active_guardias WHERE guardia_id = ?`
    )
    .get(guardiaId);
}

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
export function getClinicalProfile(db, userId) {
  return db.prepare(
    'SELECT user_id, username, rank, clinical_name, sala, is_program_admin FROM users WHERE user_id = ?'
  ).get(userId) || null;
}

export function claimUsername(db, { userId, username }) {
  const uid = String(userId || '');
  const handle = normalizeUsername(username);
  if (!uid) throw new Error('Usuario no válido.');
  if (!isValidUsernameFormat(handle)) {
    throw new Error('Usuario inválido. Usa 3–32 caracteres: a-z, 0-9, _.');
  }
  const taken = db
    .prepare('SELECT user_id FROM users WHERE username = ? AND user_id != ?')
    .get(handle, uid);
  if (taken) throw new Error('Ese usuario ya está en uso.');
  db.prepare('UPDATE users SET username = ? WHERE user_id = ?').run(handle, uid);
  return getClinicalProfile(db, uid);
}

export function upsertClinicalProfile(
  db,
  { userId, clinicalName, rank, sala, username, isProgramAdmin, adminAccessCode }
) {
  const existing = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId);
  if (existing) {
    const adminProvided = isProgramAdmin !== undefined && isProgramAdmin !== null;
    const adminFlag = adminProvided
      ? isProgramAdmin === true || isProgramAdmin === 1 || isProgramAdmin === '1'
        ? 1
        : 0
      : null;
    if (adminProvided && adminFlag === 1) {
      const currentAdmin = db
        .prepare('SELECT is_program_admin FROM users WHERE user_id = ?')
        .get(userId);
      if (!currentAdmin || currentAdmin.is_program_admin !== 1) {
        if (!verifyAdminAccessCode(adminAccessCode)) {
          throw new Error('Código de administración incorrecto.');
        }
      }
    }
    if (adminProvided) {
      db.prepare(`
        UPDATE users SET clinical_name = @clinicalName, rank = @rank, sala = @sala,
          is_program_admin = @isProgramAdmin
        WHERE user_id = @userId
      `).run({
        userId,
        clinicalName: clinicalName || null,
        rank,
        sala: sala || null,
        isProgramAdmin: adminFlag,
      });
    } else {
      db.prepare(`
        UPDATE users SET clinical_name = @clinicalName, rank = @rank, sala = @sala
        WHERE user_id = @userId
      `).run({ userId, clinicalName: clinicalName || null, rank, sala: sala || null });
    }
    if (username != null && String(username).trim()) {
      claimUsername(db, { userId, username });
    }
  } else {
    db.prepare(`
      INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
      VALUES (@userId, @username, '', @rank, '', '', @clinicalName, @sala)
    `).run({ userId, username: userId, rank, clinicalName: clinicalName || null, sala: sala || null });
  }
  return getClinicalProfile(db, userId);
}

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
  db.prepare(`UPDATE teams SET archived_at = ?, rotation_active = 0 WHERE archived_at IS NULL`).run(now);
  db.prepare(`DELETE FROM active_guardias`).run();
  db.prepare(`DELETE FROM team_guardia_today`).run();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} patientId
 */
export function ensureClinicalPatientRow(db, patientId) {
  const id = String(patientId || '').trim();
  if (!id) return;
  db.prepare(`INSERT OR IGNORE INTO patients (id) VALUES (?)`).run(id);
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function fetchPatientTeamAssignments(db) {
  return db
    .prepare(
      `SELECT patient_id, team_id, effective_at, created_at
       FROM patient_team_assignment
       ORDER BY created_at`
    )
    .all();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ patientId: string, teamId: string, effectiveAt: string }} opts
 */
export function assignPatientToTeam(db, { patientId, teamId, effectiveAt }) {
  ensureClinicalPatientRow(db, patientId);
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
              p.id, p.interconsult_type, p.prognosis_classification, p.negativa_maniobras_firmada
       FROM patient_team_assignment pta
       JOIN patients p ON p.id = pta.patient_id
       WHERE ? >= ? AND ? < pta.effective_at`
    )
    .all(nowIso, cycle.preview_start_at, nowIso);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ name: string, service: string, onCallDayIndex: number, subAreaFraction?: string, sala?: string|null, teamLeaderName?: string|null, createdBy?: string, leaderUserId?: string }} opts
 */
export function createTeam(db, { name, service, onCallDayIndex, subAreaFraction, sala, teamLeaderName, createdBy, leaderUserId }) {
  const teamId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO teams (team_id, name, service, sub_area_fraction, on_call_day_index, sala, team_leader_name, created_by, leader_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    teamId,
    String(name),
    String(service),
    subAreaFraction ?? null,
    Number(onCallDayIndex),
    sala ?? null,
    teamLeaderName ?? null,
    createdBy ?? null,
    leaderUserId ?? createdBy ?? null
  );
  return {
    team_id: teamId,
    name: String(name),
    service: String(service),
    sub_area_fraction: subAreaFraction ?? null,
    on_call_day_index: Number(onCallDayIndex),
    sala: sala ?? null,
    team_leader_name: teamLeaderName ?? null,
    created_by: createdBy ?? null,
    leader_user_id: leaderUserId ?? createdBy ?? null,
    rotation_active: 1,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function listActiveTeams(db) {
  return db
    .prepare(
      `SELECT team_id, name, service, sub_area_fraction, on_call_day_index, created_by, archived_at, sala, team_leader_name, leader_user_id, rotation_active
       FROM teams
       WHERE archived_at IS NULL
       ORDER BY name`
    )
    .all();
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
export function countTeamsInEffectiveSala(db, sala) {
  const target = String(sala || '').trim();
  if (!target) return 0;
  return listActiveTeams(db).filter((team) => effectiveTeamSala(db, team) === target).length;
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

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ username?: string }} opts
 */
/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} code
 */
export function resolveTeamByInviteCode(db, code) {
  const norm = String(code || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9]/g, '');
  if (norm.length < 6) return null;
  const matches = listActiveTeams(db).filter((team) => {
    const id = String(team.team_id || '')
      .replace(/-/g, '')
      .toLowerCase();
    return id === norm || id.startsWith(norm);
  });
  if (matches.length !== 1) return null;
  return withEffectiveTeamSala(db, {
    ...matches[0],
    members: listTeamMembers(db, matches[0].team_id),
  });
}

export function resolveClinicalUserByUsername(db, { username }) {
  const handle = normalizeUsername(username);
  if (!handle) return null;
  const exact = db
    .prepare(
      `SELECT user_id, username, rank, clinical_name FROM users WHERE username = ? COLLATE NOCASE`
    )
    .get(handle);
  if (exact) return exact;
  const prefix = db
    .prepare(
      `SELECT user_id, username, rank, clinical_name FROM users WHERE username LIKE ? LIMIT 5`
    )
    .all(`${handle}%`);
  if (prefix.length === 1) return prefix[0];
  return null;
}

/**
 * Patient ids present in the local census blob (not LAN assignment stubs).
 * @param {import('better-sqlite3').Database} db
 * @returns {Set<string>}
 */
export function loadCensusPatientIdSet(db) {
  const ids = new Set();
  try {
    const raw = getBlob(db, 'patients');
    if (!raw) return ids;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return ids;
    for (const row of list) {
      const id = String(row?.id || '').trim();
      if (id) ids.add(id);
    }
  } catch (_e) {}
  return ids;
}

/**
 * Active patient assignments per team (latest effective_at <= now per patient).
 * Counts only patients that exist in the local census blob on this device.
 * @param {import('better-sqlite3').Database} db
 * @param {string} [nowIso]
 * @param {Set<string>} [censusIds]
 * @returns {Map<string, number>}
 */
export function buildActivePatientCountByTeam(db, nowIso = new Date().toISOString(), censusIds) {
  const nowMs = new Date(nowIso).getTime();
  const census =
    censusIds === null ? null : censusIds instanceof Set ? censusIds : loadCensusPatientIdSet(db);
  const bestByPatient = new Map();
  for (const row of fetchPatientTeamAssignments(db)) {
    const patientId = String(row?.patient_id || '');
    const teamId = String(row?.team_id || '');
    if (!patientId || !teamId) continue;
    if (census && !census.has(patientId)) continue;
    const effMs = new Date(row.effective_at).getTime();
    if (!Number.isFinite(effMs) || effMs > nowMs) continue;
    const createdMs = new Date(row.created_at || row.effective_at).getTime();
    const prev = bestByPatient.get(patientId);
    if (
      !prev ||
      effMs > prev.effMs ||
      (effMs === prev.effMs && createdMs >= prev.createdMs)
    ) {
      bestByPatient.set(patientId, { teamId, effMs, createdMs });
    }
  }
  const counts = new Map();
  for (const { teamId } of bestByPatient.values()) {
    counts.set(teamId, (counts.get(teamId) || 0) + 1);
  }
  return counts;
}

/**
 * LAN assignment rows per team (includes stubs without a local census chart).
 * @param {import('better-sqlite3').Database} db
 * @param {string} [nowIso]
 * @returns {Map<string, number>}
 */
export function buildLanAssignmentCountByTeam(db, nowIso = new Date().toISOString()) {
  return buildActivePatientCountByTeam(db, nowIso, /** @type {null} */ (null));
}

export function listTeamsBySala(db, { sala, forUserId, allSalas } = {}) {
  const salaFilter = String(sala || '').trim();
  const uid = String(forUserId || '');
  const showAll = allSalas === true || salaFilter === '__all__';
  const patientCounts = buildActivePatientCountByTeam(db);
  const lanAssignmentCounts = buildLanAssignmentCountByTeam(db);
  return listActiveTeams(db)
    .filter((team) => {
      if (showAll || !salaFilter) return true;
      return effectiveTeamSala(db, team) === salaFilter;
    })
    .map((team) => {
      const members = listTeamMembers(db, team.team_id);
      let handle = '';
      if (uid) {
        const u = db.prepare('SELECT username FROM users WHERE user_id = ?').get(uid);
        handle = normalizeUsername(u?.username || '');
      }
      const isMember =
        uid || handle
          ? members.some((m) => {
              if (uid && String(m.user_id) === uid) return true;
              if (handle && normalizeUsername(m.username || '') === handle) return true;
              return false;
            })
          : false;
      let joinEligible = false;
      let joinReason = '';
      const teamSala = effectiveTeamSala(db, team);
      if (uid && !isMember) {
        const errors = validateSalaTeamMembership(db, {
          userId: uid,
          teamId: team.team_id,
          teamSala,
        });
        if (errors.length) joinReason = errors[0];
        else joinEligible = true;
      }
      return {
        ...withEffectiveTeamSala(db, team),
        members,
        guardia_today: getTeamGuardiaToday(db, team.team_id) ?? null,
        patientCount: patientCounts.get(team.team_id) || 0,
        lanAssignmentCount: lanAssignmentCounts.get(team.team_id) || 0,
        isMember,
        joinEligible,
        joinReason,
      };
    });
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 */
/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 * @param {{ subAreaFraction?: string|null }} [opts]
 */
export function joinTeam(db, teamId, userId, opts = {}) {
  addTeamMember(db, teamId, userId, opts);
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

export function validateSalaTeamMembership(db, { userId, teamId, teamSala }) {
  const errors = [];

  if (!userId || !teamId) {
    errors.push('Usuario o equipo no válido.');
    return errors;
  }

  let sala = String(teamSala || '').trim();
  if (!sala) {
    const row = db
      .prepare(`SELECT team_id, sala, created_by FROM teams WHERE team_id = ?`)
      .get(String(teamId));
    if (row) sala = effectiveTeamSala(db, row);
  }

  if (sala && userHasR1MembershipInEffectiveSala(db, userId, sala, teamId)) {
    errors.push('R1 ya pertenece a un equipo en esta Sala.');
  }

  const member = db.prepare(`SELECT rank FROM users WHERE user_id = ?`).get(userId);
  const rank = String(member?.rank || '');

  if (rank === 'R2') {
    const r2Teams = db.prepare(`
      SELECT COUNT(*) as cnt FROM team_membership tm
      JOIN users u ON u.user_id = tm.user_id
      WHERE tm.user_id = ? AND u.rank = 'R2'
    `).get(userId);
    if (r2Teams.cnt >= 1) {
      errors.push('R2 ya lidera un equipo.');
    }
  }

  if (sala && countTeamsInEffectiveSala(db, sala) >= 4) {
    errors.push('Ya hay 4 equipos en esta Sala (máximo).');
  }

  if (rank === 'R1') {
    const r1Count = db.prepare(`
      SELECT COUNT(*) as cnt FROM team_membership tm
      JOIN users u ON u.user_id = tm.user_id
      WHERE tm.team_id = ? AND u.rank = 'R1'
    `).get(teamId);
    if (r1Count.cnt >= 2) {
      errors.push('El equipo ya tiene 2 R1s (máximo).');
    }
  }

  return errors;
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
  rememberLanResolvedGuardia(db, {
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

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 * @param {{ subAreaFraction?: string|null }} [opts]
 */
export function addTeamMember(db, teamId, userId, opts = {}) {
  const tid = String(teamId || '');
  const uid = String(userId || '');
  const team = db
    .prepare(
      `SELECT team_id, sala, created_by, service, sub_area_fraction FROM teams WHERE team_id = ?`
    )
    .get(tid);
  if (!team) throw new Error('Equipo no encontrado.');

  const existing = db
    .prepare(`SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?`)
    .get(tid, uid);
  if (existing) {
    const fraction = opts.subAreaFraction ? String(opts.subAreaFraction).trim() : '';
    if (fraction) {
      db.prepare(
        `UPDATE team_membership SET sub_area_fraction = ? WHERE team_id = ? AND user_id = ?`
      ).run(fraction, tid, uid);
      return;
    }
    throw new Error('Ya es integrante de este equipo.');
  }

  const teamSala = effectiveTeamSala(db, team);
  const errors = validateSalaTeamMembership(db, { userId: uid, teamId: tid, teamSala });
  if (errors.length) throw new Error(errors.join(' '));

  const member = db.prepare(`SELECT rank FROM users WHERE user_id = ?`).get(uid);
  const rank = String(member?.rank || '');
  let fraction = opts.subAreaFraction ? String(opts.subAreaFraction).trim() : '';
  if (!fraction && rank === 'R2') {
    fraction = String(team.sub_area_fraction || '').trim();
  }

  clearLanMembershipRemoval(db, tid, uid);
  recordLanMembershipRejoin(db, tid, uid);
  db.prepare(
    `INSERT INTO team_membership (team_id, user_id, sub_area_fraction) VALUES (?, ?, ?)`
  ).run(tid, uid, fraction || null);

  if (rank === 'R2' && fraction) {
    db.prepare(`UPDATE teams SET sub_area_fraction = ? WHERE team_id = ?`).run(fraction, tid);
  }
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 */
/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 */
export function memberHasActiveGuardiaForTeam(db, teamId, userId) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM active_guardias
       WHERE status = 'Active' AND covering_user_id = ? AND source_team_id = ?`
    )
    .get(String(userId || ''), String(teamId || ''));
  return Number(row?.cnt || 0) > 0;
}

export function removeTeamMember(db, teamId, userId) {
  const tid = String(teamId || '');
  const uid = String(userId || '');
  if (memberHasActiveGuardiaForTeam(db, tid, uid)) {
    throw new Error(
      'No puedes salir del equipo: tienes entregas activas asignadas. Finalízalas antes.'
    );
  }
  recordLanMembershipRemoval(db, tid, uid);
  clearLanMembershipRejoin(db, tid, uid);
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

/**
 * Lightweight scope for interno mobile board (no incoming-assignments SQL).
 * @param {import('better-sqlite3').Database} db
 */
export function getInternoScopeContext(db) {
  const teams = listActiveTeams(db).map((team) => ({
    ...withEffectiveTeamSala(db, team),
    members: listTeamMembers(db, team.team_id),
  }));
  const salaGuardiaToday = db
    .prepare(`SELECT team_id, user_id, declared_at FROM team_guardia_today`)
    .all();
  return { teams, salaGuardiaToday };
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
    ...withEffectiveTeamSala(db, team),
    members: listTeamMembers(db, team.team_id),
  }));
  const guardias = fetchActiveGuardias(db, userId || undefined);
  const cycle = getActiveRotationCycle(db);
  let assignments = [];
  try {
    assignments = fetchPatientTeamAssignments(db);
  } catch (err) {
    console.error(
      '[clinical-scope] fetchPatientTeamAssignments failed:',
      err && err.message ? err.message : err
    );
  }
  const salaGuardiaToday = db
    .prepare(`SELECT team_id, user_id, declared_at FROM team_guardia_today`)
    .all();
  const users = listClinicalUsers(db);
  return {
    teams,
    guardias,
    cycle: cycle ?? null,
    assignments,
    salaGuardiaToday,
    users,
    now: nowIso,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} teamId
 * @param {string} userId
 */
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
            archived_at, sala, team_leader_name, leader_user_id, rotation_active
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
export function updateTeam(db, teamId, { name, sala, callerUserId }) {
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

  const teamsInSala = listActiveTeams(db).filter((row) => {
    if (String(row.team_id) === tid) return false;
    return effectiveTeamSala(db, row) === nextSala;
  }).length;
  if (teamsInSala >= 4) {
    throw new Error('Ya hay 4 equipos en esta Sala (máximo).');
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE teams SET name = ?, sala = ?, team_leader_name = ?, updated_at = ? WHERE team_id = ?`
  ).run(nextName, nextSala, nextName, now, tid);

  return {
    ...withEffectiveTeamSala(db, getTeamById(db, tid)),
    members: listTeamMembers(db, tid),
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
  recordLanTeamArchive(db, tid, now);
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

const INTERNO_SALAS = ['Sala 1', 'Sala 2', 'Sala E'];

/** @param {string} sala */
export function normalizeInternoSala(sala) {
  const s = String(sala || '').trim();
  return INTERNO_SALAS.includes(s) ? s : '';
}

/** @param {import('better-sqlite3').Database} db */
export function listSalaInternoAccess(db) {
  return db
    .prepare(
      `SELECT sala, access_token, is_active, rotated_at, rotated_by
       FROM sala_interno_access ORDER BY sala`
    )
    .all();
}

/** @param {import('better-sqlite3').Database} db @param {string} sala */
export function getSalaInternoAccess(db, sala) {
  const key = normalizeInternoSala(sala);
  if (!key) return null;
  return db
    .prepare(
      `SELECT sala, access_token, is_active, rotated_at, rotated_by
       FROM sala_interno_access WHERE sala = ?`
    )
    .get(key);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} sala
 * @param {string} [userId]
 */
export function rotateSalaInternoToken(db, sala, userId) {
  const key = normalizeInternoSala(sala);
  if (!key) throw new Error('Sala inválida.');
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE sala_interno_access
     SET access_token = ?, rotated_at = ?, rotated_by = ?, is_active = 1
     WHERE sala = ?`
  ).run(token, now, userId || null, key);
  return getSalaInternoAccess(db, key);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} sala
 * @param {boolean} active
 */
export function setSalaInternoActive(db, sala, active) {
  const key = normalizeInternoSala(sala);
  if (!key) throw new Error('Sala inválida.');
  db.prepare(`UPDATE sala_interno_access SET is_active = ? WHERE sala = ?`).run(
    active ? 1 : 0,
    key
  );
  return getSalaInternoAccess(db, key);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} token
 * @param {string} sala
 */
export function verifySalaInternoToken(db, token, sala) {
  const row = getSalaInternoAccess(db, sala);
  if (!row || row.is_active !== 1) return false;
  const a = String(token || '').trim();
  const b = String(row.access_token || '').trim();
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** @param {import('better-sqlite3').Database} db @param {string} patientId */
export function touchActiveGuardiaVitalsCheck(db, patientId) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE active_guardias SET last_vitals_check = ? WHERE patient_id = ? AND status = 'Active'`
  ).run(now, String(patientId || ''));
}

/**
 * @param {object|null|undefined} payload
 */
function normalizeEntregaTemplatePayload(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  return {
    kind: p.kind === 'imagen' ? 'imagen' : 'otro',
    label: String(p.label || '').trim(),
    requires: {
      familiar: !!p.requires?.familiar,
      consentimiento: !!p.requires?.consentimiento,
      anestesia: !!p.requires?.anestesia,
    },
    comentado: !!p.comentado,
    autorizado: !!p.autorizado,
    agendado: !!p.agendado,
  };
}

/** @param {string} raw */
function parseEntregaTemplatePayloadJson(raw) {
  try {
    const parsed = JSON.parse(String(raw || '{}'));
    return normalizeEntregaTemplatePayload(parsed);
  } catch {
    return normalizeEntregaTemplatePayload(null);
  }
}

/** @param {object} row */
function mapEntregaTemplateUserRow(row) {
  return {
    templateId: row.template_id,
    scope: 'user',
    userId: row.user_id,
    name: row.name,
    payload: parseEntregaTemplatePayloadJson(row.payload_json),
    createdAt: row.created_at,
  };
}

/** @param {object} row */
function mapEntregaTemplateTeamRow(row) {
  return {
    templateId: row.template_id,
    scope: 'team',
    teamId: row.team_id,
    name: row.name,
    payload: parseEntregaTemplatePayloadJson(row.payload_json),
    createdBy: row.created_by || null,
    createdAt: row.created_at,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ patientId: string, itemId: string, completedBy?: object }} opts
 */
export function completeActiveGuardiaPendiente(db, { patientId, itemId, completedBy }) {
  const pid = String(patientId || '');
  const iid = String(itemId || '');
  if (!pid || !iid) return null;

  const row = db
    .prepare(
      `SELECT guardia_id, pendientes_json FROM active_guardias
       WHERE patient_id = ? AND status = 'Active' LIMIT 1`
    )
    .get(pid);
  if (!row) return null;

  const norm = normalizePendientesJson(row.pendientes_json);
  if (!norm.items.some((it) => it.id === iid)) return null;

  const doc = completePendienteItem(row.pendientes_json, iid, completedBy);
  const item = doc.items.find((it) => it.id === iid);
  if (!item) return null;

  db.prepare(`UPDATE active_guardias SET pendientes_json = ? WHERE guardia_id = ?`).run(
    serializePendientesJson(doc),
    row.guardia_id
  );

  return item;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ userId: string, teamIds?: string[] }} opts
 */
export function listEntregaTemplates(db, { userId, teamIds = [] }) {
  const uid = String(userId || '');
  const userRows = uid
    ? db
        .prepare(
          `SELECT template_id, user_id, name, payload_json, created_at
           FROM entrega_template_user
           WHERE user_id = ?
           ORDER BY created_at DESC`
        )
        .all(uid)
    : [];

  const ids = [...new Set((teamIds || []).map((id) => String(id)).filter(Boolean))];
  let teamRows = [];
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(', ');
    teamRows = db
      .prepare(
        `SELECT template_id, team_id, name, payload_json, created_by, created_at
         FROM entrega_template_team
         WHERE team_id IN (${placeholders})
         ORDER BY created_at DESC`
      )
      .all(...ids);
  }

  return {
    user: userRows.map(mapEntregaTemplateUserRow),
    team: teamRows.map(mapEntregaTemplateTeamRow),
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ userId: string, templateId?: string, name: string, payload?: object }} opts
 */
export function saveEntregaTemplateUser(db, { userId, templateId, name, payload }) {
  const uid = String(userId || '');
  const label = String(name || '').trim();
  if (!uid || !label) throw new Error('userId and name are required');

  const payloadJson = JSON.stringify(normalizeEntregaTemplatePayload(payload));
  const id = templateId ? String(templateId) : crypto.randomUUID();

  if (templateId) {
    const result = db
      .prepare(
        `UPDATE entrega_template_user
         SET name = ?, payload_json = ?
         WHERE template_id = ? AND user_id = ?`
      )
      .run(label, payloadJson, id, uid);
    if (result.changes === 0) throw new Error('Plantilla de usuario no encontrada.');
  } else {
    db.prepare(
      `INSERT INTO entrega_template_user (template_id, user_id, name, payload_json)
       VALUES (?, ?, ?, ?)`
    ).run(id, uid, label, payloadJson);
  }

  const row = db
    .prepare(
      `SELECT template_id, user_id, name, payload_json, created_at
       FROM entrega_template_user WHERE template_id = ?`
    )
    .get(id);
  return mapEntregaTemplateUserRow(row);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ teamId: string, createdBy?: string, templateId?: string, name: string, payload?: object }} opts
 */
export function saveEntregaTemplateTeam(db, { teamId, createdBy, templateId, name, payload }) {
  const tid = String(teamId || '');
  const label = String(name || '').trim();
  if (!tid || !label) throw new Error('teamId and name are required');

  const payloadJson = JSON.stringify(normalizeEntregaTemplatePayload(payload));
  const id = templateId ? String(templateId) : crypto.randomUUID();
  const creator = createdBy ? String(createdBy) : null;

  if (templateId) {
    const result = db
      .prepare(
        `UPDATE entrega_template_team
         SET name = ?, payload_json = ?
         WHERE template_id = ? AND team_id = ?`
      )
      .run(label, payloadJson, id, tid);
    if (result.changes === 0) throw new Error('Plantilla de equipo no encontrada.');
  } else {
    db.prepare(
      `INSERT INTO entrega_template_team (template_id, team_id, name, payload_json, created_by)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, tid, label, payloadJson, creator);
  }

  const row = db
    .prepare(
      `SELECT template_id, team_id, name, payload_json, created_by, created_at
       FROM entrega_template_team WHERE template_id = ?`
    )
    .get(id);
  return mapEntregaTemplateTeamRow(row);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ scope: 'user'|'team', templateId: string }} opts
 */
export function deleteEntregaTemplate(db, { scope, templateId }) {
  const id = String(templateId || '');
  if (!id) return false;
  if (scope === 'team') {
    return db.prepare('DELETE FROM entrega_template_team WHERE template_id = ?').run(id).changes > 0;
  }
  if (scope === 'user') {
    return db.prepare('DELETE FROM entrega_template_user WHERE template_id = ?').run(id).changes > 0;
  }
  throw new Error('scope must be "user" or "team"');
}
