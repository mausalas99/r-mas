const REV_PREFIX = 'rev:';
/** KV TTL — revision hints only; D1 remains authoritative on mismatch. */
const REV_TTL_SECONDS = 3600;

/**
 * @param {import('@cloudflare/workers-types').KVNamespace | undefined} kv
 * @param {string} roomId
 */
export async function getCachedRoomRevision(kv, roomId) {
  if (!kv) return null;
  const id = String(roomId || '').trim();
  if (!id) return null;
  const raw = await kv.get(`${REV_PREFIX}${id}`);
  if (!raw) return null;
  const rev = Number(raw);
  return Number.isFinite(rev) && rev > 0 ? rev : null;
}

/**
 * @param {import('@cloudflare/workers-types').KVNamespace | undefined} kv
 * @param {string} roomId
 * @param {number} revision
 */
export async function setCachedRoomRevision(kv, roomId, revision) {
  if (!kv) return;
  const id = String(roomId || '').trim();
  const rev = Number(revision);
  if (!id || !Number.isFinite(rev) || rev <= 0) return;
  await kv.put(`${REV_PREFIX}${id}`, String(rev), { expirationTtl: REV_TTL_SECONDS });
}
