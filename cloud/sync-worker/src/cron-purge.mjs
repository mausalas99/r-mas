import { mutationPruneCeiling } from './pull-strategy.js';
import { QUOTAS } from './quotas.js';

/**
 * Daily maintenance — expired sessions, stale D1 tombstones, old mutation tails.
 * @param {{ DB?: import('@cloudflare/workers-types').D1Database }} env
 */
export async function runScheduledPurge(env) {
  const db = env.DB;
  if (!db) return { ok: false, reason: 'no_db' };

  const now = new Date().toISOString();
  const tombstoneCutoff = new Date(
    Date.now() - QUOTAS.tombstoneMaxAgeDays * 864e5
  ).toISOString();

  const sessionsResult = await db
    .prepare('DELETE FROM sessions WHERE expires_at <= ?')
    .bind(now)
    .run();

  const tombstonesResult = await db
    .prepare('DELETE FROM tombstones WHERE deleted_at < ?')
    .bind(tombstoneCutoff)
    .run();

  const { results: rooms } = await db.prepare('SELECT id, revision FROM rooms').all();
  let mutationsDeleted = 0;
  for (const row of rooms ?? []) {
    const ceiling = mutationPruneCeiling(Number(row.revision));
    if (ceiling <= 0) continue;
    const pruned = await db
      .prepare('DELETE FROM mutations WHERE room_id = ? AND revision <= ?')
      .bind(String(row.id), ceiling)
      .run();
    mutationsDeleted += Number(pruned.meta?.changes ?? 0);
  }

  return {
    ok: true,
    sessionsDeleted: Number(sessionsResult.meta?.changes ?? 0),
    tombstonesDeleted: Number(tombstonesResult.meta?.changes ?? 0),
    mutationsDeleted,
  };
}
