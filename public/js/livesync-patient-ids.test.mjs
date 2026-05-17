import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLiveSyncPatientIdMap,
  remapTodosPatientIds,
  remapAgendaPatientIds,
  attachTodosMapToPatientEntries,
} from './livesync-patient-ids.mjs';

describe('livesync-patient-ids', () => {
  it('mapea pendientes del id remoto al id local por registro', () => {
    const patients = [{ id: 'local_a', registro: 'REG1', nombre: 'A' }];
    const entries = [
      {
        patient: { id: 'remote_a', registro: 'REG1', nombre: 'A' },
      },
    ];
    const todosMap = {
      remote_a: [{ id: 't1', text: 'Lab', completed: false, updatedAt: '2026-01-01T00:00:00Z' }],
    };
    const idMap = buildLiveSyncPatientIdMap(entries, patients, todosMap);
    const remapped = remapTodosPatientIds(todosMap, idMap);
    assert.equal(idMap.remote_a, 'local_a');
    assert.deepEqual(remapped.local_a, todosMap.remote_a);
    assert.equal(remapped.remote_a, undefined);
  });

  it('adjunta pendientes del mapa global a cada entrada por id remoto', () => {
    const entries = [
      { patient: { id: 'r1', registro: 'A' }, todos: [] },
      { patient: { id: 'r2', registro: 'B' }, todos: [] },
    ];
    const todosMap = {
      r1: [{ id: 't1', text: 'uno', updatedAt: '2026-01-01T00:00:00Z' }],
      r2: [{ id: 't2', text: 'dos', updatedAt: '2026-01-02T00:00:00Z' }],
    };
    attachTodosMapToPatientEntries(entries, todosMap);
    assert.equal(entries[0].todos.length, 1);
    assert.equal(entries[1].todos[0].text, 'dos');
  });

  it('remapa patientId en agenda', () => {
    const idMap = { remote_x: 'local_x' };
    const agenda = [{ id: 'e1', patientId: 'remote_x', procedure: 'Cirugía' }];
    const out = remapAgendaPatientIds(agenda, idMap);
    assert.equal(out[0].patientId, 'local_x');
  });
});
