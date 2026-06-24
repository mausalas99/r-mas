import { hasActiveCustodyOrWaitlist } from './board.js';
import { clearSessionEquiposPhotoRows } from './actions.js';
import { deletePhotoObjects } from './photos.js';

/**
 * Purge pickup/return photos at 06:00 UTC when queue is idle (matches LAN behavior).
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {import('@cloudflare/workers-types').R2Bucket} bucket
 */
export async function purgeEquiposPhotosIfIdle(db, bucket) {
  if (await hasActiveCustodyOrWaitlist(db)) {
    return { skipped: true, reason: 'active_queue' };
  }
  const { results } = await db
    .prepare(`SELECT id, file_path FROM equipos_photos WHERE photo_kind IN ('pickup', 'return')`)
    .all();
  const rows = results || [];
  const keys = rows.map((r) => r.file_path).filter(Boolean);
  if (keys.length) await deletePhotoObjects(bucket, keys);
  await clearSessionEquiposPhotoRows(db);
  await db
    .prepare(
      `UPDATE equipos_sessions SET pickup_photo_id = NULL, return_photo_id = NULL
       WHERE pickup_photo_id IS NOT NULL OR return_photo_id IS NOT NULL`
    )
    .run();
  return { purged: true, removed: rows.length };
}
