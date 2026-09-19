import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPatientAssignedToJoinedTeam } from './mobile-team-patient-scope.mjs';

const scope = {
  teams: [
    {
      team_id: 't-mine',
      service: 'Sala',
      sub_area_fraction: 'B',
      sala: 'Sala 2',
      members: [{ user_id: 'u1' }],
    },
    {
      team_id: 't-other',
      service: 'Sala',
      sub_area_fraction: 'A',
      sala: 'Sala 2',
      members: [{ user_id: 'u2' }],
    },
  ],
  assignments: [
    { patient_id: 'p-mine', team_id: 't-mine', effective_at: '2026-01-01T00:00:00.000Z' },
    { patient_id: 'p-other', team_id: 't-other', effective_at: '2026-01-01T00:00:00.000Z' },
    { patient_id: 'p-unassigned', team_id: 't-mine', effective_at: '2099-01-01T00:00:00.000Z' },
  ],
  guardias: [],
  now: '2026-06-02T12:00:00.000Z',
};

describe('mobile-team-patient-scope', () => {
  it('allows only patients assigned to a joined team', () => {
    assert.equal(isPatientAssignedToJoinedTeam('p-mine', scope, 'u1'), true);
    assert.equal(isPatientAssignedToJoinedTeam('p-other', scope, 'u1'), false);
    assert.equal(isPatientAssignedToJoinedTeam('p-unassigned', scope, 'u1'), false);
  });

  it('matches joined teams by username when session user_id is still the handle', () => {
    const scopeByUsername = {
      ...scope,
      teams: [
        {
          team_id: 't-mine',
          service: 'Sala',
          sub_area_fraction: 'B',
          sala: 'Sala 2',
          members: [{ user_id: 'uuid-1', username: 'leslie' }],
        },
      ],
    };
    const user = { user_id: 'leslie', username: 'leslie', rank: 'Team', sala: 'Sala 2' };
    assert.equal(isPatientAssignedToJoinedTeam('p-mine', scopeByUsername, user), true);
  });
});
