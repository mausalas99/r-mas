import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapPatientEntryToOps,
  mapBundleEnvelopeToOps,
  pickCensusFields,
  labSetId,
} from './mutate-bridge.mjs';

const meta = { actorId: 'user-1', updatedAt: '2026-08-02T12:00:00.000Z' };

describe('mutate-bridge op mapping', () => {
  it('maps patient entry to note, fields, and lab sidecar ops', () => {
    const ops = mapPatientEntryToOps(
      {
        patient: {
          id: 'p1',
          nombre: 'PACIENTE UNO',
          registro: '12345',
          historiaClinica: { version: 1, data: { motivo: 'dolor' } },
        },
        note: { texto: 'Evolución' },
        indicaciones: { items: [] },
        labHistory: [{ id: 'lab-1', fecha: '2026-08-01', resLabs: [{ nombre: 'Hb', valor: '12' }] }],
      },
      meta
    );

    const paths = ops.map((op) => op.path);
    assert.ok(paths.includes('entries/p1/fields'));
    assert.ok(paths.includes('entries/p1/note'));
    assert.ok(paths.includes('entries/p1/indicaciones'));
    assert.ok(paths.includes('entries/p1/historiaClinica'));
    assert.ok(paths.includes('labSidecars/p1/lab-1'));

    const noteOp = ops.find((op) => op.path === 'entries/p1/note');
    assert.equal(noteOp?.value?.texto, 'Evolución');
    assert.equal(noteOp?.actorId, 'user-1');
  });

  it('labSetId falls back to fecha then index', () => {
    assert.equal(labSetId({ id: 'a' }, 0), 'a');
    assert.equal(labSetId({ fecha: '2026-08-01' }, 1), '2026-08-01');
    assert.equal(labSetId({}, 3), 'idx-3');
  });

  it('pickCensusFields skips historiaClinica and id', () => {
    const fields = pickCensusFields({ id: 'p1', nombre: 'X', historiaClinica: { v: 1 } });
    assert.equal(fields.nombre, 'X');
    assert.equal(fields.historiaClinica, undefined);
    assert.equal(fields.id, undefined);
  });

  it('mapBundleEnvelopeToOps includes todos and agenda items', () => {
    const ops = mapBundleEnvelopeToOps(
      {
        entries: [],
        todos: {
          p1: [{ id: 't1', patientId: 'p1', text: 'Pendiente' }],
        },
        agenda: [{ id: 'a1', title: 'Procedimiento' }],
      },
      meta
    );
    assert.ok(ops.some((op) => op.path === 'todos/t1'));
    assert.ok(ops.some((op) => op.path === 'agenda/a1'));
  });
});
