import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPatientsForClinicalSidebar } from './patients-clinical-filter.mjs';

const userR1 = { user_id: 'u1', rank: 'R1', sala: 'Sala 1' };
const patients = [
  { id: 'p1', servicio: 'Sala', area: 'Sala A', sala: 'Sala 1' },
  { id: 'p2', servicio: 'Sala', area: 'Sala A', sala: 'Sala 2' },
];

test('R1 sidebar includes only same sala when not on a team', () => {
  const out = filterPatientsForClinicalSidebar(patients, userR1, {
    teams: [],
    guardias: [],
    assignments: [],
    cycle: null,
    now: '2026-06-01T12:00:00Z',
  });
  assert.deepEqual(out.map((p) => p.id), ['p1']);
});

test('R1 on team sidebar excludes other team in same sala', () => {
  const census = [
    { id: 'p-mine', servicio: 'Sala', area: 'Sala B', sala: 'Sala 1' },
    { id: 'p-other', servicio: 'Sala', area: 'Sala A', sala: 'Sala 1' },
  ];
  const out = filterPatientsForClinicalSidebar(census, userR1, {
    teams: [
      {
        team_id: 't1',
        service: 'Sala',
        sub_area_fraction: 'B',
        sala: 'Sala 1',
        members: [{ user_id: 'u1' }],
      },
    ],
    assignments: [
      { patient_id: 'p-mine', team_id: 't1', effective_at: '2026-06-01T00:00:00Z' },
      { patient_id: 'p-other', team_id: 't-other', effective_at: '2026-06-01T00:00:00Z' },
    ],
    guardias: [],
    cycle: null,
    now: '2026-06-02T12:00:00Z',
  });
  assert.deepEqual(out.map((p) => p.id), ['p-mine']);
});

test('R4 sidebar includes all patients', () => {
  const out = filterPatientsForClinicalSidebar(
    patients,
    { user_id: 'r4', rank: 'R4', is_program_admin: 0 },
    { teams: [], guardias: [], assignments: [], cycle: null, now: '2026-06-01T12:00:00Z' }
  );
  assert.equal(out.length, 2);
});

test('R2 sidebar without team excludes unassigned census', () => {
  const out = filterPatientsForClinicalSidebar(
    patients,
    { user_id: 'r2', rank: 'R2', sala: 'Sala 1', is_program_admin: 0 },
    { teams: [], guardias: [], assignments: [], cycle: null, now: '2026-06-01T12:00:00Z' }
  );
  assert.deepEqual(out.map((p) => p.id), []);
});
