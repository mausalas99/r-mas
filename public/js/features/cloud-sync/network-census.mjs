/**
 * Admin-only cross-area patient list ("network census"). One request —
 * `GET /admin/network-census` — hands back every sala's current room state
 * (still content-encrypted) plus its wrapped DEK in a single response; the
 * Worker reads all 8 rooms locally (8 D1 reads) instead of the client doing
 * 8 salas × (join + DEK fetch + pull) = 24 round trips over the network.
 * Only the DEK unwrap + content decrypt happen client-side, same as ever —
 * the Worker never sees an unwrapped key.
 */
import { unwrapAndCacheRoomDek } from './room-dek.mjs';
import { decryptRoomStateFromPull } from './cloud-sync-crypto-wire.mjs';

/**
 * Unwrap + decrypt one sala's row from the batched response. Never throws: a
 * failure (bad DEK, corrupt state) becomes an `error` row.
 * @param {{ sala: string, roomId?: string, code?: string, dek?: object|null, state?: object, error?: string }} row
 */
async function decryptOneSalaCensus(row) {
  if (row.error) return row;
  try {
    const dek = await unwrapAndCacheRoomDek(row.roomId, row.dek, row.code);
    const state = await decryptRoomStateFromPull(dek, row.state);
    return {
      sala: row.sala,
      roomId: row.roomId,
      code: row.code,
      entries: state?.entries || [],
      clinicalOps: state?.clinicalOps || null,
    };
  } catch (err) {
    return { sala: row.sala, roomId: row.roomId, code: row.code, error: err?.message || 'Error' };
  }
}

/**
 * Fetch + decrypt every sala's current room in one round trip. One row per
 * sala, in `CLOUD_SALAS` order (the Worker preserves that order). A sala with
 * no current room, or whose decrypt failed, gets an `error` row instead of
 * throwing — one bad room never blanks the whole view.
 * @param {ReturnType<import('./api-client.mjs').createCloudSyncApi>} api
 * @returns {Promise<Array<{ sala: string, roomId?: string, code?: string, entries?: object[], clinicalOps?: object|null, error?: string }>>}
 */
export async function fetchNetworkCensus(api) {
  const { salas } = await api.adminNetworkCensus();
  return Promise.all((salas || []).map(decryptOneSalaCensus));
}
