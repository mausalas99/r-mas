import fs from 'node:fs';
import path from 'node:path';
import { clearSessionEquiposPhotoRows } from './equipos-actions.mjs';
import { hasActiveCustodyOrWaitlist } from './equipos-board.mjs';

/**
 * @param {string} photosDir
 * @param {() => import('better-sqlite3').Database | null} getDb
 */
export function purgeEquiposPhotosIfIdle(photosDir, getDb) {
  const db = typeof getDb === 'function' ? getDb() : null;
  if (!db) return { skipped: true, reason: 'no_db' };
  if (hasActiveCustodyOrWaitlist(db)) {
    return { skipped: true, reason: 'active_queue' };
  }
  const sessionPhotos = db
    .prepare(`SELECT id, file_path FROM equipos_photos WHERE photo_kind IN ('pickup', 'return')`)
    .all();
  if (fs.existsSync(photosDir)) {
    for (const row of sessionPhotos) {
      const filePath = row.file_path || path.join(photosDir, `${row.id}.jpg`);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_e) {
        void _e;
      }
    }
  }
  clearSessionEquiposPhotoRows(db);
  db.prepare(
    `UPDATE equipos_sessions SET pickup_photo_id = NULL, return_photo_id = NULL
     WHERE pickup_photo_id IS NOT NULL OR return_photo_id IS NOT NULL`
  ).run();
  return { purged: true, removed: sessionPhotos.length };
}

/** @param {number} [nowMs] */
export function msUntilNextUtcSixAm(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 6, 0, 0, 0)
  );
  if (next.getTime() <= nowMs) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - nowMs;
}

/**
 * @param {string} photosDir
 * @param {() => import('better-sqlite3').Database | null} getDb
 */
export function scheduleEquiposPhotoPurge(photosDir, getDb) {
  const run = () => {
    try {
      purgeEquiposPhotosIfIdle(photosDir, getDb);
    } catch (e) {
      console.error('[equipos-purge]', e && e.message ? e.message : e);
    }
    setTimeout(run, 24 * 60 * 60 * 1000);
  };
  setTimeout(run, msUntilNextUtcSixAm());
}
