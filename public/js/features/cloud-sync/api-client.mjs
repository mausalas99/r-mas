const API_PREFIX = '/api/sync/v1';

/**
 * @param {{ getBaseUrl: () => string, getToken: () => string }} deps
 */
export function createCloudSyncApi({ getBaseUrl, getToken }) {
  /**
   * @param {string} path
   * @param {{ method?: string, body?: unknown }} [opts]
   */
  async function req(path, { method = 'GET', body } = {}) {
    const baseUrl = String(getBaseUrl() || '').replace(/\/$/, '');
    const headers = { Accept: 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
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
    listRooms: () => req('/rooms'),
    getRoom: (roomId) => req(`/rooms/${roomId}`),
    leaveRoom: (roomId) => req(`/rooms/${roomId}/leave`, { method: 'POST', body: {} }),
    pull: (roomId, since) => req(`/rooms/${roomId}/pull?since=${encodeURIComponent(since)}`),
    push: (roomId, body) => req(`/rooms/${roomId}/mutations`, { method: 'POST', body }),
  };
}
