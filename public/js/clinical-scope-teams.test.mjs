import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamsWithMembers } from './clinical-scope-teams.mjs';
import { getJoinedTeamsForUser } from '../../lib/clinical-scope/team-membership.mjs';

describe('buildTeamsWithMembers', () => {
  it('does not treat an admin who only created/leads a team as a member of it', () => {
    // R1 with network-admin rank creating a team for other residents is not
    // clinically on that team — created_by/leader_user_id must not grant scope.
    const snapshot = {
      clinical_users: [
        { user_id: 'uuid-1', username: 'drmauricios', rank: 'R1', clinical_name: 'Mauricio S', sala: 'Sala 2' },
      ],
      teams: [
        { team_id: 't1', name: 'Equipo A', service: 'Sala', sala: 'Sala 2', created_by: 'uuid-1', leader_user_id: 'uuid-1' },
      ],
      team_membership: [],
    };
    const teams = buildTeamsWithMembers(snapshot);
    assert.deepEqual(teams[0].members, []);

    const joined = getJoinedTeamsForUser(teams, { user_id: 'drmauricios', username: 'drmauricios' });
    assert.deepEqual(joined, []);
  });

  it('still surfaces a real team_membership row for that team', () => {
    const snapshot = {
      clinical_users: [
        { user_id: 'uuid-1', username: 'drmauricios', rank: 'R1', clinical_name: 'Mauricio S', sala: 'Sala 2' },
      ],
      teams: [
        { team_id: 't1', name: 'Equipo A', service: 'Sala', sala: 'Sala 2', created_by: 'uuid-1', leader_user_id: 'uuid-1' },
      ],
      team_membership: [{ team_id: 't1', user_id: 'uuid-1', sub_area_fraction: 'A' }],
    };
    const teams = buildTeamsWithMembers(snapshot);
    assert.equal(teams[0].members.length, 1);
    assert.equal(teams[0].members[0].user_id, 'uuid-1');
    assert.equal(teams[0].members[0].username, 'drmauricios');

    const joined = getJoinedTeamsForUser(teams, { user_id: 'drmauricios', username: 'drmauricios' });
    assert.deepEqual(joined.map((t) => t.team_id), ['t1']);
  });
});
