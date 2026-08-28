import {
  decryptOpsFromPull,
  decryptRoomStateFromPull,
  encryptOpsForPush
} from "/mobile/js/chunks/chunk-O5BLBOGB.js";
import {
  getCachedRoomDek
} from "/mobile/js/chunks/chunk-PVAHDYTI.js";

// public/js/features/cloud-sync/api-transport.mjs
async function cloudSyncHttpFetch(url, init = {}) {
  const api = typeof window !== "undefined" ? window.electronAPI : null;
  if (api && typeof api.cloudSyncFetch === "function") {
    const result = await api.cloudSyncFetch({
      url,
      method: init.method || "GET",
      headers: init.headers || {},
      body: init.body
    });
    const data = result && typeof result.data === "object" ? result.data : {};
    return {
      ok: !!result?.ok,
      status: Number(result?.status) || 0,
      statusText: String(result?.statusText || ""),
      async json() {
        return data;
      },
      headers: {
        get(name) {
          const key = String(name || "").toLowerCase();
          if (key === "retry-after" && result?.retryAfterMs != null) {
            return String(Math.ceil(Number(result.retryAfterMs) / 1e3));
          }
          return null;
        }
      }
    };
  }
  return fetch(url, { ...init, signal: AbortSignal.timeout(15e3) });
}

// public/js/features/cloud-sync/app-version.mjs
var cachedAppVersion = "";
if (typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.getAppVersion === "function") {
  window.electronAPI.getAppVersion().then(function(v) {
    cachedAppVersion = String(v || "");
  }).catch(function() {
  });
}
function getCachedAppVersion() {
  return cachedAppVersion || String(globalThis.__RPC_CLOUD_MOBILE_APP_VERSION__ || "");
}

// public/js/features/cloud-sync/api-client.mjs
var API_PREFIX = "/api/sync/v1";
function httpErrorFromResponse(res, data) {
  const err = new Error(data.error || data.message || res.statusText);
  err.status = res.status;
  err.data = data;
  if (res.status === 429) {
    const sec = Number(res.headers.get("Retry-After"));
    if (Number.isFinite(sec) && sec >= 0) {
      err.retryAfterMs = sec <= 1e3 ? sec * 1e3 : sec;
    }
  }
  return err;
}
function assertCloudBaseUrl(baseUrl) {
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    const err = new Error("URL nube no configurada");
    err.status = 0;
    err.data = {
      error: "missing_url",
      message: "Configura la URL del servicio en \u21C4 \u2192 Avanzado."
    };
    throw err;
  }
}
function createCloudSyncApi({ getBaseUrl, getToken, getAdminKey, getRoomDek = getCachedRoomDek }) {
  async function req(path, { method = "GET", body } = {}) {
    const baseUrl = String(getBaseUrl() || "").replace(/\/$/, "");
    assertCloudBaseUrl(baseUrl);
    const headers = { Accept: "application/json" };
    const appVersion = getCachedAppVersion();
    if (appVersion) headers["X-App-Version"] = appVersion;
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const adminKey = getAdminKey?.();
    if (adminKey) headers["X-Sync-Admin-Key"] = adminKey;
    if (body !== void 0) headers["Content-Type"] = "application/json";
    const res = await cloudSyncHttpFetch(`${baseUrl}${API_PREFIX}${path}`, {
      method,
      headers,
      body: body !== void 0 ? JSON.stringify(body) : void 0
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw httpErrorFromResponse(res, data);
    return data;
  }
  return {
    ping: () => req("/ping"),
    meta: () => req("/meta"),
    register: (body) => req("/auth/register", { method: "POST", body: { ...body, appVersion: getCachedAppVersion() } }),
    login: (body) => req("/auth/login", { method: "POST", body: { ...body, appVersion: getCachedAppVersion() } }),
    logout: () => req("/auth/logout", { method: "POST", body: {} }),
    recover: (body) => req("/auth/recover", { method: "POST", body }),
    regenerateRecovery: () => req("/auth/regenerate-recovery", { method: "POST", body: {} }),
    me: () => req("/auth/me"),
    createRoom: (body) => req("/rooms", { method: "POST", body }),
    joinRoom: (body) => req("/rooms/join", { method: "POST", body }),
    ensureTurn: (body) => req("/rooms/ensure-turn", { method: "POST", body }),
    listRooms: () => req("/rooms"),
    activeRoom: () => req("/rooms/active"),
    getRoom: (roomId) => req(`/rooms/${roomId}`),
    leaveRoom: (roomId) => req(`/rooms/${roomId}/leave`, { method: "POST", body: {} }),
    getRoomDek: (roomId) => req(`/rooms/${roomId}/dek`),
    setRoomDek: (roomId, body) => req(`/rooms/${roomId}/dek`, { method: "PUT", body }),
    rotateRoomDek: (roomId, body) => req(`/rooms/${roomId}/dek/rotate`, { method: "PUT", body }),
    getAdminRoomDek: (roomId) => req(`/rooms/${roomId}/dek/admin`),
    setAdminRoomDek: (roomId, body) => req(`/rooms/${roomId}/dek/admin`, { method: "PUT", body }),
    pull: async (roomId, since, opts) => {
      const q = new URLSearchParams({ since: String(since ?? 0) });
      if (opts?.mobile) q.set("mobile", "1");
      const data = await req(`/rooms/${roomId}/pull?${q.toString()}`);
      const dek = getRoomDek(roomId);
      if (Array.isArray(data?.ops)) {
        data.ops = await decryptOpsFromPull(dek, data.ops);
      }
      if (data?.state) {
        data.state = await decryptRoomStateFromPull(dek, data.state);
      }
      return data;
    },
    push: async (roomId, body) => {
      const dek = getRoomDek(roomId);
      const encryptedBody = dek && Array.isArray(body?.ops) ? { ...body, ops: await encryptOpsForPush(dek, body.ops) } : body;
      return req(`/rooms/${roomId}/mutations`, { method: "POST", body: encryptedBody });
    },
    adminOverview: () => req("/admin/overview"),
    adminRooms: () => req("/admin/rooms"),
    adminRoom: (roomId) => req(`/admin/rooms/${roomId}`),
    adminRotateCode: (roomId) => req(`/admin/rooms/${roomId}/rotate-code`, { method: "POST", body: {} }),
    adminPurgeRoom: (roomId) => req(`/admin/rooms/${roomId}/purge`, { method: "POST", body: {} }),
    adminMutations: (roomId, limit = 50) => req(`/admin/rooms/${roomId}/mutations?limit=${encodeURIComponent(String(limit))}`),
    adminUsers: (q) => {
      const qs = q ? `?q=${encodeURIComponent(q)}` : "";
      return req(`/admin/users${qs}`);
    },
    adminRevokeSessions: (userId) => req(`/admin/users/${userId}/revoke-sessions`, { method: "POST", body: {} }),
    adminPromote: (userId, role) => req(`/admin/users/${userId}/promote`, { method: "POST", body: role ? { role } : {} }),
    adminDisable: (userId) => req(`/admin/users/${userId}/disable`, { method: "POST", body: {} }),
    adminResetPassword: (userId, body) => req(`/admin/users/${userId}/reset-password`, { method: "POST", body }),
    adminDeleteUser: (userId) => req(`/admin/users/${userId}`, { method: "DELETE" }),
    adminVersionStats: () => req("/admin/version-stats")
  };
}

export {
  createCloudSyncApi
};
//# sourceMappingURL=/js/chunks/chunk-ATT36THA.js.map
