import { applyCors, corsPreflight } from './cors.js';
import { handleEquiposApi } from './routes.js';
import { purgeEquiposPhotosIfIdle } from './purge.js';

const API_PREFIX = '/api/equipos/v1';

/** @param {Request} request @param {import('@cloudflare/workers-types').ExecutionContext} env */
async function handleRequest(request, env) {
  const preflight = corsPreflight(request);
  if (preflight) return applyCors(request, preflight);

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === API_PREFIX || path.startsWith(`${API_PREFIX}/`)) {
    const subpath = path.slice(API_PREFIX.length) || '/';
    const res = await handleEquiposApi(request, env, subpath);
    return applyCors(request, res);
  }

  if (env.ASSETS) {
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status !== 404) {
      return applyCors(request, assetRes);
    }
  }

  if (path === '/' || path === '/equipos') {
    const indexReq = new Request(new URL('/index.html', url.origin), request);
    const indexRes = env.ASSETS ? await env.ASSETS.fetch(indexReq) : new Response('Not found', { status: 404 });
    return applyCors(request, indexRes);
  }

  return applyCors(
    request,
    new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
  );
}

export default {
  /** @param {Request} request @param {import('@cloudflare/workers-types').ExecutionContext} env */
  async fetch(request, env) {
    return handleRequest(request, env);
  },

  /** @param {ScheduledEvent} event @param {import('@cloudflare/workers-types').ExecutionContext} env */
  async scheduled(event, env) {
    try {
      await purgeEquiposPhotosIfIdle(env.DB, env.PHOTOS);
    } catch (e) {
      console.error('[equipos-purge]', e?.message || e);
    }
  },
};
