const API_PREFIX = '/api/sync/v1';

/**
 * @param {{
 *   getBaseUrl: () => string,
 *   getToken: () => string,
 *   getAdminKey?: () => string,
 * }} deps
 */
export function createCloudSyncApi({ getBaseUrl, getToken, getAdminKey }) {
  /**
   * @param {string} path
   * @param {{ method?: string, body?: unknown }} [opts]
   */
  async function req(path, { method = 'GET', body } = {}) {
    const baseUrl = String(getBaseUrl() || '').replace(/\/$/, '');
    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
      const err = new Error('URL nube no configurada');
      err.status = 0;
      err.data = {
        error: 'missing_url',
        message: 'Configurá la URL del servicio en ⇄ → Avanzado.',
      };
      throw err;
    }
    const headers = { Accept: 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const adminKey = getAdminKey?.();
    if (adminKey) headers['X-Sync-Admin-Key'] = adminKey;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${baseUrl}${API_PREFIX}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || data.message || res.statusText);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    ping: () => req('/ping'),
    register: (body) => req('/auth/register', { method: 'POST', body }),
    login: (body) => req('/auth/login', { method: 'POST', body }),
    logout: () => req('/auth/logout', { method: 'POST', body: {} }),
    me: () => req('/auth/me'),
    createRoom: (body) => req('/rooms', { method: 'POST', body }),
    joinRoom: (body) => req('/rooms/join', { method: 'POST', body }),
    ensureTurn: (body) => req('/rooms/ensure-turn', { method: 'POST', body }),
    listRooms: () => req('/rooms'),
    getRoom: (roomId) => req(`/rooms/${roomId}`),
    leaveRoom: (roomId) => req(`/rooms/${roomId}/leave`, { method: 'POST', body: {} }),
    pull: (roomId, since) => req(`/rooms/${roomId}/pull?since=${encodeURIComponent(since)}`),
    push: (roomId, body) => req(`/rooms/${roomId}/mutations`, { method: 'POST', body }),

    adminOverview: () => req('/admin/overview'),
    adminRooms: () => req('/admin/rooms'),
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
    adminDeleteUser: (userId) => req(`/admin/users/${userId}`, { method: 'DELETE' }),
  };
}
