import crypto from 'node:crypto';
import { verifyAdminAccessCode } from '../admin-access-code.mjs';
import {
  isValidUsernameFormat,
  normalizeUsername,
} from './clinical-username.mjs';
import { reconcileTeamMembershipForSalaChange } from './clinical-access-teams-membership.mjs';
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

  // Prefer the device-bound user_id even when @usuario differs — claim/rename
  // happens after bootstrap. Matching username strictly used to spawn a second
  // peer_* row and orphan team memberships on every handle change.
  const preferredUserId = String(opts.preferredUserId || '').trim();
  if (preferredUserId) {
    const row = db
      .prepare(
        `SELECT user_id, username, rank, public_key, encrypted_private_key, is_program_admin
         FROM users WHERE user_id = ?`
      )
      .get(preferredUserId);
    if (row) return mapClinicalUserRow(row);
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
    .prepare(
      `SELECT user_id, username, rank, clinical_name, sala, last_activity_at, created_at
       FROM users ORDER BY username`
    )
    .all();
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} atIso
 * @param {string} source
 */
export function appendClinicalUserActivityLog(db, userId, atIso, source) {
  const uid = String(userId || '').trim();
  const iso = String(atIso || '').trim();
  const src = String(source || 'session').trim() || 'session';
  if (!uid || !iso) return false;
  if (!tableHasUserActivityLog(db)) return false;
  const exists = db
    .prepare(
      `SELECT 1 AS ok FROM user_activity_log WHERE user_id = ? AND at_iso = ? AND source = ? LIMIT 1`
    )
    .get(uid, iso, src);
  if (exists) return false;
  db.prepare(`INSERT INTO user_activity_log (user_id, at_iso, source) VALUES (?, ?, ?)`).run(
    uid,
    iso,
    src
  );
  return true;
}

/** @param {import('better-sqlite3').Database} db */
function tableHasUserActivityLog(db) {
  return !!db
    .prepare(`SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'user_activity_log'`)
    .get();
}

/**
 * Recent activity events per user (newest first).
 * @param {import('better-sqlite3').Database} db
 * @param {string[]} userIds
 * @param {number} [limitPerUser]
 * @returns {Map<string, Array<{ at: string, source: string }>>}
 */
export function listClinicalUserActivityHistoryByIds(db, userIds, limitPerUser = 12) {
  /** @type {Map<string, Array<{ at: string, source: string }>>} */
  const map = new Map();
  const ids = [...new Set((userIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length || !tableHasUserActivityLog(db)) return map;
  const placeholders = ids.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT user_id, at_iso, source FROM user_activity_log
       WHERE user_id IN (${placeholders})
       ORDER BY at_iso DESC`
    )
    .all(...ids);
  const limit = Math.max(1, Number(limitPerUser) || 12);
  for (const row of rows) {
    const uid = String(row.user_id || '');
    const list = map.get(uid) || [];
    if (list.length >= limit) continue;
    list.push({ at: String(row.at_iso || ''), source: String(row.source || '') });
    map.set(uid, list);
  }
  return map;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} userId
 * @param {string} [atIso]
 * @param {string} [source] session | save | claim | sync | seed_*
 */
export function touchClinicalUserActivity(db, userId, atIso, source = 'session') {
  const uid = String(userId || '').trim();
  if (!uid) return false;
  const iso = String(atIso || new Date().toISOString()).trim();
  const result = db
    .prepare(
      `UPDATE users SET last_activity_at = CASE
         WHEN last_activity_at IS NULL OR last_activity_at < ? THEN ?
         ELSE last_activity_at
       END
       WHERE user_id = ?`
    )
    .run(iso, iso, uid);
  appendClinicalUserActivityLog(db, uid, iso, source);
  return result.changes > 0;
}

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
  touchClinicalUserActivity(db, uid, undefined, 'claim');
  return getClinicalProfile(db, uid);
}

function parseProgramAdminFlag(isProgramAdmin) {
  if (isProgramAdmin === undefined || isProgramAdmin === null) return null;
  return isProgramAdmin === true || isProgramAdmin === 1 || isProgramAdmin === '1' ? 1 : 0;
}

function assertAdminPromotionAllowed(db, userId, adminFlag, adminAccessCode) {
  if (adminFlag !== 1) return;
  const currentAdmin = db
    .prepare('SELECT is_program_admin FROM users WHERE user_id = ?')
    .get(userId);
  if (currentAdmin?.is_program_admin === 1) return;
  if (!verifyAdminAccessCode(adminAccessCode)) {
    throw new Error('Código de administración incorrecto.');
  }
}

function updateExistingClinicalProfile(db, userId, fields) {
  const { clinicalName, rank, sala, adminFlag } = fields;
  if (adminFlag !== null) {
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
    return;
  }
  db.prepare(`
    UPDATE users SET clinical_name = @clinicalName, rank = @rank, sala = @sala
    WHERE user_id = @userId
  `).run({ userId, clinicalName: clinicalName || null, rank, sala: sala || null });
}

function insertClinicalProfile(db, userId, fields) {
  const { rank, clinicalName, sala } = fields;
  db.prepare(`
    INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
    VALUES (@userId, @username, '', @rank, '', '', @clinicalName, @sala)
  `).run({ userId, username: userId, rank, clinicalName: clinicalName || null, sala: sala || null });
}

export function upsertClinicalProfile(
  db,
  { userId, clinicalName, rank, sala, username, isProgramAdmin, adminAccessCode }
) {
  const existing = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(userId);
  const fields = { clinicalName, rank, sala, adminFlag: parseProgramAdminFlag(isProgramAdmin) };

  if (existing) {
    assertAdminPromotionAllowed(db, userId, fields.adminFlag, adminAccessCode);
    updateExistingClinicalProfile(db, userId, fields);
    reconcileTeamMembershipForSalaChange(db, userId, sala);
    if (username != null && String(username).trim()) {
      claimUsername(db, { userId, username });
    }
    // Profile edits (incl. admin/onboarding) must not stamp last_activity_at.
    // Real use: db:clinical-user-touch / clinical save-all actor only.
  } else {
    insertClinicalProfile(db, userId, fields);
  }
  return getClinicalProfile(db, userId);
}

export function findUserByPublicKey(db, publicKeyPem) {
  return db
    .prepare('SELECT user_id, username, rank, public_key FROM users WHERE public_key = ?')
    .get(publicKeyPem);
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

const CLINICAL_RANKS = new Set(['R1', 'R2', 'R3', 'R4', 'Admin']);

/** @param {{ username?: string, displayName?: string, rank?: string, sala?: string|null }} opts */
function parseCloudIdentityProvisionOpts(opts) {
  const handle = normalizeUsername(opts?.username || '');
  if (!isValidUsernameFormat(handle)) {
    throw new Error('Usuario inválido. Usa 3–32 caracteres: a-z, 0-9, _.');
  }
  return {
    handle,
    displayName: String(opts?.displayName || '').trim(),
    safeRank: CLINICAL_RANKS.has(String(opts?.rank || '')) ? String(opts.rank) : 'R1',
    sala: opts?.sala != null && String(opts.sala).trim() ? String(opts.sala).trim() : null,
  };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ user_id: string, clinical_name?: string|null }} existing
 * @param {string} displayName
 */
function provisionExistingCloudUser(db, existing, displayName) {
  const uid = String(existing.user_id);
  if (displayName && !String(existing.clinical_name || '').trim()) {
    db.prepare(`UPDATE users SET clinical_name = ? WHERE user_id = ?`).run(displayName, uid);
  }
  // Admin provision must not stamp last_activity_at — only real use does.
  return getClinicalProfile(db, uid);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ handle: string, safeRank: string, displayName: string, sala: string|null }} fields
 */
function insertCloudProvisionedUser(db, { handle, safeRank, displayName, sala }) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const userId = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key, clinical_name, sala)
     VALUES (?, ?, 'cloud-provisioned', ?, ?, ?, ?, ?)`
  ).run(userId, handle, safeRank, publicKey, privateKey, displayName || null, sala);
  return getClinicalProfile(db, userId);
}

/**
 * Ensure a clinical user row exists for a Nube @usuario (admin roster assign).
 * Creates keys + profile when missing; updates display name when empty.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ username: string, displayName?: string, rank?: string, sala?: string|null }} opts
 */
export function provisionClinicalUserFromCloudIdentity(db, opts) {
  const { handle, displayName, safeRank, sala } = parseCloudIdentityProvisionOpts(opts);
  const existing = db
    .prepare(
      `SELECT user_id, username, clinical_name FROM users WHERE username = ? COLLATE NOCASE`
    )
    .get(handle);
  if (existing) {
    return provisionExistingCloudUser(db, existing, displayName);
  }
  return insertCloudProvisionedUser(db, { handle, safeRank, displayName, sala });
}

/**
 * Admin (R4/Admin) updates rank/profile for a Nube @usuario on this Mac.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{ username: string, rank?: string, displayName?: string, sala?: string|null }} opts
 */
export function setClinicalUserProfileFromAdmin(db, opts) {
  const handle = normalizeUsername(opts?.username || '');
  if (!isValidUsernameFormat(handle)) {
    throw new Error('Usuario inválido. Usa 3–32 caracteres: a-z, 0-9, _.');
  }
  const safeRank = CLINICAL_RANKS.has(String(opts?.rank || '')) ? String(opts.rank) : 'R1';
  const displayName = String(opts?.displayName || '').trim();
  const sala = opts?.sala != null && String(opts.sala).trim() ? String(opts.sala).trim() : null;

  const existing = resolveClinicalUserByUsername(db, { username: handle });
  if (!existing) {
    return provisionClinicalUserFromCloudIdentity(db, {
      username: handle,
      displayName,
      rank: safeRank,
      sala,
    });
  }

  const uid = String(existing.user_id);
  db.prepare(
    `UPDATE users SET rank = ?, clinical_name = COALESCE(?, clinical_name), sala = COALESCE(?, sala)
     WHERE user_id = ?`
  ).run(safeRank, displayName || null, sala, uid);
  reconcileTeamMembershipForSalaChange(db, uid, sala);
  // Admin profile edits must not fake "última actividad".
  return getClinicalProfile(db, uid);
}
