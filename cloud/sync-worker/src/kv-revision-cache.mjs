const REV_PREFIX = 'rev:';

/** Isolate-local circuit breaker after Free-tier daily KV write cap. */
let kvWritesBlockedUntil = 0;

/**
 * @param {unknown} err
 */
export function isKvPutQuotaError(err) {
  const msg = String(err?.message || err || '');
  return /limit exceeded/i.test(msg) || /too many requests/i.test(msg);
}

/** @returns {boolean} */
export function isKvWriteBlocked() {
  return kvWritesBlockedUntil > Date.now();
}

function msUntilUtcDayReset() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return Math.max(60_000, next.getTime() - now.getTime());
}

function blockKvWritesForDay() {
  kvWritesBlockedUntil = Date.now() + msUntilUtcDayReset();
}

/**
 * @param {import('@cloudflare/workers-types').KVNamespace | undefined} kv
 * @param {string} roomId
 */
export async function getCachedRoomRevision(kv, roomId) {
  if (!kv) return null;
  const id = String(roomId || '').trim();
  if (!id) return null;
  try {
    const raw = await kv.get(`${REV_PREFIX}${id}`);
    if (!raw) return null;
    const rev = Number(raw);
    return Number.isFinite(rev) && rev > 0 ? rev : null;
  } catch (err) {
    console.warn('[rplus-sync] KV revision cache get failed:', err?.message || err);
    return null;
  }
}

/**
 * Write revision hint after mutation commit only — never on pull.
 * Skips duplicate values, never uses TTL, pivots to D1-only when quota trips.
 * @param {import('@cloudflare/workers-types').KVNamespace | undefined} kv
 * @param {string} roomId
 * @param {number} revision
 */
export async function setCachedRoomRevision(kv, roomId, revision) {
  if (!kv || isKvWriteBlocked()) return;
  const id = String(roomId || '').trim();
  const rev = Number(revision);
  if (!id || !Number.isFinite(rev) || rev <= 0) return;

  const key = `${REV_PREFIX}${id}`;
  const value = String(rev);

  try {
    const existing = await kv.get(key);
    if (existing === value) return;
    await kv.put(key, value);
  } catch (err) {
    if (isKvPutQuotaError(err)) {
      blockKvWritesForDay();
      console.warn('[rplus-sync] KV write quota hit — revision hints disabled until UTC reset');
    } else {
      console.warn('[rplus-sync] KV revision cache put failed:', err?.message || err);
    }
  }
}
