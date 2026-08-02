import { applyCors, corsPreflight } from './cors.js';
import { API_PREFIX, handleApiRoute } from './routes.js';

/** @param {Request} request @param {import('@cloudflare/workers-types').ExecutionContext} env */
async function handleRequest(request, env) {
  const preflight = corsPreflight(request);
  if (preflight) return applyCors(request, preflight);

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === `${API_PREFIX}/ping` && request.method === 'GET') {
    return applyCors(
      request,
      Response.json({ ok: true, service: 'rplus-sync' })
    );
  }

  const apiResponse = await handleApiRoute(request, env);
  if (apiResponse) {
    return applyCors(request, apiResponse);
  }

  return applyCors(
    request,
    Response.json({ error: 'not_found' }, { status: 404 })
  );
}

export default {
  /** @param {Request} request @param {import('@cloudflare/workers-types').ExecutionContext} env */
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
