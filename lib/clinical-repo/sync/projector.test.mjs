import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from '../../db/schema.mjs';
import { upsertBlob } from '../../db/clinical-blobs.mjs';
import { executeClinicalCommand } from '../index.mjs';
import { projectUnsyncedClinicalChanges } from './projector.mjs';

function openDbWithPatient() {
  const db = new Database(':memory:');
  applyMigrations(db);
  upsertBlob(
    db,
    'patients',
    JSON.stringify([
      {
        id: 'p1',
        name: 'A',
        eventualidades: {
          entries: [],
          labsText: '',
          updatedAt: '2026-08-05T10:00:00.000Z',
        },
      },
    ])
  );
  return db;
}

describe('clinical-repo sync projector', () => {
  it('drains change_log into outbox ops and marks synced_at', () => {
    const db = openDbWithPatient();
    const res = executeClinicalCommand(
      db,
      {
        type: 'eventualidad.upsert',
        patientId: 'p1',
        entry: { text: '2 U GR', kind: 'transfusion', at: '2026-08-05T18:00:00.000Z' },
      },
      { actorId: 'u1', source: 'ui' }
    );
    assert.equal(res.ok, true);

    /** @type {{ clientMutationId: string, ops: unknown[] }[]} */
    const enqueued = [];
    const out = projectUnsyncedClinicalChanges(db, {
      enqueue: (item) => {
        enqueued.push(item);
      },
      actorId: 'u1',
      nowIso: '2026-08-11T15:00:00.000Z',
    });

    assert.equal(out.ok, true);
    assert.equal(out.projected, 1);
    assert.equal(enqueued.length, 1);
    assert.equal(enqueued[0].clientMutationId, res.changeId);
    assert.equal(enqueued[0].ops.length, 1);
    assert.equal(enqueued[0].ops[0].path, 'entries/p1/eventualidades');
    assert.equal(enqueued[0].ops[0].value.entries.length, 1);
    assert.equal(enqueued[0].ops[0].value.entries[0].text, '2 U GR');

    const row = db.prepare('SELECT synced_at FROM clinical_change_log WHERE change_id = ?').get(res.changeId);
    assert.equal(row.synced_at, '2026-08-11T15:00:00.000Z');
    db.close();
  });

  it('is idempotent per change_id (second drain enqueues nothing)', () => {
    const db = openDbWithPatient();
    const res = executeClinicalCommand(
      db,
      {
        type: 'eventualidades.labs.set',
        patientId: 'p1',
        text: 'Hb 11',
      },
      { actorId: 'u1', source: 'ui' }
    );
    assert.equal(res.ok, true);

    /** @type {string[]} */
    const ids = [];
    const enqueue = (item) => {
      ids.push(item.clientMutationId);
    };
    const first = projectUnsyncedClinicalChanges(db, { enqueue, actorId: 'u1', nowIso: '2026-08-11T15:00:00.000Z' });
    const second = projectUnsyncedClinicalChanges(db, { enqueue, actorId: 'u1', nowIso: '2026-08-11T15:01:00.000Z' });
    assert.equal(first.projected, 1);
    assert.equal(second.projected, 0);
    assert.deepEqual(ids, [res.changeId]);
    db.close();
  });

  it('skips sync-apply origin rows (no echo enqueue)', () => {
    const db = openDbWithPatient();
    const res = executeClinicalCommand(
      db,
      {
        type: 'eventualidad.upsert',
        patientId: 'p1',
        entry: { text: 'from pull', at: '2026-08-05T18:00:00.000Z' },
      },
      { actorId: 'peer', source: 'sync-apply' }
    );
    assert.equal(res.ok, true);

    const enqueued = [];
    const out = projectUnsyncedClinicalChanges(db, {
      enqueue: (item) => enqueued.push(item),
      actorId: 'local',
      nowIso: '2026-08-11T15:00:00.000Z',
    });
    assert.equal(out.projected, 0);
    assert.equal(enqueued.length, 0);
    const row = db.prepare('SELECT synced_at, origin FROM clinical_change_log WHERE change_id = ?').get(res.changeId);
    assert.equal(row.origin, 'sync-apply');
    assert.ok(row.synced_at, 'sync-apply rows still get synced_at so they leave the drain queue');
    db.close();
  });

  it('survives crash before project: restart drains without duplicate mutation ids', () => {
    const db = openDbWithPatient();
    const res = executeClinicalCommand(
      db,
      {
        type: 'eventualidad.upsert',
        patientId: 'p1',
        entry: { text: 'crash-safe', at: '2026-08-05T18:00:00.000Z' },
      },
      { actorId: 'u1', source: 'ui' }
    );
    // Simulate crash: change_log committed, projector never ran.
    const pending = db.prepare('SELECT synced_at FROM clinical_change_log WHERE change_id = ?').get(res.changeId);
    assert.equal(pending.synced_at, null);

    const seen = new Map();
    const enqueue = (item) => {
      seen.set(item.clientMutationId, item);
    };
    projectUnsyncedClinicalChanges(db, { enqueue, actorId: 'u1', nowIso: '2026-08-11T16:00:00.000Z' });
    projectUnsyncedClinicalChanges(db, { enqueue, actorId: 'u1', nowIso: '2026-08-11T16:01:00.000Z' });
    assert.equal(seen.size, 1);
    assert.ok(seen.has(res.changeId));
    db.close();
  });

  it('can collect without marking when markSynced is false', () => {
    const db = openDbWithPatient();
    const res = executeClinicalCommand(
      db,
      {
        type: 'eventualidad.upsert',
        patientId: 'p1',
        entry: { text: 'defer mark', at: '2026-08-05T18:00:00.000Z' },
      },
      { actorId: 'u1', source: 'ui' }
    );
    const enqueued = [];
    const out = projectUnsyncedClinicalChanges(db, {
      enqueue: (item) => enqueued.push(item),
      actorId: 'u1',
      nowIso: '2026-08-11T17:00:00.000Z',
      markSynced: false,
    });
    assert.equal(out.projected, 1);
    assert.equal(enqueued.length, 1);
    const row = db.prepare('SELECT synced_at FROM clinical_change_log WHERE change_id = ?').get(res.changeId);
    assert.equal(row.synced_at, null);
    db.close();
  });

  it('patient.upsert drains to entries fields op', () => {
    const db = openDbWithPatient();
    const res = executeClinicalCommand(
      db,
      {
        type: 'patient.upsert',
        patient: {
          id: 'p2',
          nombre: 'Nuevo',
          registro: '555',
          lanUpdatedAt: '2026-08-11T11:00:00.000Z',
        },
      },
      { actorId: 'u1', source: 'ui' }
    );
    assert.equal(res.ok, true);

    const enqueued = [];
    const out = projectUnsyncedClinicalChanges(db, {
      enqueue: (item) => enqueued.push(item),
      actorId: 'u1',
      nowIso: '2026-08-11T15:00:00.000Z',
    });
    assert.equal(out.ok, true);
    assert.equal(out.projected, 1);
    assert.equal(enqueued[0].clientMutationId, res.changeId);
    const paths = enqueued[0].ops.map((op) => op.path);
    assert.ok(paths.includes('entries/p2/fields'));
    assert.ok(paths.includes('entries/p2'));
    db.close();
  });

  it('patient.delete drains to tombstone op', () => {
    const db = openDbWithPatient();
    const res = executeClinicalCommand(
      db,
      { type: 'patient.delete', patientId: 'p1' },
      { actorId: 'u1', source: 'ui' }
    );
    assert.equal(res.ok, true);

    const enqueued = [];
    const out = projectUnsyncedClinicalChanges(db, {
      enqueue: (item) => enqueued.push(item),
      actorId: 'u1',
      nowIso: '2026-08-11T15:00:00.000Z',
    });
    assert.equal(out.projected, 1);
    assert.equal(enqueued[0].ops[0].path, 'tombstones/p1');
    assert.equal(enqueued[0].ops[0].value.deletedAt, enqueued[0].ops[0].updatedAt);
    db.close();
  });

  it('patient.delete tombstone includes registro when on command payload', () => {
    const db = openDbWithPatient();
    const res = executeClinicalCommand(
      db,
      { type: 'patient.delete', patientId: 'p1', registro: '2166042-4' },
      { actorId: 'u1', source: 'ui' }
    );
    assert.equal(res.ok, true);

    const enqueued = [];
    projectUnsyncedClinicalChanges(db, {
      enqueue: (item) => enqueued.push(item),
      actorId: 'u1',
      nowIso: '2026-08-11T15:00:00.000Z',
    });
    assert.equal(enqueued[0].ops[0].path, 'tombstones/p1');
    assert.equal(enqueued[0].ops[0].value.registro, '2166042-4');
    db.close();
  });

  it('clinical.persistSnapshot drains notes blob to entry note ops', () => {
    const db = openDbWithPatient();
    const res = executeClinicalCommand(
      db,
      {
        type: 'clinical.persistSnapshot',
        notes: { p1: { texto: 'persistida', updatedAt: '2026-08-11T09:30:00.000Z' } },
      },
      { actorId: 'u1', source: 'ui' }
    );
    assert.equal(res.ok, true);

    const enqueued = [];
    const out = projectUnsyncedClinicalChanges(db, {
      enqueue: (item) => enqueued.push(item),
      actorId: 'u1',
      nowIso: '2026-08-11T15:00:00.000Z',
    });
    assert.equal(out.projected, 1);
    assert.equal(enqueued[0].ops[0].path, 'entries/p1/note');
    assert.equal(enqueued[0].ops[0].value.texto, 'persistida');
    db.close();
  });

  it('unknown command types land in skipIds without crashing', () => {
    const db = openDbWithPatient();
    db.prepare(
      `INSERT INTO clinical_change_log
        (change_id, command_type, blob_keys, patient_id, actor_id, origin, created_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`
    ).run(
      'chg_unknown_1',
      'future.unknown',
      JSON.stringify(['patients']),
      'p1',
      'u1',
      'ui',
      '2026-08-11T15:00:00.000Z'
    );

    const enqueued = [];
    const out = projectUnsyncedClinicalChanges(db, {
      enqueue: (item) => enqueued.push(item),
      actorId: 'u1',
      nowIso: '2026-08-11T16:00:00.000Z',
    });
    assert.equal(out.projected, 0);
    assert.equal(enqueued.length, 0);
    assert.deepEqual(out.skipIds, ['chg_unknown_1']);
    const row = db.prepare('SELECT synced_at FROM clinical_change_log WHERE change_id = ?').get('chg_unknown_1');
    assert.equal(row.synced_at, '2026-08-11T16:00:00.000Z');
    db.close();
  });

});
