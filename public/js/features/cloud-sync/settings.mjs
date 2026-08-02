const SETTINGS_KEY = 'rpc-settings';
/** Deployed Free-pilot Worker (override in ⇄ → Avanzado). */
export const DEFAULT_CLOUD_SYNC_URL =
  'https://rplus-sync.rmas-workersdev.workers.dev';
const TOKEN_KEY = 'rpc-cloud-sync-token';
const ROOM_ID_KEY = 'rpc-cloud-sync-room-id';
const REVISION_KEY = 'rpc-cloud-sync-revision';

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

// TODO: migrate token to safeStorage IPC (preload cloudSyncGetToken / cloudSyncSetToken)
export function getCloudSyncToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

/** @param {string} token */
export function setCloudSyncToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function clearCloudSyncToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getCloudSyncRoomId() {
  try {
    return sessionStorage.getItem(ROOM_ID_KEY) || '';
  } catch {
    return '';
  }
}

/** @param {string} roomId */
export function setCloudSyncRoomId(roomId) {
  if (roomId) {
    sessionStorage.setItem(ROOM_ID_KEY, roomId);
  } else {
    sessionStorage.removeItem(ROOM_ID_KEY);
  }
}

export function getCloudSyncRevision() {
  try {
    const raw = sessionStorage.getItem(REVISION_KEY);
    return raw != null && raw !== '' ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

/** @param {number} revision */
export function setCloudSyncRevision(revision) {
  sessionStorage.setItem(REVISION_KEY, String(Number(revision) || 0));
}

export function getCloudSyncSettings() {
  return {
    baseUrl: getCloudSyncUrl(),
    token: getCloudSyncToken(),
    roomId: getCloudSyncRoomId(),
    revision: getCloudSyncRevision(),
  };
}

export function clearCloudSyncSession() {
  clearCloudSyncToken();
  setCloudSyncRoomId('');
  setCloudSyncRevision(0);
}
