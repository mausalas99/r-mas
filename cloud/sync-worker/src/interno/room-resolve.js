import { decodeRoomState } from '../crypto-at-rest.js';
import { defaultTurnKey } from '../turn-key.js';
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
  const row = await db
    .prepare('SELECT ciphertext, iv FROM room_state WHERE room_id = ?')
    .bind(roomId)
    .first();
  if (!row) return null;
  return decodeRoomState(env, row.ciphertext, row.iv);
}
