/**
 * Push Interno MIP access tokens to Worker D1 when admin rotates/toggles locally.
 */
import { createCloudSyncApi } from './api-client.mjs';
import {
  advanceSalaRoomRevision,
  ensureTurnRoomForSala,
  getSalaRoomCache,
} from './cloud-clinical-ops-sala.mjs';
import { isCloudSyncActive } from './lan-override.mjs';
import {
  enqueueInternoAccessUpsert,
  resolveCloudActorId,
} from './mutate-bridge.mjs';
import {
  buildInternoAccessUpsertOp,
  internoAccessMutationId,
} from './mutate-bridge-ops.mjs';
import { isCloudSala, normalizeCloudSala } from './sala-allowlist.mjs';
import { getCloudSyncToken, getCloudSyncUrl } from './settings.mjs';

export { buildInternoAccessUpsertOp, internoAccessMutationId, enqueueInternoAccessUpsert };

/**
 * @param {string} sala
 * @param {{ sala?: string, access_token?: string, is_active?: number, rotated_at?: string|null, rotated_by?: string|null }} row
 */
export async function pushInternoAccessToCloud(sala, row) {
  if (!isCloudSyncActive() || !getCloudSyncToken()) {
    return { ok: false, reason: 'bridge_inactive' };
  }
  const payload = row && typeof row === 'object' ? row : {};
  const normalized = normalizeCloudSala(sala || payload.sala);
  if (!isCloudSala(normalized)) return { ok: false, reason: 'invalid_sala' };

  const room = await ensureTurnRoomForSala(normalized);
  if (!room?.id) return { ok: false, reason: 'no_room' };

  const op = buildInternoAccessUpsertOp({ ...payload, sala: normalized });
  const api = createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken,
  });
  const mutationId = internoAccessMutationId({ ...payload, sala: normalized });
  const result = await api.push(String(room.id), {
    clientMutationId: mutationId,
    ops: [op],
    baseRevision: getSalaRoomCache(normalized).revision ?? 0,
  });
  if (result?.revision != null) {
    advanceSalaRoomRevision(normalized, Number(result.revision));
  }
  return {
    ok: true,
    sala: normalized,
    roomId: String(room.id),
    mutationId,
    actorId: resolveCloudActorId(),
    applied: Array.isArray(result?.applied) ? result.applied.length : 1,
  };
}
