/**
 * Desktop Electron: Nube HTTP via main-process net.fetch (no renderer CORS).
 * Mobile / browser: ordinary fetch.
 */

/**
 * @param {string} url
 * @param {{ method?: string, headers?: Record<string, string>, body?: string }} [init]
 */
export async function cloudSyncHttpFetch(url, init = {}) {
  const api = typeof window !== 'undefined' ? window.electronAPI : null;
  if (api && typeof api.cloudSyncFetch === 'function') {
    const result = await api.cloudSyncFetch({
      url,
      method: init.method || 'GET',
      headers: init.headers || {},
      body: init.body,
    });
    const data = result && typeof result.data === 'object' ? result.data : {};
    return {
      ok: !!result?.ok,
      status: Number(result?.status) || 0,
      statusText: String(result?.statusText || ''),
      async json() {
        return data;
      },
      headers: {
        get(name) {
          const key = String(name || '').toLowerCase();
          if (key === 'retry-after' && result?.retryAfterMs != null) {
            return String(Math.ceil(Number(result.retryAfterMs) / 1000));
          }
          return null;
        },
      },
    };
  }
  return fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
}
