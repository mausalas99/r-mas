import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations, SCHEMA_VERSION } from './schema.mjs';

describe('schema v26 cardio_images (R+ HF)', () => {
  it('fresh DB has a cardio_images table keyed by image_id', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.equal(SCHEMA_VERSION, 27);

    db.prepare(
      `INSERT INTO cardio_images
         (image_id, patient_id, kind, visit_module, visit_date, mime_type, base64, size_bytes, width, height, created_at)
       VALUES ('img1', 'p1', 'rxTorax', 'eventualidad', '2026-08-31', 'image/jpeg', 'YWJj', 3, 100, 100, '2026-08-31T00:00:00Z')`
    ).run();
    const row = db.prepare('SELECT * FROM cardio_images WHERE image_id = ?').get('img1');
    assert.equal(row.patient_id, 'p1');
    assert.equal(row.kind, 'rxTorax');

    assert.throws(() => {
      db.prepare(
        `INSERT INTO cardio_images
           (image_id, patient_id, kind, visit_module, visit_date, mime_type, base64, size_bytes, created_at)
         VALUES ('img1', 'p1', 'ekg', 'consultaIc', '2026-08-31', 'image/jpeg', 'YWJj', 3, '2026-08-31T00:00:00Z')`
      ).run();
    }, /UNIQUE constraint failed/);

    db.close();
  });

  it('is idempotent when re-applied at the current version', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    assert.doesNotThrow(() => applyMigrations(db));
    assert.equal(
      db.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get().value,
      String(SCHEMA_VERSION)
    );
    db.close();
  });
});
