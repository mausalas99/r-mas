import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from '../../db/schema.mjs';
import { upsertBlob, getBlob } from '../../db/clinical-blobs.mjs';
import { executeClinicalCommand } from '../index.mjs';

describe('clinical-repo eventualidades commands', () => {
  it('upsert writes patients blob and change_log row', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    upsertBlob(
      db,
      'patients',
      JSON.stringify([{ id: 'p1', name: 'A', eventualidades: { entries: [], labsText: '' } }])
    );

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
    assert.ok(res.changeId);
    assert.deepEqual(res.changedKeys, ['patients']);

    const patients = JSON.parse(getBlob(db, 'patients'));
    assert.equal(patients[0].eventualidades.entries.length, 1);
    assert.equal(patients[0].eventualidades.entries[0].text, '2 U GR');

    const log = db
      .prepare('SELECT change_id, command_type, blob_keys, patient_id, actor_id, synced_at FROM clinical_change_log')
      .get();
    assert.equal(log.change_id, res.changeId);
    assert.equal(log.command_type, 'eventualidad.upsert');
    assert.equal(log.blob_keys, JSON.stringify(['patients']));
    assert.equal(log.patient_id, 'p1');
    assert.equal(log.actor_id, 'u1');
    assert.equal(log.synced_at, null);

    db.close();
  });

  it('delete stamps deletedIds in blob', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    upsertBlob(
      db,
      'patients',
      JSON.stringify([
        {
          id: 'p1',
          eventualidades: {
            entries: [{ id: 'ev_1', at: '2026-08-01T18:00:00.000Z', text: 'X' }],
            labsText: '',
          },
        },
      ])
    );

    const res = executeClinicalCommand(db, {
      type: 'eventualidad.delete',
      patientId: 'p1',
      entryId: 'ev_1',
    });
    assert.equal(res.ok, true);
    const patients = JSON.parse(getBlob(db, 'patients'));
    assert.equal(patients[0].eventualidades.entries.length, 0);
    assert.ok(patients[0].eventualidades.deletedIds.ev_1);
    db.close();
  });
});
