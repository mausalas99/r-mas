import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scopeCloudStateToPatient } from './scope-cloud-state-to-patient.mjs';

describe('scopeCloudStateToPatient', () => {
  const state = {
    entries: [
      { id: 'p1', fields: { nombre: 'A' } },
      { id: 'p2', fields: { nombre: 'B' } },
    ],
    todos: {
      t1: { id: 't1', patientId: 'p1', text: 'x' },
      t2: { id: 't2', patientId: 'p2', text: 'y' },
    },
    agenda: [
      { id: 'a1', patientId: 'p1' },
      { id: 'a2', patientId: 'p2' },
    ],
    labSidecars: { p1: { s1: {} }, p2: { s2: {} } },
    tombstones: { p2: { registro: 'R2' } },
    clinicalOps: { teams: [{ team_id: 't1' }] },
  };

  it('keeps only the target patient\'s entry, todos, agenda and lab sidecars', () => {
    const scoped = scopeCloudStateToPatient(state, 'p1');
    assert.deepEqual(scoped.entries.map((e) => e.id), ['p1']);
    assert.deepEqual(Object.keys(scoped.todos), ['t1']);
    assert.deepEqual(scoped.agenda.map((a) => a.id), ['a1']);
    assert.deepEqual(Object.keys(scoped.labSidecars), ['p1']);
  });

  it('drops tombstones for other patients so a foreign delete cannot reach a local one', () => {
    const scoped = scopeCloudStateToPatient(state, 'p1');
    assert.deepEqual(Object.keys(scoped.tombstones), []);
  });

  it('leaves clinicalOps untouched — team snapshot handling is unrelated to this scope', () => {
    const scoped = scopeCloudStateToPatient(state, 'p1');
    assert.equal(scoped.clinicalOps, state.clinicalOps);
  });

  it('returns empty entries/todos for an unknown patient id instead of throwing', () => {
    const scoped = scopeCloudStateToPatient(state, 'nope');
    assert.deepEqual(scoped.entries, []);
    assert.deepEqual(scoped.todos, {});
  });

  it('passes a non-array agenda through unchanged (defensive — normal shape is an array)', () => {
    const scoped = scopeCloudStateToPatient({ ...state, agenda: undefined }, 'p1');
    assert.equal(scoped.agenda, undefined);
  });
});
