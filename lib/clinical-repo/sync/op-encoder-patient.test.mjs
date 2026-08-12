import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodePatientOps, PATIENT_TYPES } from './op-encoder-patient.mjs';

describe('op-encoder-patient', () => {
  it('patient.upsert maps census fields to entries/{id}/fields', () => {
    const patients = [
      {
        id: 'p1',
        nombre: 'Ana',
        registro: '123',
        cama: '12',
        lanUpdatedAt: '2026-08-11T10:00:00.000Z',
        monitoreo: { fc: 80 },
        eventualidades: { entries: [] },
        historiaClinica: { texto: 'hc' },
      },
    ];
    const ops = encodePatientOps({
      commandType: 'patient.upsert',
      patientId: 'p1',
      patients,
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
    });
    assert.ok(ops.length >= 1);
    const fieldsOp = ops.find((op) => op.path === 'entries/p1/fields');
    assert.ok(fieldsOp);
    assert.equal(fieldsOp.actorId, 'u1');
    assert.equal(fieldsOp.updatedAt, '2026-08-11T10:00:00.000Z');
    assert.equal(fieldsOp.value.nombre, 'Ana');
    assert.equal(fieldsOp.value.registro, '123');
    assert.equal(fieldsOp.value.cama, '12');
    assert.equal(fieldsOp.value.id, undefined);
    assert.equal(fieldsOp.value.monitoreo, undefined);
    assert.equal(fieldsOp.value.eventualidades, undefined);
    assert.equal(fieldsOp.value.historiaClinica, undefined);
  });

  it('patient.upsert uses fallbackUpdatedAt when lanUpdatedAt missing', () => {
    const ops = encodePatientOps({
      commandType: 'patient.upsert',
      patientId: 'p1',
      patients: [{ id: 'p1', nombre: 'B' }],
      actorId: 'local',
      fallbackUpdatedAt: '2026-08-11T13:00:00.000Z',
    });
    assert.equal(ops.length, 1);
    assert.equal(ops[0].path, 'entries/p1/fields');
    assert.equal(ops[0].updatedAt, '2026-08-11T13:00:00.000Z');
    assert.equal(ops[0].value.nombre, 'B');
  });

  it('patient.upsert emits entries/{id} stub when registro present', () => {
    const ops = encodePatientOps({
      commandType: 'patient.upsert',
      patientId: 'p1',
      patients: [{ id: 'p1', nombre: 'A', registro: '999', lanUpdatedAt: '2026-08-11T10:00:00.000Z' }],
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
    });
    const root = ops.find((op) => op.path === 'entries/p1');
    assert.ok(root);
    assert.deepEqual(root.value, { id: 'p1', registro: '999' });
  });

  it('patient.delete emits tombstones/{id}', () => {
    const ops = encodePatientOps({
      commandType: 'patient.delete',
      patientId: 'p1',
      patients: [{ id: 'p2' }],
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T14:00:00.000Z',
      registro: '2166042-4',
    });
    assert.equal(ops.length, 1);
    assert.equal(ops[0].path, 'tombstones/p1');
    assert.equal(ops[0].actorId, 'u1');
    assert.equal(ops[0].updatedAt, '2026-08-11T14:00:00.000Z');
    assert.equal(ops[0].value.deletedAt, '2026-08-11T14:00:00.000Z');
    assert.equal(ops[0].value.registro, '2166042-4');
  });

  it('patient.delete omits empty registro', () => {
    const ops = encodePatientOps({
      commandType: 'patient.delete',
      patientId: 'p1',
      patients: [],
      actorId: 'u1',
      fallbackUpdatedAt: '2026-08-11T14:00:00.000Z',
    });
    assert.equal(ops.length, 1);
    assert.equal(ops[0].value.registro, undefined);
  });

  it('skips demo patients and missing upsert target', () => {
    assert.deepEqual(
      encodePatientOps({
        commandType: 'patient.upsert',
        patientId: 'demo-1',
        patients: [{ id: 'demo-1', nombre: 'X' }],
        actorId: 'u1',
        fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
      }),
      []
    );
    assert.deepEqual(
      encodePatientOps({
        commandType: 'patient.upsert',
        patientId: 'missing',
        patients: [{ id: 'p1' }],
        actorId: 'u1',
        fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
      }),
      []
    );
  });

  it('ignores non-patient command types', () => {
    assert.deepEqual(
      encodePatientOps({
        commandType: 'eventualidad.upsert',
        patientId: 'p1',
        patients: [{ id: 'p1', nombre: 'A' }],
        actorId: 'u1',
        fallbackUpdatedAt: '2026-08-11T12:00:00.000Z',
      }),
      []
    );
    assert.equal(PATIENT_TYPES.has('patient.upsert'), true);
    assert.equal(PATIENT_TYPES.has('patient.delete'), true);
  });
});
