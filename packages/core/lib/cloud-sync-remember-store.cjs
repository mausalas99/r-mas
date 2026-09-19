'use strict';

/**
 * Durable Recuérdame session for desktop Electron.
 * Chromium localStorage can stay in-memory until flush; abrupt win.destroy()
 * (and two processes sharing userData) drop the Nube token across restarts.
 */

const fs = require('fs');
const path = require('path');

const FILE_NAME = 'cloud-sync-remember.json';

/** @param {string} userDataPath */
function rememberFilePath(userDataPath) {
  return path.join(String(userDataPath || ''), FILE_NAME);
}

/**
 * @param {unknown} raw
 * @returns {{ remember: boolean, token: string, roomId: string, revision: number, roomMeta: object|null, deks: Record<string, string> }|null}
 */
/** @param {{ id?: unknown, code?: unknown, sala?: unknown, turnKey?: unknown, name?: unknown }} rawRoomMeta */
function normalizeRoomMeta(rawRoomMeta) {
  if (!rawRoomMeta || typeof rawRoomMeta !== 'object') return null;
  const roomMeta = {
    id: String(rawRoomMeta.id || ''),
    code: String(rawRoomMeta.code || ''),
    sala: String(rawRoomMeta.sala || ''),
    turnKey: String(rawRoomMeta.turnKey || ''),
    name: String(rawRoomMeta.name || ''),
  };
  return roomMeta.id ? roomMeta : null;
}

/**
 * Raw (unwrapped) room DEKs, base64, keyed by roomId — lets the app skip re-asking
 * for the Nube password on restart. Same file mode (0600) as the session token,
 * which this store already holds in the clear; no new trust boundary.
 * @param {unknown} rawDeks
 * @returns {Record<string, string>}
 */
function normalizeDeks(rawDeks) {
  if (!rawDeks || typeof rawDeks !== 'object') return {};
  const out = {};
  for (const [roomId, dek] of Object.entries(rawDeks)) {
    const id = String(roomId || '').trim();
    const value = String(dek || '').trim();
    if (id && value) out[id] = value;
  }
  return out;
}

function normalizeSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const token = String(raw.token || '').trim();
  if (!token) return null;
  const roomMeta = normalizeRoomMeta(raw.roomMeta);
  return {
    remember: raw.remember !== false,
    token,
    roomId: String(raw.roomId || (roomMeta && roomMeta.id) || '').trim(),
    revision: Number(raw.revision) || 0,
    roomMeta,
    deks: normalizeDeks(raw.deks),
  };
}

/**
 * @param {string} userDataPath
 * @returns {{ remember: boolean, token: string, roomId: string, revision: number, roomMeta: object|null }|null}
 */
function readCloudSyncRememberStore(userDataPath) {
  const file = rememberFilePath(userDataPath);
  try {
    if (!fs.existsSync(file)) return null;
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return normalizeSnapshot(raw);
  } catch {
    return null;
  }
}

/**
 * @param {string} userDataPath
 * @param {{ token?: string, roomId?: string, revision?: number, roomMeta?: object|null, remember?: boolean }|null|undefined} snapshot
 */
function writeCloudSyncRememberStore(userDataPath, snapshot) {
  const file = rememberFilePath(userDataPath);
  const normalized = normalizeSnapshot(snapshot);
  if (!normalized || normalized.remember === false) {
    clearCloudSyncRememberStore(userDataPath);
    return null;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(normalized), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, file);
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    /* ignore */
  }
  return normalized;
}

/** @param {string} userDataPath */
function clearCloudSyncRememberStore(userDataPath) {
  const file = rememberFilePath(userDataPath);
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch {
    /* ignore */
  }
}

module.exports = {
  FILE_NAME,
  rememberFilePath,
  normalizeSnapshot,
  readCloudSyncRememberStore,
  writeCloudSyncRememberStore,
  clearCloudSyncRememberStore,
};
