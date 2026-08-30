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
  if (raw) return raw.replace(/\/$/, '');
  // Dev-only, unset in production: R_PLUS_CLOUD_SYNC_URL points a fresh profile at
  // `wrangler dev` from first launch, before any explicit "Avanzado" URL is saved —
  // so a test instance can never touch production even for the first network call.
  const devOverride =
    typeof window !== 'undefined' ? window.electronAPI?.getDevCloudSyncUrlOverride?.() : null;
  return String(devOverride || DEFAULT_CLOUD_SYNC_URL).replace(/\/$/, '');
}

/** @param {string} url */
export function setCloudSyncUrl(url) {
  const s = readSettings();
  s.cloudSyncUrl = String(url || '').replace(/\/$/, '');
  writeSettings(s);
}

export function getCloudSyncRemember() {
  try {
    hydrateRememberFromDisk();
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
  } catch (e) {
    console.warn('[settings] failed to write ' + REMEMBER_KEY, e);
  }
}

/** @returns {any|null} */
function rememberBridgeApi() {
  try {
    if (typeof window === 'undefined') return null;
    return window.electronAPI || null;
  } catch {
    return null;
  }
}

let rememberHydrated = false;
/** Raw room DEKs (base64), keyed by roomId — mirrors the durable Recuérdame file. */
let cachedDeks = {};

/**
 * Room DEKs from the durable Recuérdame store — room-dek.mjs imports these back
 * into its in-memory cache at boot so a restored session skips the password.
 * @returns {Record<string, string>}
 */
export function getStoredRoomDeks() {
  hydrateRememberFromDisk();
  return cachedDeks;
}

/**
 * @param {Record<string, string>} deks raw DEKs, base64, keyed by roomId
 */
export function setStoredRoomDeks(deks) {
  cachedDeks = deks && typeof deks === 'object' ? deks : {};
  persistRememberToDisk();
}

/** Pull durable Recuérdame snapshot from userData into local/session storage. */
function hydrateRememberFromDisk() {
  if (rememberHydrated) return;
  rememberHydrated = true;
  const api = rememberBridgeApi();
  if (!api || typeof api.cloudSyncRememberGetSync !== 'function') return;
  let snap = null;
  try {
    snap = api.cloudSyncRememberGetSync();
  } catch {
    return;
  }
  if (snap && snap.deks && typeof snap.deks === 'object') cachedDeks = snap.deks;
  if (!snap || !String(snap.token || '').trim()) return;
  try {
    localStorage.setItem(REMEMBER_KEY, '1');
    sessionStorage.setItem(TOKEN_KEY, String(snap.token));
    localStorage.setItem(TOKEN_KEY, String(snap.token));
    if (snap.roomId) {
      sessionStorage.setItem(ROOM_ID_KEY, String(snap.roomId));
      localStorage.setItem(ROOM_ID_KEY, String(snap.roomId));
    }
    if (snap.revision != null) {
      const rev = String(Number(snap.revision) || 0);
      sessionStorage.setItem(REVISION_KEY, rev);
      localStorage.setItem(REVISION_KEY, rev);
    }
    if (snap.roomMeta && snap.roomMeta.id) {
      const meta = JSON.stringify(snap.roomMeta);
      sessionStorage.setItem(ROOM_META_KEY, meta);
      localStorage.setItem(ROOM_META_KEY, meta);
    }
  } catch (e) {
    console.warn('[settings] failed to write remember data', e);
  }
}

function persistRememberToDisk() {
  const api = rememberBridgeApi();
  if (!api) return;
  if (!getCloudSyncRemember()) {
    if (typeof api.cloudSyncRememberClear === 'function') {
      void api.cloudSyncRememberClear();
    }
    return;
  }
  const token = (() => {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  })();
  if (!token) {
    if (typeof api.cloudSyncRememberClear === 'function') {
      void api.cloudSyncRememberClear();
    }
    return;
  }
  if (typeof api.cloudSyncRememberSet !== 'function') return;
  let roomMeta = null;
  try {
    const raw = sessionStorage.getItem(ROOM_META_KEY) || localStorage.getItem(ROOM_META_KEY);
    roomMeta = raw ? JSON.parse(raw) : null;
  } catch {
    roomMeta = null;
  }
  void api.cloudSyncRememberSet({
    remember: true,
    token,
    roomId: (() => {
      try {
        return sessionStorage.getItem(ROOM_ID_KEY) || localStorage.getItem(ROOM_ID_KEY) || '';
      } catch {
        return '';
      }
    })(),
    revision: (() => {
      try {
        const raw = sessionStorage.getItem(REVISION_KEY) || localStorage.getItem(REVISION_KEY) || '0';
        return Number(raw) || 0;
      } catch {
        return 0;
      }
    })(),
    roomMeta,
    deks: cachedDeks,
  });
}

/**
 * @param {string} key
 * @returns {string}
 */
function readDual(key) {
  try {
    hydrateRememberFromDisk();
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
  } catch (e) {
    console.warn('[settings] failed to write dual storage key', e);
  }
  // Durable userData copy so quit/destroy cannot drop Recuérdame.
  if (
    key === TOKEN_KEY ||
    key === ROOM_ID_KEY ||
    key === REVISION_KEY ||
    key === ROOM_META_KEY ||
    key === REMEMBER_KEY
  ) {
    persistRememberToDisk();
  }
}

// Recuérdame also dual-writes to userData via cloudSyncRemember* IPC (survives abrupt quit).
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

/**
 * Logout clears the credential but keeps the room code/name so the next
 * login doesn't force the user to retype it.
 */
export function clearCloudSyncSession() {
  clearCloudSyncToken();
  cachedDeks = {};
  const api = rememberBridgeApi();
  if (api && typeof api.cloudSyncRememberClear === 'function') {
    void api.cloudSyncRememberClear();
  }
}
