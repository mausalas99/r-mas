import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GUARDIA_UNASSIGNED_TEAM_LABEL,
  buildGuardiaTeamCensusGroups,
  guardiaTeamGroupLabel,
} from './unified-patient-grid-team-groups.mjs';

describe('unified-patient-grid-team-groups', () => {
  const teams = [
    { team_id: 't-b', name: 'Equipo B', sala: 'Sala 2' },
    { team_id: 't-a', name: 'Equipo A', sala: 'Sala 1' },
  ];
  const now = '2026-08-07T12:00:00.000Z';

  it('guardiaTeamGroupLabel prefers name then service', () => {
    assert.equal(guardiaTeamGroupLabel({ name: 'Leslie' }), 'Leslie');
    assert.equal(guardiaTeamGroupLabel({ service: 'Sala' }), 'Sala');
    assert.equal(guardiaTeamGroupLabel({}), 'Equipo');
  });

  it('groups by assignment and orders teams by sala then name', () => {
    const patients = [
      { id: 'p1', censusTeamId: 't-b' },
      { id: 'p2', censusTeamId: 't-a' },
      { id: 'p3', censusTeamId: 't-a' },
      { id: 'p4', censusTeamId: '' },
    ];
    const groups = buildGuardiaTeamCensusGroups(patients, { teams, assignments: [], now });
    assert.deepEqual(
      groups.map((g) => g.label),
      ['Equipo A', 'Equipo B', GUARDIA_UNASSIGNED_TEAM_LABEL]
    );
    assert.deepEqual(
      groups[0].patients.map((p) => p.id),
      ['p2', 'p3']
    );
    assert.deepEqual(
      groups[2].patients.map((p) => p.id),
      ['p4']
    );
  });

  it('resolves team from assignments when censusTeamId missing', () => {
    const patients = [
      { id: 'p1', servicio: 'Sala', area: 'A', sala: 'Sala 1' },
      { id: 'p2', servicio: 'Sala', area: 'B', sala: 'Sala 1' },
    ];
    const groups = buildGuardiaTeamCensusGroups(patients, {
      teams,
      assignments: [
        { patient_id: 'p1', team_id: 't-a', effective_at: '2026-08-01T00:00:00.000Z' },
      ],
      now,
    });
    assert.equal(groups[0].label, 'Equipo A');
    assert.deepEqual(
      groups[0].patients.map((p) => p.id),
      ['p1']
    );
    assert.equal(groups[1].label, GUARDIA_UNASSIGNED_TEAM_LABEL);
    assert.deepEqual(
      groups[1].patients.map((p) => p.id),
      ['p2']
    );
  });
});
