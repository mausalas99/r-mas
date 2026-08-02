import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { openTestDb, TEST_KEY_HEX } from './test-open-db.mjs';
import { ensureClinicalUser, claimUsername } from './clinical-access-users.mjs';
import { createTeam } from './clinical-access-teams-core.mjs';
import { addTeamMember } from './clinical-access-teams-membership.mjs';
import { wipeClinicalUsersFor79Cutover } from './clinical-79-cutover.mjs';

describe('wipeClinicalUsersFor79Cutover', () => {
  const opened = openTestDb(TEST_KEY_HEX);
  after(() => opened.close());

  it('purges users and memberships but keeps teams; second wipe is no-op', () => {
    const { db } = opened;
    const a = ensureClinicalUser(db, {
      clientId: 'device-a',
      rank: 'R1',
      clinicalName: 'A',
      sala: 'Sala 1',
    });
    const b = ensureClinicalUser(db, {
      clientId: 'device-b',
      rank: 'R2',
      clinicalName: 'B',
      sala: 'Sala 1',
    });
    claimUsername(db, { userId: a.userId, username: 'usera' });
    claimUsername(db, { userId: b.userId, username: 'userb' });
    const team = createTeam(db, {
      name: 'Equipo Test',
      service: 'Sala',
      sala: 'Sala 1',
      createdBy: a.userId,
      onCallDayIndex: 0,
    });
    addTeamMember(db, team.team_id, a.userId);
    addTeamMember(db, team.team_id, b.userId);

    const out = wipeClinicalUsersFor79Cutover(db);
    assert.ok(out.count >= 2);
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM users`).get().n, 0);
    assert.equal(db.prepare(`SELECT COUNT(*) AS n FROM team_membership`).get().n, 0);
    assert.equal(
      db.prepare(`SELECT COUNT(*) AS n FROM teams WHERE team_id = ?`).get(team.team_id).n,
      1
    );

    const again = wipeClinicalUsersFor79Cutover(db);
    assert.equal(again.count, 0);
  });
});
