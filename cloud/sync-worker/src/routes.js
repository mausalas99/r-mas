import { handleAdmin } from './admin.js';
import { handleAuth } from './auth.js';
import { assertNubeAppVersion } from './auth-util.js';
import { SyncError, jsonSyncError, syncErrorStatus } from './errors.js';
import { handleInternoApiRoute } from './interno/routes.js';
import { handlePaseLabs } from './pase-labs.js';
import { handleRooms } from './rooms.js';
import { stampAppVersionFromRequest } from './session.js';

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

  const internoResponse = await handleInternoApiRoute(request, env);
  if (internoResponse) return internoResponse;

  if (!path.startsWith(API_PREFIX)) {
    return null;
  }

  const subpath = path.slice(API_PREFIX.length) || '/';

  try {
    // Runs on every authenticated request (rooms, admin, pase-labs), not
    // just login — sessions last 14 days, so login-only tracking would
    // leave fleet-adoption data stale for weeks.
    if (env.DB) await stampAppVersionFromRequest(env.DB, request);

    if (subpath === '/auth' || subpath.startsWith('/auth/')) {
      const authSub = subpath === '/auth' ? '/' : subpath.slice('/auth'.length) || '/';
      return await handleAuth(request, env, authSub);
    }

    if (subpath === '/rooms' || subpath.startsWith('/rooms/')) {
      // Re-checked on every room request, not just login: a device already
      // logged in on an old build (password-wrapped room key) must not keep
      // reading/writing room content once the fleet has moved to the
      // room-code method, even mid-session.
      // Gated by NUBE_VERSION_GATE_ENABLED (off by default) — turn on only
      // once 8.2.0 has shipped, otherwise this blocks every current user.
      if (env.NUBE_VERSION_GATE_ENABLED) {
        assertNubeAppVersion(request.headers.get('X-App-Version'));
      }
      const roomsSub = subpath === '/rooms' ? '/' : subpath.slice('/rooms'.length) || '/';
      return await handleRooms(request, env, roomsSub);
    }

    if (subpath === '/pase-labs') {
      return await handlePaseLabs(request, env);
    }

    if (subpath === '/admin' || subpath.startsWith('/admin/')) {
      const adminSub = subpath === '/admin' ? '/' : subpath.slice('/admin'.length) || '/';
      return await handleAdmin(request, env, adminSub);
    }

    if (subpath.startsWith('/sync')) {
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
