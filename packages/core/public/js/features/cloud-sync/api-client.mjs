const API_PREFIX = '/api/sync/v1';

import { cloudSyncHttpFetch } from './api-transport.mjs';
import { getCachedAppVersion } from './app-version.mjs';
import { getCachedRoomDek, markRoomUnprotected } from './room-dek.mjs';
import { isEncryptedEnvelope } from './crypto.mjs';
import {
  encryptOpsForPush,
  decryptOpsFromPull,
  decryptRoomStateFromPull,
  hasLockedOpValue,
  listContentFieldEntries,
} from './cloud-sync-crypto-wire.mjs';
import { noteServerDate } from './cloud-sync-clock.mjs';
import { noteNubeAuthResponse } from './session-expired-prompt.mjs';

/** @param {Response} res @param {Record<string, unknown>} data */
function httpErrorFromResponse(res, data) {
  const message =
    data.error === 'cloud_sync_timeout'
      ? 'La Nube no respondió a tiempo. Intenta de nuevo.'
      : data.message || data.error || res.statusText;
  const err = new Error(message);
  err.status = res.status;
  err.data = data;
  if (res.status === 429 || res.status === 503) {
    const sec = Number(res.headers.get('Retry-After'));
    if (Number.isFinite(sec) && sec >= 0) {
      err.retryAfterMs = sec <= 1000 ? sec * 1000 : sec;
    }
  }
  return err;
}

/** @param {string} baseUrl */
function assertCloudBaseUrl(baseUrl) {
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    const err = new Error('URL nube no configurada');
    err.status = 0;
    err.data = {
      error: 'missing_url',
      message: 'Configura la URL del servicio en ⇄ → Avanzado.',
    };
    throw err;
  }
}

/**
 * @param {{
 *   getBaseUrl: () => string,
 *   getToken: () => string,
 *   getAdminKey?: () => string,
 *   getRoomDek?: (roomId: string) => CryptoKey | null,
 * }} deps
 */
export function createCloudSyncApi({ getBaseUrl, getToken, getAdminKey, getRoomDek = getCachedRoomDek }) {
  /**
   * @param {string} path
   * @param {{ method?: string, body?: unknown }} [opts]
   */
  async function req(path, { method = 'GET', body } = {}) {
    const baseUrl = String(getBaseUrl() || '').replace(/\/$/, '');
    assertCloudBaseUrl(baseUrl);
    const headers = { Accept: 'application/json' };
    const appVersion = getCachedAppVersion();
    if (appVersion) headers['X-App-Version'] = appVersion;
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const adminKey = getAdminKey?.();
    if (adminKey) headers['X-Sync-Admin-Key'] = adminKey;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await cloudSyncHttpFetch(`${baseUrl}${API_PREFIX}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    noteServerDate(res.headers.get('Date'));
    const data = await res.json().catch(() => ({}));
    if (token) noteNubeAuthResponse(res.status, data);
    if (!res.ok) throw httpErrorFromResponse(res, data);
    return data;
  }

  return {
    ping: () => req('/ping'),
    meta: () => req('/meta'),
    register: (body) => req('/auth/register', { method: 'POST', body: { ...body, appVersion: getCachedAppVersion() } }),
    login: (body) => req('/auth/login', { method: 'POST', body: { ...body, appVersion: getCachedAppVersion() } }),
    logout: () => req('/auth/logout', { method: 'POST', body: {} }),
    recover: (body) => req('/auth/recover', { method: 'POST', body }),
    regenerateRecovery: () =>
      req('/auth/regenerate-recovery', { method: 'POST', body: {} }),
    me: () => req('/auth/me'),
    createRoom: (body) => req('/rooms', { method: 'POST', body }),
    joinRoom: (body) => req('/rooms/join', { method: 'POST', body }),
    ensureTurn: (body) => req('/rooms/ensure-turn', { method: 'POST', body }),
    listRooms: () => req('/rooms'),
    activeRoom: () => req('/rooms/active'),
    getRoom: (roomId) => req(`/rooms/${roomId}`),
    leaveRoom: (roomId) => req(`/rooms/${roomId}/leave`, { method: 'POST', body: {} }),
    getRoomDek: (roomId) => req(`/rooms/${roomId}/dek`),
    setRoomDek: (roomId, body) => req(`/rooms/${roomId}/dek`, { method: 'PUT', body }),
    rotateRoomDek: (roomId, body) => req(`/rooms/${roomId}/dek/rotate`, { method: 'PUT', body }),
    getAdminRoomDek: (roomId) => req(`/rooms/${roomId}/dek/admin`),
    setAdminRoomDek: (roomId, body) => req(`/rooms/${roomId}/dek/admin`, { method: 'PUT', body }),
    pull: async (roomId, since, opts) => {
      const q = new URLSearchParams({ since: String(since ?? 0) });
      if (opts?.mobile) q.set('mobile', '1');
      const data = await req(`/rooms/${roomId}/pull?${q.toString()}`);
      const dek = getRoomDek(roomId);
      // `locked` rides back on the result so the runtime can hold the local
      // revision back. Anything still ciphertext here is dropped by pull-apply;
      // advancing past it would make the next `since` pull skip it forever.
      let locked = false;
      if (Array.isArray(data?.ops)) {
        data.ops = await decryptOpsFromPull(dek, data.ops);
        if (hasLockedOpValue(data.ops)) locked = true;
      }
      if (data?.state) {
        data.state = await decryptRoomStateFromPull(dek, data.state);
        if (listContentFieldEntries(data.state).some((e) => isEncryptedEnvelope(e.value))) {
          locked = true;
        }
      }
      if (locked) {
        markRoomUnprotected(roomId);
        data.locked = true;
      }
      return data;
    },
    push: async (roomId, body) => {
      const dek = getRoomDek(roomId);
      const encryptedBody =
        dek && Array.isArray(body?.ops)
          ? { ...body, ops: await encryptOpsForPush(dek, body.ops) }
          : body;
      return req(`/rooms/${roomId}/mutations`, { method: 'POST', body: encryptedBody });
    },

    adminOverview: () => req('/admin/overview'),
    adminRooms: () => req('/admin/rooms'),
    adminNetworkCensus: () => req('/admin/network-census'),
    adminRoom: (roomId) => req(`/admin/rooms/${roomId}`),
    adminRotateCode: (roomId) => req(`/admin/rooms/${roomId}/rotate-code`, { method: 'POST', body: {} }),
    adminPurgeRoom: (roomId) => req(`/admin/rooms/${roomId}/purge`, { method: 'POST', body: {} }),
    adminMutations: (roomId, limit = 50) =>
      req(`/admin/rooms/${roomId}/mutations?limit=${encodeURIComponent(String(limit))}`),
    adminUsers: (q) => {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      return req(`/admin/users${qs}`);
    },
    adminRevokeSessions: (userId) =>
      req(`/admin/users/${userId}/revoke-sessions`, { method: 'POST', body: {} }),
    adminPromote: (userId, role) =>
      req(`/admin/users/${userId}/promote`, { method: 'POST', body: role ? { role } : {} }),
    adminDisable: (userId) => req(`/admin/users/${userId}/disable`, { method: 'POST', body: {} }),
    adminResetPassword: (userId, body) =>
      req(`/admin/users/${userId}/reset-password`, { method: 'POST', body }),
    adminDeleteUser: (userId) => req(`/admin/users/${userId}`, { method: 'DELETE' }),
    adminVersionStats: () => req('/admin/version-stats'),
  };
}
