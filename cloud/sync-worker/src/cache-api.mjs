const CACHE_NAME = 'rplus-sync-v1';

/**
 * Return a cached response when present.
 * @param {Request} request
 * @param {string} [cacheName]
 */
export async function cacheMatch(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  return cache.match(request);
}

/**
 * Store a clone in the Cache API (response body is consumed once).
 * @param {Request} request
 * @param {Response} response
 * @param {number} maxAgeSeconds
 * @param {string} [cacheName]
 */
export async function cachePut(request, response, maxAgeSeconds, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${maxAgeSeconds}`);
  const cached = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  await cache.put(request, cached);
}

/**
 * @param {Request} request
 * @param {() => Promise<Response>} buildResponse
 * @param {number} maxAgeSeconds
 */
export async function withEdgeCache(request, buildResponse, maxAgeSeconds) {
  const hit = await cacheMatch(request);
  if (hit) return hit;
  const response = await buildResponse();
  if (response.ok && response.status !== 206) {
    await cachePut(request, response.clone(), maxAgeSeconds);
  }
  return response;
}
