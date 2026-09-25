import { defaultTurnKey } from '../turn-key.js';
import { loadRoomState as loadSyncRoomState } from '../sync.js';
import { normalizeInternoSala } from './sala-slug.js';

/**
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} sala
 */
export async function resolveRoomForSala(db, sala) {
  const normalized = normalizeInternoSala(sala);
  if (!normalized) return null;
  const turnKey = defaultTurnKey();
  let row = await db
    .prepare(
      `SELECT id, revision, sala, turn_key
       FROM rooms WHERE sala = ? AND turn_key = ?
       ORDER BY revision DESC LIMIT 1`
    )
    .bind(normalized, turnKey)
    .first();
  if (!row) {
    row = await db
      .prepare(
        `SELECT id, revision, sala, turn_key
         FROM rooms WHERE sala = ?
         ORDER BY revision DESC, updated_at DESC LIMIT 1`
      )
      .bind(normalized)
      .first();
  }
  return row || null;
}

/**
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} roomId
 */
export async function loadRoomState(env, db, roomId) {
  try {
    const { state } = await loadSyncRoomState(env, db, roomId);
    return state;
  } catch (err) {
    if (err?.code === 'not_found') return null;
    throw err;
  }
}
