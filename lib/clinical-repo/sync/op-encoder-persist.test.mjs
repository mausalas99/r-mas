import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodePersistSnapshotOps } from './op-encoder-persist.mjs';

describe('op-encoder-persist', () => {
  it('maps patients blob to per-patient fields ops', () => {
    const ops = encodePersistSnapshotOps({
      commandType: 'clinical.persistSnapshot',
      blobKeys: ['patients'],
      blobs: {
        patients: [
          { id: 'p1', nombre: 'A', lanUpdatedAt: '2026-08-11T09:00:00.000Z' },
          { id: 'demo-x', nombre: 'skip' },
        ],
      },
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
    });
    assert.equal(ops.length, 1);
    assert.equal(ops[0].path, 'entries/p1/fields');
    assert.equal(ops[0].value.nombre, 'A');
    assert.equal(ops[0].updatedAt, '2026-08-11T09:00:00.000Z');
  });

  it('maps notes and indicaciones to entry paths', () => {
    const ops = encodePersistSnapshotOps({
      commandType: 'clinical.persistSnapshot',
      blobKeys: ['notes', 'indicaciones'],
      blobs: {
        notes: { p1: { texto: 'nota', updatedAt: '2026-08-11T08:00:00.000Z' } },
        indicaciones: { p1: { texto: 'rx' } },
      },
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
    });
    const noteOp = ops.find((op) => op.path === 'entries/p1/note');
    const indOp = ops.find((op) => op.path === 'entries/p1/indicaciones');
    assert.ok(noteOp);
    assert.deepEqual(noteOp.value, { texto: 'nota', updatedAt: '2026-08-11T08:00:00.000Z' });
    assert.equal(noteOp.updatedAt, '2026-08-11T08:00:00.000Z');
    assert.ok(indOp);
    assert.deepEqual(indOp.value, { texto: 'rx' });
    assert.equal(indOp.updatedAt, '2026-08-11T12:00:00.000Z');
  });

  it('maps labHistory sets to labSidecars paths', () => {
    const ops = encodePersistSnapshotOps({
      commandType: 'clinical.persistSnapshot',
      blobKeys: ['labHistory'],
      blobs: {
        labHistory: {
          p1: [
            { id: 'lab1', fecha: '2026-08-01', valores: { Hb: 10 } },
            { fecha: '2026-08-02', valores: { Na: 140 } },
          ],
        },
      },
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
    });
    assert.equal(ops.length, 2);
    assert.equal(ops[0].path, 'labSidecars/p1/lab1');
    assert.equal(ops[1].path, 'labSidecars/p1/2026-08-02');
  });

  it('skips med/vpo/listado keys (no blobs/* — Worker rejects unsupported_path)', () => {
    const ops = encodePersistSnapshotOps({
      commandType: 'clinical.persistSnapshot',
      blobKeys: [
        'vpoByPatient',
        'listadoProblemas',
        'medRecetaByPatient',
        'medPharmProfileByPatient',
        'recetaHuByPatient',
      ],
      blobs: {
        vpoByPatient: { p1: { texto: 'vpo' } },
        listadoProblemas: { items: [] },
        medRecetaByPatient: { p1: { items: [] } },
        medPharmProfileByPatient: { p1: {} },
        recetaHuByPatient: { p1: {} },
      },
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
    });
    assert.deepEqual(ops, []);
    assert.ok(!ops.some((op) => String(op.path || '').startsWith('blobs/')));
  });

  it('returns empty for non-persist command or empty blobKeys', () => {
    assert.deepEqual(
      encodePersistSnapshotOps({
        commandType: 'patient.upsert',
        blobKeys: ['patients'],
        blobs: { patients: [{ id: 'p1' }] },
        actorId: 'u1',
        fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
      }),
      []
    );
    assert.deepEqual(
      encodePersistSnapshotOps({
        commandType: 'clinical.persistSnapshot',
        blobKeys: [],
        blobs: {},
        actorId: 'u1',
        fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
      }),
      []
    );
  });
});
