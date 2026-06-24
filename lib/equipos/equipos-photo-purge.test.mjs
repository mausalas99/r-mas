import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openTestDb } from '../db/test-open-db.mjs';
import { equiposCheckout, insertEquiposPhotoRow } from './equipos-actions.mjs';
import { hasActiveCustodyOrWaitlist } from './equipos-board.mjs';
import { purgeEquiposPhotosIfIdle, msUntilNextUtcSixAm } from './equipos-photo-purge.mjs';

describe('equipos-photo-purge', () => {
  it('msUntilNextUtcSixAm is positive', () => {
    assert.ok(msUntilNextUtcSixAm() > 0);
  });

  it('skips purge when custody active', () => {
    const { db, close } = openTestDb('ab'.repeat(32));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'equipos-photos-'));
    equiposCheckout(db, {
      deviceType: 'ultrasound',
      reporterName: 'Ana López',
      rotation: 'Sala 1',
    });
    const out = purgeEquiposPhotosIfIdle(tmp, () => db);
    assert.equal(out.skipped, true);
    assert.equal(out.reason, 'active_queue');
    assert.ok(hasActiveCustodyOrWaitlist(db));
    close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('keeps alert photos when purging idle session photos', () => {
    const { db, close } = openTestDb('ab'.repeat(32));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'equipos-photos-'));
    const alertPath = path.join(tmp, 'alert.jpg');
    fs.writeFileSync(alertPath, 'x');
    insertEquiposPhotoRow(db, {
      id: 'alert-photo',
      deviceType: 'lumify',
      photoKind: 'alert',
      filePath: alertPath,
      capturedAt: new Date().toISOString(),
    });
    const out = purgeEquiposPhotosIfIdle(tmp, () => db);
    assert.equal(out.purged, true);
    assert.ok(fs.existsSync(alertPath));
    const row = db.prepare(`SELECT id FROM equipos_photos WHERE id = 'alert-photo'`).get();
    assert.ok(row);
    close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
