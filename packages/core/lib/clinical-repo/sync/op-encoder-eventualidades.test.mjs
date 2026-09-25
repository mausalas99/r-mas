import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeEventualidadesOps } from './op-encoder-eventualidades.mjs';

describe('op-encoder-eventualidades', () => {
  it('maps patients blob eventualidades to one LWW op', () => {
    const patients = [
      {
        id: 'p1',
        eventualidades: {
          entries: [{ id: 'ev_1', at: '2026-08-05T18:00:00.000Z', text: '2 U GR', kind: 'transfusion' }],
          labsText: '',
          updatedAt: '2026-08-05T18:01:00.000Z',
        },
      },
    ];
    const ops = encodeEventualidadesOps({
      commandType: 'eventualidad.upsert',
      patientId: 'p1',
      patients,
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-05T19:00:00.000Z',
    });
    assert.equal(ops.length, 1);
    assert.equal(ops[0].path, 'entries/p1/eventualidades');
    assert.deepEqual(ops[0].value, patients[0].eventualidades);
    assert.equal(ops[0].actorId, 'u1');
    assert.equal(ops[0].updatedAt, '2026-08-05T18:01:00.000Z');
  });

  it('uses fallbackUpdatedAt when eventualidades.updatedAt missing', () => {
    const ops = encodeEventualidadesOps({
      commandType: 'eventualidades.labs.set',
      patientId: 'p1',
      patients: [{ id: 'p1', eventualidades: { entries: [], labsText: 'Hb 10' } }],
      actorId: 'local',
      fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
    });
    assert.equal(ops.length, 1);
    assert.equal(ops[0].updatedAt, '2026-08-11T12:00:00.000Z');
    assert.equal(ops[0].value.labsText, 'Hb 10');
  });

  it('returns empty when patient missing or no eventualidades', () => {
    assert.deepEqual(
      encodeEventualidadesOps({
        commandType: 'eventualidad.delete',
        patientId: 'missing',
        patients: [{ id: 'p1' }],
        actorId: 'u1',
        fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
      }),
      []
    );
    assert.deepEqual(
      encodeEventualidadesOps({
        commandType: 'eventualidad.upsert',
        patientId: 'p1',
        patients: [{ id: 'p1', nombre: 'A' }],
        actorId: 'u1',
        fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
      }),
      []
    );
  });

  it('ignores non-eventualidades command types', () => {
    assert.deepEqual(
      encodeEventualidadesOps({
        commandType: 'patient.upsert',
        patientId: 'p1',
        patients: [{ id: 'p1', eventualidades: { entries: [] } }],
        actorId: 'u1',
        fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
      }),
      []
    );
  });
});
