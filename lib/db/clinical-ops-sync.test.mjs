import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import { ensureClinicalUser, createTeam, setTeamGuardiaToday, upsertActiveGuardia } from './clinical-access-db.mjs';
import {
  exportClinicalOpsSnapshot,
  mergeClinicalOpsSnapshot,
  pickNewerClinicalOpsSnapshot,
  stampRotationNuevaAt,
} from './clinical-ops-sync.mjs';

function openDb() {
  const db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

describe('clinical-ops-sync', () => {
  it('exportClinicalOpsSnapshot includes V2 tables', () => {
    const db = openDb();
    const user = ensureClinicalUser(db, { clientId: 'dev-a', rank: 'R2' });
    createTeam(db, { name: 'Sala A', service: 'Sala', onCallDayIndex: 1, createdBy: user.userId });
    const snap = exportClinicalOpsSnapshot(db);
    assert.ok(Array.isArray(snap.rotation_cycles));
    assert.ok(Array.isArray(snap.patient_team_assignment));
    assert.ok(Array.isArray(snap.team_guardia_today));
    assert.ok(Array.isArray(snap.teams));
    assert.equal(snap.teams.length, 1);
  });

  it('mergeClinicalOpsSnapshot last-writes team_guardia_today by declared_at', () => {
    const db = openDb();
    const userA = ensureClinicalUser(db, { clientId: 'dev-a', rank: 'R2' });
    const userB = ensureClinicalUser(db, { clientId: 'dev-b', rank: 'R3' });
    const team = createTeam(db, { name: 'Sala A', service: 'Sala', onCallDayIndex: 1, createdBy: userA.userId });
    setTeamGuardiaToday(db, team.team_id, userA.userId);

    const local = exportClinicalOpsSnapshot(db);
    const incoming = {
      ...local,
      exportedAt: new Date().toISOString(),
      team_guardia_today: [
        {
          team_id: team.team_id,
          user_id: userB.userId,
          declared_at: '2099-01-02T00:00:00',
        },
      ],
    };

    mergeClinicalOpsSnapshot(db, incoming, local);
    const row = db
      .prepare(`SELECT user_id FROM team_guardia_today WHERE team_id = ?`)
      .get(team.team_id);
    assert.equal(row.user_id, userB.userId);
  });

  it('mergeClinicalOpsSnapshot applies rotation.nueva archive from peer', () => {
    const db = openDb();
    const user = ensureClinicalUser(db, { clientId: 'dev-a', rank: 'R2' });
    const team = createTeam(db, { name: 'Sala A', service: 'Sala', onCallDayIndex: 1, createdBy: user.userId });
    setTeamGuardiaToday(db, team.team_id, user.userId);
    upsertActiveGuardia(db, {
      patientId: 'p1',
      coveringUserId: user.userId,
      sourceTeamId: team.team_id,
    });

    const local = exportClinicalOpsSnapshot(db);
    assert.equal(db.prepare(`SELECT COUNT(*) AS c FROM active_guardias`).get().c, 1);

    const incoming = {
      ...local,
      exportedAt: new Date().toISOString(),
      rotationNuevaAt: '2099-06-01T00:00:00',
      active_guardias: [],
      team_guardia_today: [],
      teams: local.teams.map((t) => ({ ...t, archived_at: '2099-06-01T00:00:00' })),
    };

    mergeClinicalOpsSnapshot(db, incoming, local);
    assert.equal(db.prepare(`SELECT COUNT(*) AS c FROM active_guardias`).get().c, 0);
    assert.equal(db.prepare(`SELECT COUNT(*) AS c FROM team_guardia_today`).get().c, 0);
  });

  it('pickNewerClinicalOpsSnapshot unions teams across LAN sources', () => {
    const older = {
      clinicalOps: {
        exportedAt: '2020-01-01T00:00:00',
        version: 1,
        teams: [{ team_id: 'team-a', name: 'A', created_at: '2020-01-01T00:00:00' }],
        team_membership: [],
      },
    };
    const newer = {
      clinicalOps: {
        exportedAt: '2025-01-01T00:00:00',
        version: 1,
        teams: [],
        team_membership: [],
      },
    };
    const picked = pickNewerClinicalOpsSnapshot([older, newer, {}]);
    assert.equal(picked.exportedAt, '2025-01-01T00:00:00');
    assert.equal(picked.teams.length, 1);
    assert.equal(picked.teams[0].team_id, 'team-a');
  });

  it('mergeClinicalOpsSnapshot imports remote membership after LAN users', () => {
    const db = openDb();
    const leader = ensureClinicalUser(db, { clientId: 'dev-a', rank: 'R2' });
    const team = createTeam(db, {
      name: 'Sala A',
      service: 'Sala',
      onCallDayIndex: 1,
      createdBy: leader.userId,
      sala: 'Sala 1',
    });
    const local = exportClinicalOpsSnapshot(db);
    const remoteUserId = '11111111-1111-1111-1111-111111111111';
    const incoming = {
      ...local,
      exportedAt: new Date().toISOString(),
      clinical_users: [
        {
          user_id: remoteUserId,
          username: 'mgarcia',
          rank: 'R1',
          clinical_name: 'Dr. García',
          sala: 'Sala 1',
          is_program_admin: 0,
        },
      ],
      team_membership: [{ team_id: team.team_id, user_id: remoteUserId, sub_area_fraction: 'D2' }],
    };
    mergeClinicalOpsSnapshot(db, incoming, local);
    const userRow = db.prepare(`SELECT username FROM users WHERE user_id = ?`).get(remoteUserId);
    assert.equal(userRow.username, 'mgarcia');
    const member = db
      .prepare(`SELECT sub_area_fraction FROM team_membership WHERE team_id = ? AND user_id = ?`)
      .get(team.team_id, remoteUserId);
    assert.equal(member.sub_area_fraction, 'D2');
  });

  it('mergeClinicalOpsSnapshot accepts 6.5.6 snapshots without clinical_users', () => {
    const db = openDb();
    const leader = ensureClinicalUser(db, { clientId: 'dev-a', rank: 'R2' });
    const local = exportClinicalOpsSnapshot(db);
    const remoteTeamId = '22222222-2222-2222-2222-222222222222';
    const remoteUserId = '11111111-1111-1111-1111-111111111111';
    const incoming = {
      exportedAt: new Date().toISOString(),
      version: 1,
      rotationNuevaAt: null,
      rotation_cycles: [],
      patient_team_assignment: [],
      team_guardia_today: [],
      active_guardias: [],
      teams: [
        {
          team_id: remoteTeamId,
          name: 'Equipo remoto',
          service: 'Sala',
          sub_area_fraction: null,
          on_call_day_index: 1,
          created_by: remoteUserId,
          archived_at: null,
          sala: 'Sala 2',
          team_leader_name: null,
          leader_user_id: null,
          rotation_active: 1,
          created_at: '2026-06-01T00:00:00.000Z',
        },
      ],
      team_membership: [{ team_id: remoteTeamId, user_id: remoteUserId, sub_area_fraction: 'A1' }],
    };
    mergeClinicalOpsSnapshot(db, incoming, local);
    const team = db.prepare(`SELECT name FROM teams WHERE team_id = ?`).get(remoteTeamId);
    assert.equal(team.name, 'Equipo remoto');
    const member = db
      .prepare(`SELECT sub_area_fraction FROM team_membership WHERE team_id = ? AND user_id = ?`)
      .get(remoteTeamId, remoteUserId);
    assert.equal(member.sub_area_fraction, 'A1');
  });
});
