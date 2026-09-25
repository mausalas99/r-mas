import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import { ensureClinicalUser, claimUsername } from './clinical-access-users.mjs';
import { createTeam } from './clinical-access-teams-core.mjs';
import { listTeamsBySala } from './clinical-access-teams-query.mjs';

function openDb() {
  const db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

function makeUser(db, handle, rank = 'R1') {
  const user = ensureClinicalUser(db, { clientId: handle, rank });
  claimUsername(db, { userId: user.userId, username: handle });
  return user.userId;
}

describe('listTeamsBySala — staged (next rotation) teams', () => {
  it('surfaces a staged team alongside the active one, both self-joinable', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin3', 'R4');
      const resident = makeUser(db, 'resident3', 'R1');

      const activeTeam = createTeam(db, {
        name: 'Equipo Agosto',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      const stagedTeam = createTeam(db, {
        name: 'Equipo Septiembre',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });

      const rows = listTeamsBySala(db, { sala: 'Sala 2', forUserId: resident });
      const ids = rows.map((r) => r.team_id);
      assert.ok(ids.includes(activeTeam.team_id), 'active team listed');
      assert.ok(ids.includes(stagedTeam.team_id), 'staged team listed');

      const staged = rows.find((r) => r.team_id === stagedTeam.team_id);
      assert.equal(staged.joinEligible, true);

      const active = rows.find((r) => r.team_id === activeTeam.team_id);
      assert.equal(active.joinEligible, true);
    } finally {
      db.close();
    }
  });
});
