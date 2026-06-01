import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPatientsForClinicalSidebar } from './patients-clinical-filter.mjs';

const userR1 = { user_id: 'u1', rank: 'R1', sala: 'Sala 1' };
const patients = [
  { id: 'p1', servicio: 'Sala', area: 'Sala A', sala: 'Sala 1' },
  { id: 'p2', servicio: 'Sala', area: 'Sala A', sala: 'Sala 2' },
];

test('R1 sidebar includes only same sala', () => {
  const out = filterPatientsForClinicalSidebar(patients, userR1, {
    teams: [],
    guardias: [],
    assignments: [],
    cycle: null,
    now: '2026-06-01T12:00:00Z',
  });
  assert.deepEqual(out.map((p) => p.id), ['p1']);
});

test('R4 sidebar includes all patients', () => {
  const out = filterPatientsForClinicalSidebar(
    patients,
    { user_id: 'r4', rank: 'R4', is_program_admin: 0 },
    { teams: [], guardias: [], assignments: [], cycle: null, now: '2026-06-01T12:00:00Z' }
  );
  assert.equal(out.length, 2);
});
