import { authenticateInterno } from './auth.js';
import { readInternoBoard } from './board.js';
import {
  applyInternoVitals,
  checkVitalsRateLimit,
} from './vitals.js';

export const INTERNO_API_PREFIX = '/api/interno/v1';

/** @param {Request} request */
async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
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
    const auth = await authenticateInterno(request, db);
    if (auth instanceof Response) return auth;
    const board = await readInternoBoard(env, db, auth.sala);
    if (!board) return Response.json({ error: 'invalid_sala' }, { status: 400 });
    return Response.json(board);
  }

  if (subpath === '/vitals') {
    if (request.method !== 'POST') {
      return Response.json({ error: 'method_not_allowed' }, { status: 405 });
    }
    const body = await parseJsonBody(request);
    if (!body) return Response.json({ error: 'invalid_json' }, { status: 400 });
    const auth = await authenticateInterno(request, db, body);
    if (auth instanceof Response) return auth;
    if (!checkVitalsRateLimit(request, auth.token)) {
      return Response.json({ error: 'rate_limited' }, { status: 429 });
    }
    const patientId = String(body?.patientId || '').trim();
    if (!patientId) {
      return Response.json({ error: 'patient_id_required' }, { status: 400 });
    }
    return applyInternoVitals(env, db, auth.sala, patientId, body);
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
