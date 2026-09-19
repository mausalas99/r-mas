/** @param {import('better-sqlite3').Database} db */
export function migrateToV26CardioImages(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cardio_images (
      image_id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      visit_module TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      base64 TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cardio_images_patient
      ON cardio_images(patient_id, created_at DESC);
  `);
  db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run('schema_version', '26');
}
