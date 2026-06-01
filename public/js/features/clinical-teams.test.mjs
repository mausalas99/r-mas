import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterJoinedTeams, CLINICAL_TEAM_SERVICES } from './clinical-teams.mjs';

const clinicalTeamsSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'clinical-teams.mjs'),
  'utf8'
);

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

  it('filterJoinedTeams matches LAN username when user_id differs', () => {
    const teams = [
      {
        team_id: 't1',
        members: [{ user_id: 'ghost', username: 'msalas' }],
      },
    ];
    const joined = filterJoinedTeams(teams, { user_id: 'real', username: 'msalas' });
    assert.equal(joined.length, 1);
  });

  it('exports service enum', () => {
    assert.ok(CLINICAL_TEAM_SERVICES.includes('Sala'));
  });

  it('Mi rotación source has no per-team Guardia hoy checkbox', () => {
    assert.equal(clinicalTeamsSrc.includes('clinical-teams-guardia-check'), false);
    assert.equal(clinicalTeamsSrc.includes('Guardia hoy'), false);
    assert.equal(clinicalTeamsSrc.includes('handleGuardiaCheck'), false);
  });
});
