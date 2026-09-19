/**
 * Notify room DO peers after a successful D1 mutation commit.
 * @param {{ ROOM_SYNC_HUB?: import('@cloudflare/workers-types').DurableObjectNamespace }} env
 * @param {string} roomId
 * @param {number} revision
 */
export async function notifyRoomRevision(env, roomId, revision) {
  const hub = env?.ROOM_SYNC_HUB;
  const id = String(roomId || '').trim();
  const rev = Number(revision);
  if (!hub || !id || !Number.isFinite(rev) || rev <= 0) return;

  try {
    const stub = hub.get(hub.idFromName(id));
    void stub
      .fetch('https://room-sync-hub/notify', {
        method: 'POST',
        body: JSON.stringify({ revision: rev, at: new Date().toISOString() }),
      })
      .catch((err) => {
        console.warn('[rplus-sync] room revision notify failed:', err?.message || err);
      });
  } catch (err) {
    console.warn('[rplus-sync] room revision notify failed:', err?.message || err);
  }
}
