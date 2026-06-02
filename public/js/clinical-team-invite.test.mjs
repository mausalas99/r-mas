import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  teamInviteCode,
  normalizeTeamInviteCode,
  parseClinicalTeamJoinQuery,
  resolveTeamIdFromInviteCode,
  buildClinicalTeamInviteMessage,
} from './clinical-team-invite.mjs';

describe('clinical-team-invite', () => {
  it('teamInviteCode uses first 8 hex chars', () => {
    assert.equal(teamInviteCode('2017936e-7455-476a-8aef-4c018799c75d'), '2017936e');
  });

  it('parseClinicalTeamJoinQuery prefers joinCode param', () => {
    const p = parseClinicalTeamJoinQuery('?joinCode=2017936e');
    assert.equal(p.inviteCode, '2017936e');
    assert.equal(p.teamId, '');
  });

  it('resolveTeamIdFromInviteCode matches single team', () => {
    const teams = [{ team_id: '2017936e-7455-476a-8aef-4c018799c75d' }];
    assert.equal(resolveTeamIdFromInviteCode('2017936e', teams), teams[0].team_id);
  });

  it('buildClinicalTeamInviteMessage highlights code not localhost url', () => {
    const msg = buildClinicalTeamInviteMessage({
      team_id: '2017936e-7455-476a-8aef-4c018799c75d',
      name: 'Dra. Melissa',
      sala: 'Sala 2',
    });
    assert.match(msg, /Código de equipo: 2017936e/);
    assert.match(msg, /Mi rotación/);
    assert.doesNotMatch(msg, /localhost/);
  });

  it('normalizeTeamInviteCode strips @ and dashes', () => {
    assert.equal(normalizeTeamInviteCode('@2017936e'), '2017936e');
  });
});
