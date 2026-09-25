import { entriesToPatients } from '../../../../lib/interno/interno-scope.mjs';
import { getSalaInternoAccess } from './auth.js';
import { loadRoomState, resolveRoomForSala } from './room-resolve.js';
import { normalizeInternoSala } from './sala-slug.js';

export { entriesToPatients };

/**
 * Relays the sala's room to the phone untouched: identity fields plaintext as
 * always, `monitoreo`/`clinicalOps` passed through whatever shape they're
 * actually stored in (plaintext for a legacy pre-E2EE room, or an {enc:1,...}
 * envelope once the room has a DEK). The Worker never attempts to read either —
 * board assembly and the team/guardia filter now run on the phone, which holds
 * the Interno subkey.
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} sala
 */
export async function readInternoRelayBoard(env, db, sala) {
  const normalized = normalizeInternoSala(sala);
  if (!normalized) return null;

  const access = await getSalaInternoAccess(db, normalized);
  if (!access || access.is_active !== 1) {
    return { sala: normalized, active: false, inactive: true, entries: [], clinicalOps: null };
  }

  const room = await resolveRoomForSala(db, normalized);
  if (!room) {
    return { sala: normalized, active: true, entries: [], clinicalOps: null };
  }

  const state = await loadRoomState(env, db, String(room.id));
  return {
    sala: normalized,
    active: true,
    roomId: String(room.id),
    entries: state?.entries || [],
    clinicalOps: state?.clinicalOps ?? null,
  };
}

/**
 * Scope check without decryption: the patient must exist in this sala's room.
 * Looser than the old "must be on the active guardia handoff" check (which
 * needed to read decrypted clinicalOps), but still bounded to one sala/room —
 * an owner decision, not an oversight (see the Interno E2EE redesign plan).
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} sala
 * @param {string} patientId
 */
export async function assertInternoPatientOnBoard(env, db, sala, patientId) {
  const board = await readInternoRelayBoard(env, db, sala);
  if (!board?.active) {
    return { error: Response.json({ error: 'interno_inactive' }, { status: 403 }) };
  }
  const patients = entriesToPatients(board.entries);
  const exists = patients.some((row) => String(row.id) === String(patientId));
  if (!exists) {
    return { error: Response.json({ error: 'patient_out_of_scope' }, { status: 403 }) };
  }
  return { board, room: await resolveRoomForSala(db, sala) };
}
