/**
 * Above this, the broadcast drops `ops` and falls back to a bare revision hint —
 * every peer re-pulls instead, same as before this carried real data. Comfortably
 * above what even a big batched census/monitoreo push produces, small enough to
 * never strain the WebSocket line.
 */
export const MAX_BROADCAST_OPS_BYTES = 32 * 1024;

/**
 * Notify room DO peers after a successful D1 mutation commit. `ops` are the
 * exact ops this commit applied (already encrypted at the source — registro/
 * diagnosis included, see cloud-sync-crypto-wire.mjs's Part A — so this never
 * needs to unlock-then-relock anything before forwarding). Carried verbatim in
 * the broadcast when small enough; a peer applies them immediately instead of
 * making a second pull round trip. Omitted above MAX_BROADCAST_OPS_BYTES — the
 * peer's existing debounced revision-hint pull is the safety net either way.
 * @param {{ ROOM_SYNC_HUB?: import('@cloudflare/workers-types').DurableObjectNamespace }} env
 * @param {string} roomId
 * @param {number} revision
 * @param {unknown[]} [ops]
 * @param {{ waitUntil(p: Promise<unknown>): void }} [ctx] when given, the
 *   notify runs under waitUntil and the caller does not wait for it
 */
export async function notifyRoomRevision(env, roomId, revision, ops, ctx) {
  const hub = env?.ROOM_SYNC_HUB;
  const id = String(roomId || '').trim();
  const rev = Number(revision);
  if (!hub || !id || !Number.isFinite(rev) || rev <= 0) return;

  const payload = { revision: rev, at: new Date().toISOString() };
  if (Array.isArray(ops) && ops.length) {
    const opsBytes = new TextEncoder().encode(JSON.stringify(ops)).length;
    if (opsBytes <= MAX_BROADCAST_OPS_BYTES) payload.ops = ops;
  }

  // Never fire-and-forget without ctx: the runtime may tear the request down
  // as soon as the Response returns, cancelling the subrequest. waitUntil
  // keeps it alive past the response. A notify lost anyway (DO error) is
  // covered by the clients' fallback poll (cloud-sync-timing.mjs).
  const send = (async () => {
    try {
      const stub = hub.get(hub.idFromName(id));
      await stub.fetch('https://room-sync-hub/notify', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('[rplus-sync] room revision notify failed:', err?.message || err);
    }
  })();
  if (ctx?.waitUntil) ctx.waitUntil(send);
  else await send;
}
