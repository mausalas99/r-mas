import { applyCors, corsPreflight } from './cors.js';

const API_PREFIX = '/api/sync/v1';

/** @param {string} pathname */
function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

/** @param {Request} request @param {import('@cloudflare/workers-types').ExecutionContext} env */
async function handleRequest(request, env) {
  const preflight = corsPreflight(request);
  if (preflight) return applyCors(request, preflight);

  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  if (path === `${API_PREFIX}/ping` && request.method === 'GET') {
    return applyCors(
      request,
      Response.json({ ok: true, service: 'rplus-sync' })
    );
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
