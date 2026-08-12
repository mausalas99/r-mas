import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from '../../db/schema.mjs';
import { upsertBlob, getBlob } from '../../db/clinical-blobs.mjs';
import { executeClinicalCommand } from '../index.mjs';

describe('clinical-repo persist + patient commands', () => {
  it('clinical.persistSnapshot writes subset of blobs and change_log', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    upsertBlob(db, 'notes', JSON.stringify({ p1: 'old' }));

    const res = executeClinicalCommand(
      db,
      {
        type: 'clinical.persistSnapshot',
        notes: { p1: 'nueva' },
        labHistory: { p1: [{ at: 't1' }] },
      },
      { actorId: 'u1', source: 'ui' }
    );

    assert.equal(res.ok, true);
    assert.ok(res.changeId);
    assert.deepEqual(res.changedKeys, ['notes', 'labHistory']);
    assert.deepEqual(res.notes, { p1: 'nueva' });
    assert.deepEqual(res.labHistory, { p1: [{ at: 't1' }] });
    assert.equal(res.patients, undefined);

    assert.equal(getBlob(db, 'notes'), JSON.stringify({ p1: 'nueva' }));
    assert.equal(getBlob(db, 'labHistory'), JSON.stringify({ p1: [{ at: 't1' }] }));

    const log = db
      .prepare('SELECT command_type, blob_keys, actor_id FROM clinical_change_log')
      .get();
    assert.equal(log.command_type, 'clinical.persistSnapshot');
    assert.equal(log.blob_keys, JSON.stringify(['notes', 'labHistory']));
    assert.equal(log.actor_id, 'u1');
    db.close();
  });

  it('clinical.persistSnapshot rejects empty snapshot', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const res = executeClinicalCommand(db, { type: 'clinical.persistSnapshot' });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'empty_snapshot');
    db.close();
  });

  it('patient.upsert writes patients blob and returns patients', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    upsertBlob(db, 'patients', JSON.stringify([{ id: 'p1', name: 'A' }]));

    const res = executeClinicalCommand(
      db,
      { type: 'patient.upsert', patient: { id: 'p2', name: 'B' } },
      { actorId: 'u1' }
    );
    assert.equal(res.ok, true);
    assert.deepEqual(res.changedKeys, ['patients']);
    assert.equal(res.patients.length, 2);
    assert.equal(res.patients[1].name, 'B');

    const patients = JSON.parse(getBlob(db, 'patients'));
    assert.equal(patients.length, 2);
    const log = db.prepare('SELECT command_type, patient_id FROM clinical_change_log').get();
    assert.equal(log.command_type, 'patient.upsert');
    assert.equal(log.patient_id, 'p2');
    db.close();
  });

  it('patient.delete removes row from patients blob only', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    upsertBlob(db, 'patients', JSON.stringify([{ id: 'p1' }, { id: 'p2' }]));
    upsertBlob(db, 'notes', JSON.stringify({ p1: 'keep' }));

    const res = executeClinicalCommand(db, { type: 'patient.delete', patientId: 'p1' });
    assert.equal(res.ok, true);
    assert.deepEqual(
      JSON.parse(getBlob(db, 'patients')).map((p) => p.id),
      ['p2']
    );
    assert.equal(getBlob(db, 'notes'), JSON.stringify({ p1: 'keep' }));
    db.close();
  });
});
