import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPatientAdmitOpsForCloud,
  partitionPatientEntriesByOperationalSala,
  resolveOperationalPatientSala,
} from './cloud-census-sala-push.mjs';

describe('cloud-census-sala-push', () => {
  it('resolveOperationalPatientSala prefers team assignment over stale patient.sala', () => {
    const context = {
      teams: [{ team_id: 't-airon', sala: 'Sala E' }],
      assignments: [
        { patient_id: 'p1', team_id: 't-airon', effective_at: '2026-08-01T00:00:00Z' },
      ],
      now: '2026-08-10T12:00:00Z',
    };
    assert.equal(
      resolveOperationalPatientSala({ id: 'p1', sala: 'Sala 2' }, context),
      'Sala E'
    );
  });

  it('partitionPatientEntriesByOperationalSala splits cross-sala entries', () => {
    const entries = [
      { patient: { id: 'p1', sala: 'Sala 2' } },
      { patient: { id: 'p2', sala: 'Sala E' } },
      { patient: { id: 'p3', sala: 'Sala E' } },
    ];
    const { active, crossBySala } = partitionPatientEntriesByOperationalSala(entries, 'Sala 2');
    assert.equal(active.length, 1);
    assert.equal(active[0].patient.id, 'p1');
    assert.equal(crossBySala.get('Sala E')?.length, 2);
  });

  it('buildPatientAdmitOpsForCloud emits fields and registro ops', () => {
    const ops = buildPatientAdmitOpsForCloud(
      {
        id: 'p1',
        nombre: 'TEST',
        registro: '123',
        lanUpdatedAt: '2026-08-10T10:00:00.000Z',
      },
      'actor-1'
    );
    assert.ok(ops.some((op) => String(op.path).includes('/fields')));
    assert.ok(ops.some((op) => op.path === 'entries/p1' && op.value?.registro === '123'));
  });
});
