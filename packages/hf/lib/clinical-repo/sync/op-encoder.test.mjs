import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeClinicalChangeOps } from './op-encoder.mjs';

describe('encodeClinicalChangeOps dispatch', () => {
  it('dispatches patient.upsert and patient.delete', () => {
    const upsert = encodeClinicalChangeOps({
      commandType: 'patient.upsert',
      patientId: 'p1',
      patients: [{ id: 'p1', nombre: 'A', lanUpdatedAt: '2026-08-11T10:00:00.000Z' }],
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
    });
    assert.ok(upsert.some((op) => op.path === 'entries/p1/fields'));

    const del = encodeClinicalChangeOps({
      commandType: 'patient.delete',
      patientId: 'p1',
      patients: [],
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
    });
    assert.equal(del[0].path, 'tombstones/p1');
  });

  it('dispatches clinical.persistSnapshot', () => {
    const ops = encodeClinicalChangeOps({
      commandType: 'clinical.persistSnapshot',
      blobKeys: ['notes'],
      blobs: { notes: { p1: { texto: 'x' } } },
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
    });
    assert.equal(ops[0].path, 'entries/p1/note');
  });

  it('returns empty for unknown types (projector skip)', () => {
    assert.deepEqual(
      encodeClinicalChangeOps({
        commandType: 'unknown.cmd',
        patientId: 'p1',
        patients: [],
        actorId: 'u1',
        fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
      }),
      []
    );
  });
});
