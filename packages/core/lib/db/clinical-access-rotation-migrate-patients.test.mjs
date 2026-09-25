import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import { ensureClinicalUser, claimUsername } from './clinical-access-users.mjs';
import { createTeam, updateTeam } from './clinical-access-teams-core.mjs';
import { assignPatientToTeam, fetchActivePatientTeamId } from './clinical-access-assignments.mjs';
import { archiveRotationAndTeams } from './clinical-access-rotation.mjs';
import { migrateLinkedTeamPatients } from './clinical-access-rotation-migrate-patients.mjs';

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

describe('migrateLinkedTeamPatients', () => {
  it('carries a patient from an archived predecessor to its linked successor', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin4', 'R4');

      const oldTeam = createTeam(db, {
        name: 'Equipo Agosto',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      const newTeam = createTeam(db, {
        name: 'Equipo Septiembre',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      updateTeam(db, newTeam.team_id, { succeedsTeamId: oldTeam.team_id, callerUserId: admin });

      const now = '2026-09-01T07:00:00.000Z';
      assignPatientToTeam(db, { patientId: 'p1', teamId: oldTeam.team_id, effectiveAt: '2026-08-01' });

      archiveRotationAndTeams(db);
      const result = migrateLinkedTeamPatients(db, now);

      assert.equal(result.migrated, 1);
      assert.equal(fetchActivePatientTeamId(db, 'p1', now), newTeam.team_id);
    } finally {
      db.close();
    }
  });

  it('leaves patients on unlinked teams alone', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin5', 'R4');

      const oldTeamA = createTeam(db, {
        name: 'Equipo A',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      const oldTeamB = createTeam(db, {
        name: 'Equipo B',
        service: 'Sala',
        onCallDayIndex: 1,
        sala: 'Sala 2',
        createdBy: admin,
      });
      db.prepare('UPDATE teams SET rotation_active = 1 WHERE team_id = ?').run(oldTeamB.team_id);
      const newTeam = createTeam(db, {
        name: 'Equipo C',
        service: 'Sala',
        onCallDayIndex: 2,
        sala: 'Sala 2',
        createdBy: admin,
      });
      updateTeam(db, newTeam.team_id, { succeedsTeamId: oldTeamA.team_id, callerUserId: admin });

      const now = '2026-09-01T07:00:00.000Z';
      assignPatientToTeam(db, { patientId: 'p-linked', teamId: oldTeamA.team_id, effectiveAt: '2026-08-01' });
      assignPatientToTeam(db, { patientId: 'p-other', teamId: oldTeamB.team_id, effectiveAt: '2026-08-01' });

      archiveRotationAndTeams(db);
      const result = migrateLinkedTeamPatients(db, now);

      assert.equal(result.migrated, 1);
      assert.equal(fetchActivePatientTeamId(db, 'p-linked', now), newTeam.team_id);
      assert.equal(fetchActivePatientTeamId(db, 'p-other', now), oldTeamB.team_id);
    } finally {
      db.close();
    }
  });

  it('is a no-op when no team declares a succeeds_team_id', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin6', 'R4');
      const oldTeam = createTeam(db, {
        name: 'Equipo A',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      assignPatientToTeam(db, { patientId: 'p1', teamId: oldTeam.team_id, effectiveAt: '2026-08-01' });

      const now = '2026-09-01T07:00:00.000Z';
      archiveRotationAndTeams(db);
      const result = migrateLinkedTeamPatients(db, now);

      assert.equal(result.migrated, 0);
      assert.equal(fetchActivePatientTeamId(db, 'p1', now), oldTeam.team_id);
    } finally {
      db.close();
    }
  });
});

describe('updateTeam — succeedsTeamId validation', () => {
  it('rejects linking a team to itself', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin7', 'R4');
      const team = createTeam(db, {
        name: 'Equipo A',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      assert.throws(() => updateTeam(db, team.team_id, { succeedsTeamId: team.team_id, callerUserId: admin }));
    } finally {
      db.close();
    }
  });

  it('rejects linking to an archived team', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin8', 'R4');
      const gone = createTeam(db, {
        name: 'Equipo viejo',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      db.prepare('UPDATE teams SET archived_at = ? WHERE team_id = ?').run('2026-07-01', gone.team_id);
      const team = createTeam(db, {
        name: 'Equipo B',
        service: 'Sala',
        onCallDayIndex: 1,
        sala: 'Sala 2',
        createdBy: admin,
      });
      assert.throws(() => updateTeam(db, team.team_id, { succeedsTeamId: gone.team_id, callerUserId: admin }));
    } finally {
      db.close();
    }
  });

  it('clears the link when succeedsTeamId is an empty string', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin9', 'R4');
      const oldTeam = createTeam(db, {
        name: 'Equipo A',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });
      const newTeam = createTeam(db, {
        name: 'Equipo B',
        service: 'Sala',
        onCallDayIndex: 1,
        sala: 'Sala 2',
        createdBy: admin,
      });
      updateTeam(db, newTeam.team_id, { succeedsTeamId: oldTeam.team_id, callerUserId: admin });
      const linked = updateTeam(db, newTeam.team_id, { succeedsTeamId: '', callerUserId: admin });
      assert.equal(linked.succeeds_team_id, null);
    } finally {
      db.close();
    }
  });
});
