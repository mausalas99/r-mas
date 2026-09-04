import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamsWithMembers } from './clinical-scope-teams.mjs';
import { getJoinedTeamsForUser } from '../../lib/clinical-scope/team-membership.mjs';

describe('buildTeamsWithMembers leader synthesis', () => {
  it('leader with no membership row is matchable by Nube handle', () => {
    const snapshot = {
      clinical_users: [
        { user_id: 'uuid-1', username: 'drmauricios', rank: 'R4', clinical_name: 'Mauricio S', sala: 'Sala 2' },
      ],
      teams: [
        { team_id: 't1', name: 'Equipo A', service: 'Sala', sala: 'Sala 2', created_by: 'uuid-1', leader_user_id: 'uuid-1' },
      ],
      team_membership: [],
    };
    const teams = buildTeamsWithMembers(snapshot);
    assert.equal(teams[0].members.length, 1);
    assert.equal(teams[0].members[0].user_id, 'uuid-1');
    assert.equal(teams[0].members[0].username, 'drmauricios');

    const joined = getJoinedTeamsForUser(buildTeamsWithMembers(snapshot), {
      user_id: 'drmauricios',
      username: 'drmauricios',
    });
    assert.deepEqual(joined.map((t) => t.team_id), ['t1']);
  });

  it('does not duplicate a leader who already has a real membership row', () => {
    const snapshot = {
      clinical_users: [
        { user_id: 'uuid-1', username: 'drmauricios', rank: 'R4', clinical_name: 'Mauricio S', sala: 'Sala 2' },
      ],
      teams: [
        { team_id: 't1', name: 'Equipo A', service: 'Sala', sala: 'Sala 2', created_by: 'uuid-1', leader_user_id: 'uuid-1' },
      ],
      team_membership: [{ team_id: 't1', user_id: 'uuid-1', sub_area_fraction: 'A' }],
    };
    const teams = buildTeamsWithMembers(snapshot);
    assert.equal(teams[0].members.length, 1);
    assert.equal(teams[0].members[0].sub_area_fraction, 'A');
  });

  it('produces no synthesized member when the team has no leader/creator', () => {
    const snapshot = {
      clinical_users: [],
      teams: [{ team_id: 't1', name: 'Equipo A', service: 'Sala', sala: 'Sala 2' }],
      team_membership: [],
    };
    const teams = buildTeamsWithMembers(snapshot);
    assert.deepEqual(teams[0].members, []);
  });

  it('synthesizes a member with null username when the leader is not in clinical_users', () => {
    const snapshot = {
      clinical_users: [],
      teams: [{ team_id: 't1', name: 'Equipo A', service: 'Sala', sala: 'Sala 2', leader_user_id: 'uuid-1' }],
      team_membership: [],
    };
    const teams = buildTeamsWithMembers(snapshot);
    assert.equal(teams[0].members.length, 1);
    assert.equal(teams[0].members[0].user_id, 'uuid-1');
    assert.equal(teams[0].members[0].username, null);
  });
});
