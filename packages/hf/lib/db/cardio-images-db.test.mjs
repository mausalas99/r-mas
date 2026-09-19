import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import {
  insertCardioImage,
  listCardioImages,
  listCardioImagesForVisit,
  getCardioImage,
  deleteCardioImage,
  sumCardioImageBytes,
} from './cardio-images-db.mjs';

function makeDb() {
  var db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

function record(overrides) {
  return Object.assign(
    {
      imageId: 'img1',
      patientId: 'p1',
      kind: 'rxTorax',
      visitModule: 'eventualidad',
      visitDate: '2026-08-31',
      mimeType: 'image/jpeg',
      base64: 'YWJj',
      sizeBytes: 3,
      width: 100,
      height: 100,
      createdAt: '2026-08-31T00:00:00Z',
    },
    overrides
  );
}

test('insert + list + get + delete round-trip, scoped by patient', () => {
  var db = makeDb();
  insertCardioImage(db, record({ imageId: 'img1', patientId: 'p1' }));
  insertCardioImage(db, record({ imageId: 'img2', patientId: 'p1', kind: 'ekg' }));
  insertCardioImage(db, record({ imageId: 'img3', patientId: 'p2' }));

  var listP1 = listCardioImages(db, 'p1');
  assert.equal(listP1.length, 2);
  assert.equal(listP1.every((r) => r.base64 === undefined), true, 'list omits base64 payload');

  var full = getCardioImage(db, 'img1');
  assert.equal(full.base64, 'YWJj');

  assert.equal(sumCardioImageBytes(db, 'p1'), 6);
  assert.equal(sumCardioImageBytes(db, 'p2'), 3);

  assert.equal(deleteCardioImage(db, 'img1'), true);
  assert.equal(listCardioImages(db, 'p1').length, 1);
  assert.equal(deleteCardioImage(db, 'img1'), false, 'already deleted');

  db.close();
});

test('listCardioImagesForVisit scopes by visit and includes base64', () => {
  var db = makeDb();
  insertCardioImage(db, record({ imageId: 'img1', visitModule: 'eventualidad', visitDate: '2026-08-31' }));
  insertCardioImage(db, record({ imageId: 'img2', visitModule: 'eventualidad', visitDate: '2026-08-30' }));
  insertCardioImage(db, record({ imageId: 'img3', visitModule: 'consultaIc', visitDate: '2026-08-31' }));

  var forVisit = listCardioImagesForVisit(db, 'p1', 'eventualidad', '2026-08-31');
  assert.equal(forVisit.length, 1);
  assert.equal(forVisit[0].imageId, 'img1');
  assert.equal(forVisit[0].base64, 'YWJj');

  db.close();
});
