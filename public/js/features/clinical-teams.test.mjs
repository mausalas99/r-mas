import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterJoinedTeams, CLINICAL_TEAM_SERVICES } from './clinical-teams.mjs';

describe('clinical-teams', () => {
  it('filterJoinedTeams returns teams where user is a member', () => {
    const teams = [
      {
        team_id: 't1',
        name: 'A',
        members: [{ user_id: 'u1', username: 'a' }],
      },
      {
        team_id: 't2',
        name: 'B',
        members: [{ user_id: 'u2', username: 'b' }],
      },
      {
        team_id: 't3',
        name: 'C',
        members: [{ user_id: 'u1', username: 'a' }, { user_id: 'u3', username: 'c' }],
      },
    ];
    const joined = filterJoinedTeams(teams, 'u1');
    assert.equal(joined.length, 2);
    assert.deepEqual(
      joined.map((t) => t.team_id),
      ['t1', 't3']
    );
  });

  it('exports service enum', () => {
    assert.ok(CLINICAL_TEAM_SERVICES.includes('Sala'));
  });
});
