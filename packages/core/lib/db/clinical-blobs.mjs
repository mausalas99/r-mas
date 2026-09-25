/** @param {import('better-sqlite3').Database} db */
export function upsertBlob(db, blobKey, json, updatedAt = new Date().toISOString()) {
  db.prepare(
    `INSERT INTO clinical_blob (namespace, blob_key, json, updated_at)
     VALUES ('desktop', ?, ?, ?)
     ON CONFLICT(namespace, blob_key) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`
  ).run(blobKey, json, updatedAt);
}

/** @param {import('better-sqlite3').Database} db */
export function getBlob(db, blobKey) {
  const row = db
    .prepare(
      `SELECT json FROM clinical_blob WHERE namespace = 'desktop' AND blob_key = ?`
    )
    .get(blobKey);
  return row?.json ?? null;
}

/** @param {import('better-sqlite3').Database} db */
export function loadAllBlobs(db) {
  const rows = db
    .prepare(`SELECT blob_key, json FROM clinical_blob WHERE namespace = 'desktop'`)
    .all();
  const out = {};
  for (const r of rows) out[r.blob_key] = r.json;
  return out;
}

/** @param {import('better-sqlite3').Database} db @param {string} blobKey */
export function deleteBlob(db, blobKey) {
  const key = String(blobKey || '').trim();
  if (!key) return 0;
  const info = db
    .prepare(`DELETE FROM clinical_blob WHERE namespace = 'desktop' AND blob_key = ?`)
    .run(key);
  return info.changes;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string[]} blobKeys
 */
export function deleteBlobs(db, blobKeys) {
  const keys = (Array.isArray(blobKeys) ? blobKeys : [])
    .map((k) => String(k || '').trim())
    .filter(Boolean);
  if (!keys.length) return 0;
  const stmt = db.prepare(`DELETE FROM clinical_blob WHERE namespace = 'desktop' AND blob_key = ?`);
  const run = db.transaction(() => {
    let n = 0;
    for (const key of keys) n += stmt.run(key).changes;
    return n;
  });
  return run();
}
