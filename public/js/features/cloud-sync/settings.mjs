const SETTINGS_KEY = 'rpc-settings';
/** Deployed Free-pilot Worker (override in ⇄ → Avanzado). */
export const DEFAULT_CLOUD_SYNC_URL =
  'https://rplus-sync.rmas-workersdev.workers.dev';
const TOKEN_KEY = 'rpc-cloud-sync-token';
const ROOM_ID_KEY = 'rpc-cloud-sync-room-id';
const REVISION_KEY = 'rpc-cloud-sync-revision';
const ROOM_META_KEY = 'rpc-cloud-sync-room-meta';
const REMEMBER_KEY = 'rpc-cloud-sync-remember';

/** @returns {Record<string, unknown>} */
function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

/** @param {Record<string, unknown>} settings */
function writeSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getCloudSyncUrl() {
  const s = readSettings();
  const raw = String(s.cloudSyncUrl || '').trim();
  return (raw || DEFAULT_CLOUD_SYNC_URL).replace(/\/$/, '');
}

/** @param {string} url */
export function setCloudSyncUrl(url) {
  const s = readSettings();
  s.cloudSyncUrl = String(url || '').replace(/\/$/, '');
  writeSettings(s);
}

export function getCloudSyncRemember() {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch {
    return false;
  }
}

/** @param {boolean} remember */
export function setCloudSyncRemember(remember) {
  try {
    if (remember) localStorage.setItem(REMEMBER_KEY, '1');
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} key
 * @returns {string}
 */
function readDual(key) {
  try {
    const sessionVal = sessionStorage.getItem(key);
    if (sessionVal) return sessionVal;
    if (!getCloudSyncRemember()) return '';
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

/**
 * @param {string} key
 * @param {string} value empty clears
 */
function writeDual(key, value) {
  try {
    if (value) {
      sessionStorage.setItem(key, value);
      if (getCloudSyncRemember()) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } else {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

// TODO: migrate token to safeStorage IPC (preload cloudSyncGetToken / cloudSyncSetToken)
export function getCloudSyncToken() {
  return readDual(TOKEN_KEY);
}

/**
 * @param {string} token
 * @param {{ remember?: boolean }} [opts]
 */
export function setCloudSyncToken(token, opts) {
  if (opts && Object.prototype.hasOwnProperty.call(opts, 'remember')) {
    setCloudSyncRemember(!!opts.remember);
  }
  writeDual(TOKEN_KEY, token ? String(token) : '');
}

export function clearCloudSyncToken() {
  writeDual(TOKEN_KEY, '');
}

export function getCloudSyncRoomId() {
  return readDual(ROOM_ID_KEY);
}

/** @param {string} roomId */
export function setCloudSyncRoomId(roomId) {
  writeDual(ROOM_ID_KEY, roomId ? String(roomId) : '');
  if (!roomId) writeDual(ROOM_META_KEY, '');
}

/**
 * Persist display fields so Conexión can label the sala after restart (Recuérdame).
 * @param {{ id?: string, code?: string, sala?: string, turnKey?: string, name?: string, revision?: number } | null | undefined} room
 */
export function setCloudSyncRoomSnapshot(room) {
  if (!room || !room.id) {
    setCloudSyncRoomId('');
    setCloudSyncRevision(0);
    return;
  }
  setCloudSyncRoomId(String(room.id));
  if (room.revision != null) setCloudSyncRevision(Number(room.revision) || 0);
  writeDual(
    ROOM_META_KEY,
    JSON.stringify({
      id: String(room.id),
      code: String(room.code || ''),
      sala: String(room.sala || ''),
      turnKey: String(room.turnKey || ''),
      name: String(room.name || ''),
    })
  );
}

/** @returns {{ id: string, code: string, sala: string, turnKey: string, name: string } | null} */
export function getCloudSyncRoomSnapshot() {
  const raw = readDual(ROOM_META_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || !o.id) return null;
    return {
      id: String(o.id),
      code: String(o.code || ''),
      sala: String(o.sala || ''),
      turnKey: String(o.turnKey || ''),
      name: String(o.name || ''),
    };
  } catch {
    return null;
  }
}

export function getCloudSyncRevision() {
  const raw = readDual(REVISION_KEY);
  return raw !== '' ? Number(raw) || 0 : 0;
}

/** @param {number} revision */
export function setCloudSyncRevision(revision) {
  writeDual(REVISION_KEY, String(Number(revision) || 0));
}

/**
 * Apply a server revision after pull/push. Ignores stale lower values — e.g. when the
 * Worker returns a prior mutation's revision for a duplicate `clientMutationId`.
 * @param {number} revision
 */
export function advanceCloudSyncRevision(revision) {
  const next = Number(revision) || 0;
  if (next <= 0) return;
  if (next > getCloudSyncRevision()) setCloudSyncRevision(next);
}

export function getCloudSyncSettings() {
  return {
    baseUrl: getCloudSyncUrl(),
    token: getCloudSyncToken(),
    roomId: getCloudSyncRoomId(),
    revision: getCloudSyncRevision(),
    remember: getCloudSyncRemember(),
  };
}

export function clearCloudSyncSession() {
  clearCloudSyncToken();
  setCloudSyncRoomId('');
  setCloudSyncRevision(0);
  writeDual(ROOM_META_KEY, '');
}
