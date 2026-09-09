'use strict';

const CLOUD_SYNC_API_PATH = /\/api\/sync\/v1\//;

/** No timeout here left every Nube fetch able to hang the renderer forever on
 * a dropped connection — the browser-fetch path (api-transport.mjs) already
 * had a 15s AbortSignal.timeout; this desktop IPC path never did. 20s (not
 * 15s) gives the heaviest call — the admin network-census sweep, which reads
 * 8 rooms' state in one Worker request — a bit more room before it fails
 * fast instead of hanging silently. */
const FETCH_TIMEOUT_MS = 20_000;

/** @param {string} url */
function assertAllowedCloudSyncUrl(url) {
  const u = new URL(String(url || ''));
  if (!CLOUD_SYNC_API_PATH.test(u.pathname)) {
    throw new Error('cloud_sync_url_not_allowed');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new Error('cloud_sync_url_not_allowed');
  }
}

/**
 * @param {import('electron').Net} net
 * @param {{ url: string, method?: string, headers?: Record<string, string>, body?: string | null }} payload
 */
/** @param {string} text */
async function parseJsonBody(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/** @param {string | null} retryAfterRaw */
function parseRetryAfterMs(retryAfterRaw) {
  if (retryAfterRaw == null) return null;
  const sec = Number(retryAfterRaw);
  if (!Number.isFinite(sec) || sec < 0) return null;
  return sec <= 1000 ? sec * 1000 : sec;
}

async function cloudSyncNetFetch(net, payload) {
  const url = String(payload?.url || '');
  assertAllowedCloudSyncUrl(url);
  let res;
  try {
    res = await net.fetch(url, {
      method: payload?.method || 'GET',
      headers: payload?.headers || {},
      body: payload?.body != null && payload.body !== '' ? payload.body : undefined,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error('cloud_sync_timeout');
    }
    throw err;
  }
  const text = await res.text();
  const data = await parseJsonBody(text);
  const retryAfterMs = parseRetryAfterMs(res.headers.get('retry-after'));
  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    data,
    retryAfterMs,
  };
}

module.exports = { assertAllowedCloudSyncUrl, cloudSyncNetFetch, CLOUD_SYNC_API_PATH };
