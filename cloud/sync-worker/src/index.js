import { applyCors, corsPreflight } from './cors.js';
import { salaFromSlug } from './interno/sala-slug.js';
import { API_PREFIX, handleApiRoute, normalizePath } from './routes.js';

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

  const apiResponse = await handleApiRoute(request, env);
  if (apiResponse) return applyCors(request, apiResponse);

  if (env.ASSETS) {
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status !== 404) return applyCors(request, assetRes);
    if (url.pathname !== path) {
      const slashless = new Request(new URL(path + url.search, url.origin), request);
      const retryRes = await env.ASSETS.fetch(slashless);
      if (retryRes.status !== 404) return applyCors(request, retryRes);
    }
  }

  if (path === '/mobile' || path === '/mobile/join') {
    const indexReq = new Request(new URL('/mobile/index.html', url.origin), request);
    const indexRes = env.ASSETS
      ? await env.ASSETS.fetch(indexReq)
      : new Response('Not found', { status: 404 });
    return applyCors(request, indexRes);
  }

  const internoSlugMatch = /^\/interno\/([^/]+)$/.exec(path);
  if (internoSlugMatch && request.method === 'GET') {
    const slug = internoSlugMatch[1].toLowerCase();
    if (!salaFromSlug(slug)) {
      return applyCors(request, Response.json({ error: 'invalid_slug' }, { status: 404 }));
    }
    const indexReq = new Request(new URL('/interno/index.html', url.origin), request);
    const indexRes = env.ASSETS
      ? await env.ASSETS.fetch(indexReq)
      : new Response('Not found', { status: 404 });
    return applyCors(request, indexRes);
  }

  // Permanent Nube invite bookmarks may omit /mobile/ — normalize to cloud shell.
  if ((path === '/' || path === '') && url.searchParams.get('auth')) {
    const mobileUrl = new URL('/mobile/' + url.search, url.origin);
    return applyCors(request, Response.redirect(mobileUrl.toString(), 302));
  }

  return applyCors(request, Response.json({ error: 'not_found' }, { status: 404 }));
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (err) {
      const message = err && err.message ? String(err.message) : 'error';
      console.error('rplus-sync unhandled', message);
      return applyCors(
        request,
        Response.json({ error: 'internal_error', message }, { status: 500 })
      );
    }
  },
};
