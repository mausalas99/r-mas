import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { openTestDb } from '../db/test-open-db.mjs';
import {
  equiposCheckout,
  equiposReturn,
  equiposWaitlistJoin,
  equiposCreateAlert,
  equiposAckAlert,
  equiposAdminPurgeQueue,
  insertEquiposPhotoRow,
  EquiposError,
  buildEquiposBoard,
  verifyEquiposToken,
  getEquiposProgramAccess,
} from './equipos-db.mjs';

function openEquiposDb() {
  return openTestDb('ab'.repeat(32));
}

describe('equipos-db', () => {
  it('checkout and return with duration', () => {
    const { db, close } = openEquiposDb();
    try {
      equiposCheckout(db, {
        deviceType: 'ultrasound',
        reporterName: 'Ana López',
        rotation: 'Sala 1',
      });
      const board = buildEquiposBoard(db);
      assert.equal(board.devices.find((d) => d.device_type === 'ultrasound').status, 'in_use');
      equiposReturn(db, {
        deviceType: 'ultrasound',
        reporterName: 'Ana López',
        rotation: 'Sala 1',
      });
      const sessions = db.prepare(`SELECT * FROM equipos_sessions`).all();
      assert.equal(sessions.length, 1);
      assert.ok(sessions[0].duration_seconds >= 0);
      assert.equal(sessions[0].closed_reason, 'return');
    } finally {
      close();
    }
  });

  it('lumify return requires chargePct', () => {
    const { db, close } = openEquiposDb();
    try {
      assert.throws(
        () =>
          equiposReturn(db, {
            deviceType: 'lumify',
            reporterName: 'Ana López',
            rotation: 'Sala 1',
          }),
        (e) => e instanceof EquiposError && e.code === 'not_in_use'
      );
      equiposCheckout(db, {
        deviceType: 'lumify',
        reporterName: 'Ana López',
        rotation: 'Sala 1',
        pickupPhotoId: 'photo-1',
      });
      assert.throws(
        () =>
          equiposReturn(db, {
            deviceType: 'lumify',
            reporterName: 'Ana López',
            rotation: 'Sala 1',
            returnPhotoId: 'photo-2',
          }),
        (e) => e instanceof EquiposError && e.code === 'charge_required'
      );
      equiposReturn(db, {
        deviceType: 'lumify',
        reporterName: 'Ana López',
        rotation: 'Sala 1',
        chargePct: 55,
        gelEmpty: false,
        returnPhotoId: 'photo-2',
      });
      const dev = db.prepare(`SELECT charge_pct FROM equipos_device WHERE device_type = 'lumify'`).get();
      assert.equal(dev.charge_pct, 55);
    } finally {
      close();
    }
  });

  it('lumify pickup charge optional', () => {
    const { db, close } = openEquiposDb();
    try {
      equiposCheckout(db, {
        deviceType: 'lumify',
        reporterName: 'Bob Smith',
        rotation: 'Sala 2',
        pickupPhotoId: 'p1',
      });
      const session = db.prepare(`SELECT lumify_pickup_charge_pct FROM equipos_sessions`).get();
      assert.equal(session.lumify_pickup_charge_pct, null);
    } finally {
      close();
    }
  });

  it('waitlist join when in use', () => {
    const { db, close } = openEquiposDb();
    try {
      equiposCheckout(db, {
        deviceType: 'ekg',
        reporterName: 'Holder',
        rotation: 'Sala 1',
        pickupPhotoId: 'p',
      });
      equiposWaitlistJoin(db, {
        deviceType: 'ekg',
        reporterName: 'Waiter',
        rotation: 'Sala 2',
      });
      const wl = db.prepare(`SELECT COUNT(*) AS c FROM equipos_waitlist`).get().c;
      assert.equal(wl, 1);
    } finally {
      close();
    }
  });

  it('alert and ack', () => {
    const { db, close } = openEquiposDb();
    try {
      const photoId = 'photo-alert-1';
      insertEquiposPhotoRow(db, {
        id: photoId,
        deviceType: 'ekg',
        photoKind: 'alert',
        filePath: '/tmp/alert.jpg',
        capturedAt: new Date().toISOString(),
      });
      const { id } = equiposCreateAlert(db, {
        deviceType: 'ekg',
        kind: 'malfunction',
        reporterName: 'Rep',
        rotation: 'Torre HU',
        message: 'Cable roto',
        photoId,
      });
      const report = db.prepare(`SELECT photo_id FROM equipos_team_reports WHERE id = ?`).get(id);
      assert.equal(report.photo_id, photoId);
      const linked = db.prepare(`SELECT report_id FROM equipos_photos WHERE id = ?`).get(photoId);
      assert.equal(linked.report_id, id);
      equiposAckAlert(db, id, { reporterName: 'Admin', rotation: 'Sala E' });
      const active = db.prepare(`SELECT COUNT(*) AS c FROM equipos_team_reports WHERE active = 1`).get().c;
      assert.equal(active, 0);
    } finally {
      close();
    }
  });

  it('alert requires photo', () => {
    const { db, close } = openEquiposDb();
    try {
      assert.throws(
        () =>
          equiposCreateAlert(db, {
            deviceType: 'ekg',
            kind: 'malfunction',
            reporterName: 'Rep',
            rotation: 'Torre HU',
          }),
        (e) => e instanceof EquiposError && e.code === 'photo_required'
      );
    } finally {
      close();
    }
  });

  it('admin purge clears waitlist and custody', () => {
    const { db, close } = openEquiposDb();
    try {
      equiposCheckout(db, {
        deviceType: 'ultrasound',
        reporterName: 'Xavier López',
        rotation: 'Sala 1',
      });
      equiposWaitlistJoin(db, {
        deviceType: 'ultrasound',
        reporterName: 'Yolanda Pérez',
        rotation: 'Sala 2',
      });
      const results = equiposAdminPurgeQueue(db, {
        deviceType: 'ultrasound',
        adminName: 'R4',
      });
      assert.equal(results[0].hadCustody, true);
      assert.ok(results[0].cleared >= 1);
      const dev = db.prepare(`SELECT status FROM equipos_device WHERE device_type = 'ultrasound'`).get();
      assert.equal(dev.status, 'available');
    } finally {
      close();
    }
  });

  it('verifyEquiposToken', () => {
    const { db, close } = openEquiposDb();
    try {
      const row = getEquiposProgramAccess(db);
      assert.ok(verifyEquiposToken(db, row.access_token));
      assert.equal(verifyEquiposToken(db, 'bad'), false);
    } finally {
      close();
    }
  });
});
