import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import {
  ensureClinicalUser,
  claimUsername,
  upsertClinicalProfile,
  setClinicalUserProfileFromAdmin,
} from './clinical-access-users.mjs';
import { createTeam } from './clinical-access-teams-core.mjs';
import {
  addTeamMember,
  reconcileTeamMembershipForSalaChange,
} from './clinical-access-teams-membership.mjs';

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

describe('addTeamMember — staged (next rotation) teams', () => {
  it('pre-staffing a staged team does not remove the user from this month\'s active team', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin1', 'R4');
      const resident = makeUser(db, 'resident1', 'R1');

      const activeTeam = createTeam(db, {
        name: 'Equipo Agosto',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      assert.equal(activeTeam.rotation_active, 1);
      addTeamMember(db, activeTeam.team_id, resident);

      // Second team created while the month is still active → auto-staged.
      const stagedTeam = createTeam(db, {
        name: 'Equipo Septiembre',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      assert.equal(stagedTeam.rotation_active, 0);

      addTeamMember(db, stagedTeam.team_id, resident);

      const memberships = db
        .prepare('SELECT team_id FROM team_membership WHERE user_id = ? ORDER BY team_id')
        .all(resident)
        .map((r) => r.team_id);
      assert.deepEqual(
        memberships.sort(),
        [activeTeam.team_id, stagedTeam.team_id].sort()
      );
    } finally {
      db.close();
    }
  });

  it('moving a user between two active teams still leaves the prior one (unchanged default)', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin2', 'R4');
      const resident = makeUser(db, 'resident2', 'R1');

      const teamA = createTeam(db, {
        name: 'Equipo A',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      addTeamMember(db, teamA.team_id, resident);

      const teamB = createTeam(db, {
        name: 'Equipo B',
        service: 'Sala',
        onCallDayIndex: 1,
        sala: 'Sala 2',
        createdBy: admin,
      });
      // Force teamB active for this check (both teams "this month").
      db.prepare('UPDATE teams SET rotation_active = 1 WHERE team_id = ?').run(teamB.team_id);

      addTeamMember(db, teamB.team_id, resident);

      const memberships = db
        .prepare('SELECT team_id FROM team_membership WHERE user_id = ?')
        .all(resident)
        .map((r) => r.team_id);
      assert.deepEqual(memberships, [teamB.team_id]);
    } finally {
      db.close();
    }
  });
});

describe('reconcileTeamMembershipForSalaChange — changing rotation moves a user off their old team', () => {
  it('drops membership in an active team whose sala no longer matches', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin3', 'R4');
      const resident = makeUser(db, 'resident3', 'R1');
      const sala2Team = createTeam(db, {
        name: 'Equipo Sala 2',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      addTeamMember(db, sala2Team.team_id, resident);

      const removed = reconcileTeamMembershipForSalaChange(db, resident, 'Área A/Pensionistas');

      assert.equal(removed, 1);
      const memberships = db
        .prepare('SELECT team_id FROM team_membership WHERE user_id = ?')
        .all(resident);
      assert.deepEqual(memberships, []);
    } finally {
      db.close();
    }
  });

  it('leaves membership untouched when the sala did not change', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin4', 'R4');
      const resident = makeUser(db, 'resident4', 'R1');
      const team = createTeam(db, {
        name: 'Equipo Sala 2',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      addTeamMember(db, team.team_id, resident);

      const removed = reconcileTeamMembershipForSalaChange(db, resident, 'Sala 2');

      assert.equal(removed, 0);
      const memberships = db
        .prepare('SELECT team_id FROM team_membership WHERE user_id = ?')
        .all(resident)
        .map((r) => r.team_id);
      assert.deepEqual(memberships, [team.team_id]);
    } finally {
      db.close();
    }
  });

  it('upsertClinicalProfile (self-service "Mi rotación") moves the user off their old team', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin5', 'R4');
      const resident = makeUser(db, 'resident5', 'R1');
      const sala2Team = createTeam(db, {
        name: 'Equipo Sala 2',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      addTeamMember(db, sala2Team.team_id, resident);

      upsertClinicalProfile(db, {
        userId: resident,
        clinicalName: 'Residente 5',
        rank: 'R1',
        sala: 'Área A/Pensionistas',
      });

      const memberships = db
        .prepare('SELECT team_id FROM team_membership WHERE user_id = ?')
        .all(resident);
      assert.deepEqual(memberships, []);
    } finally {
      db.close();
    }
  });

  it('setClinicalUserProfileFromAdmin moves the user off their old team', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin6', 'R4');
      const residentId = makeUser(db, 'resident6', 'R1');
      const sala2Team = createTeam(db, {
        name: 'Equipo Sala 2',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      addTeamMember(db, sala2Team.team_id, residentId);

      setClinicalUserProfileFromAdmin(db, {
        username: 'resident6',
        rank: 'R1',
        sala: 'Área A/Pensionistas',
      });

      const memberships = db
        .prepare('SELECT team_id FROM team_membership WHERE user_id = ?')
        .all(residentId);
      assert.deepEqual(memberships, []);
    } finally {
      db.close();
    }
  });
});
