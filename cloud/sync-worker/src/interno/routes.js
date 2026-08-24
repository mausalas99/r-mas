// board.js / vitals.js are no longer imported here — see the disabled-route
// note below. authenticateInterno, readInternoBoard, applyInternoVitals, and
// checkVitalsRateLimit stay in their own files, unused, until re-wired.

export const INTERNO_API_PREFIX = '/api/interno/v1';

// ponytail: clinicalOps and monitoreo are becoming E2EE-encrypted; this board
// reads them server-side and can't work until it's redesigned to read
// on-device — see docs/superpowers/plans/2026-08-23-nube-e2ee-deploy.md Stage 0
// items 3-4. board.js / vitals.js / vitals-medicion.js are left in place,
// intercepted here at the route level. Remove this block (and re-enable the
// routes below) once the on-device redesign lands.
// Response bodies are single-use streams, so build a fresh Response per call.
function internoDisabledBoard() {
  return Response.json(
    {
      error: 'temporarily_disabled',
      message:
        'El panel de guardia por celular está temporalmente desactivado mientras migramos a cifrado de extremo a extremo.',
    },
    { status: 503 }
  );
}
function internoDisabledVitals() {
  return Response.json(
    {
      error: 'temporarily_disabled',
      message:
        'El registro de signos vitales por celular está temporalmente desactivado mientras migramos a cifrado de extremo a extremo.',
    },
    { status: 503 }
  );
}

/**
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database, WORKER_DATA_KEY?: string }} env
 * @param {string} subpath
 */
export async function handleInternoRoutes(request, env, subpath) {
  const db = env.DB;
  if (!db) {
    return Response.json({ error: 'db_unavailable' }, { status: 503 });
  }

  if (subpath === '/ping') {
    if (request.method !== 'GET') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405 });
    }
    return Response.json({ ok: true, interno: true, board: 'v2' });
  }

  if (subpath === '/board') {
    if (request.method !== 'GET') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405 });
    }
    return internoDisabledBoard();
  }

  if (subpath === '/vitals') {
    if (request.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405 });
    }
    return internoDisabledVitals();
  }

  return Response.json({ error: 'not_found' }, { status: 404 });
}

/**
 * @param {Request} request
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database, WORKER_DATA_KEY?: string }} env
 * @returns {Promise<Response | null>}
 */
export async function handleInternoApiRoute(request, env) {
  const url = new URL(request.url);
  let path = url.pathname.replace(/\/+$/, '') || '/';
  if (!path.startsWith(INTERNO_API_PREFIX)) return null;
  const subpath = path.slice(INTERNO_API_PREFIX.length) || '/';
  return handleInternoRoutes(request, env, subpath);
}
