import { CLOUD_SALAS } from './sala-allowlist.js';

/** @param {{ ROOM_SYNC_HUB?: unknown }} env */
export function buildMetaPayload(env) {
  return {
    ok: true,
    service: 'rplus-sync',
    salas: [...CLOUD_SALAS],
    features: {
      revisionWs: !!env.ROOM_SYNC_HUB,
    },
  };
}

/** @param {{ ROOM_SYNC_HUB?: unknown }} env */
export function handleMeta(env) {
  return Response.json(buildMetaPayload(env));
}
