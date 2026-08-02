import { handleAuth } from './auth.js';
import { SyncError, jsonSyncError, syncErrorStatus } from './errors.js';

export const API_PREFIX = '/api/sync/v1';

/** @param {string} pathname */
export function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

/**
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database }} env
 * @returns {Promise<Response | null>}
 */
export async function handleApiRoute(request, env) {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);

  if (!path.startsWith(API_PREFIX)) {
    return null;
  }

  const subpath = path.slice(API_PREFIX.length) || '/';

  try {
    if (subpath === '/auth' || subpath.startsWith('/auth/')) {
      const authSub = subpath === '/auth' ? '/' : subpath.slice('/auth'.length) || '/';
      return await handleAuth(request, env, authSub);
    }

    if (subpath.startsWith('/rooms') || subpath.startsWith('/sync')) {
      throw new SyncError('not_implemented', 'Endpoint pendiente de implementación.');
    }

    throw new SyncError('not_found', 'Ruta no encontrada.');
  } catch (err) {
    if (err instanceof SyncError) {
      return Response.json(jsonSyncError(err), { status: syncErrorStatus(err) });
    }
    throw err;
  }
}
