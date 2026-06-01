import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import {
  ensureClinicalUser,
  fetchActiveGuardias,
  upsertRotationCycle,
  getActiveRotationCycle,
  createTeam,
  addTeamMember,
  setTeamGuardiaToday,
  getTeamGuardiaToday,
  upsertActiveGuardia,
  promoteTeamLeader,
  getTeamById,
  findUserTeamForAutoAssign,
  claimUsername,
  listTeamsBySala,
  joinTeam,
} from './clinical-access-db.mjs';

describe('clinical-access-db', () => {
  /** @type {import('better-sqlite3').Database} */
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
    applyMigrations(db);
  });

  it('ensureClinicalUser creates and reuses a device user', () => {
    const first = ensureClinicalUser(db, { clientId: 'client-a', rank: 'R2' });
    const second = ensureClinicalUser(db, { clientId: 'client-a', rank: 'R4' });
    assert.equal(first.userId, second.userId);
    assert.equal(second.rank, 'R2');
    assert.match(first.publicKeyPem, /BEGIN PUBLIC KEY/);
    assert.match(first.privateKeyPem, /BEGIN PRIVATE KEY/);
  });

  it('derives preview_start_at from effective_at and preview_days', () => {
    db.prepare(
      `INSERT INTO users (user_id, username, password_hash, rank, public_key, encrypted_private_key)
       VALUES ('u-admin', 'u-admin', 'x', 'Admin', 'pk', 'ek')`
    ).run();
    const cycle = upsertRotationCycle(db, {
      monthEndAt: '2026-05-31T23:59:59',
      effectiveAt: '2026-06-01T00:00:00',
      previewDays: 2,
      createdBy: 'u-admin',
    });
    assert.equal(cycle.preview_start_at, '2026-05-30T00:00:00');
    assert.equal(getActiveRotationCycle(db)?.cycle_id, cycle.cycle_id);
  });

  it('declares team Guardia with last-write per team_id', () => {
    const u1 = ensureClinicalUser(db, { clientId: 'a', rank: 'R2' });
    const u2 = ensureClinicalUser(db, { clientId: 'b', rank: 'R2' });
    const team = createTeam(db, {
      name: 'Sala A',
      service: 'Sala',
      onCallDayIndex: 1,
      createdBy: u1.userId,
    });
    assert.equal(team.leader_user_id, u1.userId);
    assert.equal(team.rotation_active, 1);
    addTeamMember(db, team.team_id, u1.userId);
    setTeamGuardiaToday(db, team.team_id, u1.userId);
    setTeamGuardiaToday(db, team.team_id, u2.userId);
    const g = getTeamGuardiaToday(db, team.team_id);
    assert.equal(g.user_id, u2.userId);
  });

  it('upserts guardia row for Entrega', () => {
    const u = ensureClinicalUser(db, { clientId: 'r1', rank: 'R1' });
    const team = createTeam(db, {
      name: 'A1',
      service: 'Sala',
      onCallDayIndex: 0,
      createdBy: u.userId,
    });
    upsertActiveGuardia(db, {
      patientId: 'p1',
      coveringUserId: u.userId,
      sourceTeamId: team.team_id,
      isCritical: 1,
      pendientesJson: '[]',
      vitalsFrequency: '2h',
    });
    const rows = fetchActiveGuardias(db);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].patient_id, 'p1');
    assert.equal(rows[0].is_critical, 1);
    assert.equal(rows[0].vitals_frequency, '2h');
  });

  it('fetchActiveGuardias filters by covering user', () => {
    const user = ensureClinicalUser(db, { clientId: 'u1' });
    const other = ensureClinicalUser(db, { clientId: 'u2' });
    db.prepare(
      `INSERT INTO active_guardias (guardia_id, patient_id, covering_user_id, source_team_id, status)
       VALUES ('g1', 'p1', ?, 't1', 'Active')`
    ).run(user.userId);
    db.prepare(
      `INSERT INTO active_guardias (guardia_id, patient_id, covering_user_id, source_team_id, status)
       VALUES ('g2', 'p2', ?, 't1', 'Active')`
    ).run(other.userId);

    const mine = fetchActiveGuardias(db, user.userId);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].patient_id, 'p1');
  });

  it('promoteTeamLeader updates leader_user_id and returns full team row', () => {
    const u = ensureClinicalUser(db, { clientId: 'leader', rank: 'R2' });
    const newLeader = ensureClinicalUser(db, { clientId: 'new-leader', rank: 'R2' });
    const team = createTeam(db, {
      name: 'Team A',
      service: 'Sala',
      onCallDayIndex: 2,
      createdBy: u.userId,
    });
    assert.equal(team.leader_user_id, u.userId);

    const updated = promoteTeamLeader(db, team.team_id, newLeader.userId);
    assert.ok(updated);
    assert.equal(updated.team_id, team.team_id);
    assert.equal(updated.leader_user_id, newLeader.userId);
    assert.equal(updated.name, 'Team A');
    assert.equal(updated.service, 'Sala');
    assert.equal(updated.on_call_day_index, 2);
    assert.equal(updated.rotation_active, 1);
    assert.equal(updated.archived_at, null);
  });

  it('getTeamById returns full team row', () => {
    const u = ensureClinicalUser(db, { clientId: 'u', rank: 'R2' });
    const team = createTeam(db, {
      name: 'Team B',
      service: 'Sala',
      onCallDayIndex: 1,
      sala: 'Sala 1',
      teamLeaderName: 'Dr. Smith',
      createdBy: u.userId,
    });

    const fetched = getTeamById(db, team.team_id);
    assert.ok(fetched);
    assert.equal(fetched.team_id, team.team_id);
    assert.equal(fetched.name, 'Team B');
    assert.equal(fetched.service, 'Sala');
    assert.equal(fetched.on_call_day_index, 1);
    assert.equal(fetched.sala, 'Sala 1');
    assert.equal(fetched.team_leader_name, 'Dr. Smith');
    assert.equal(fetched.leader_user_id, u.userId);
    assert.equal(fetched.rotation_active, 1);
    assert.equal(fetched.sub_area_fraction, null);
    assert.equal(fetched.archived_at, null);
  });

  it('getTeamById returns undefined for nonexistent team', () => {
    assert.equal(getTeamById(db, 'nonexistent-id'), undefined);
  });

  it('findUserTeamForAutoAssign returns team_id for active team member', () => {
    const u = ensureClinicalUser(db, { clientId: 'r1', rank: 'R1' });
    const leader = ensureClinicalUser(db, { clientId: 'r2leader', rank: 'R2' });
    const team = createTeam(db, {
      name: 'Auto Team',
      service: 'Sala',
      onCallDayIndex: 1,
      createdBy: leader.userId,
    });
    addTeamMember(db, team.team_id, u.userId);

    const result = findUserTeamForAutoAssign(db, u.userId);
    assert.ok(result);
    assert.equal(result.team_id, team.team_id);
  });

  it('findUserTeamForAutoAssign returns null for non-member', () => {
    const u = ensureClinicalUser(db, { clientId: 'nonmember', rank: 'R1' });
    assert.equal(findUserTeamForAutoAssign(db, u.userId), null);
  });

  it('findUserTeamForAutoAssign returns null when team is archived', () => {
    const u = ensureClinicalUser(db, { clientId: 'archived-r1', rank: 'R1' });
    const leader = ensureClinicalUser(db, { clientId: 'archived-r2', rank: 'R2' });
    const team = createTeam(db, {
      name: 'Archived Team',
      service: 'Sala',
      onCallDayIndex: 3,
      createdBy: leader.userId,
    });
    addTeamMember(db, team.team_id, u.userId);
    db.prepare(`UPDATE teams SET archived_at = ?, rotation_active = 0 WHERE team_id = ?`).run(
      new Date().toISOString(),
      team.team_id
    );

    assert.equal(findUserTeamForAutoAssign(db, u.userId), null);
  });

  it('findUserTeamForAutoAssign returns null when rotation_active is 0', () => {
    const u = ensureClinicalUser(db, { clientId: 'inactive-r1', rank: 'R1' });
    const leader = ensureClinicalUser(db, { clientId: 'inactive-r2', rank: 'R2' });
    const team = createTeam(db, {
      name: 'Inactive Team',
      service: 'Sala',
      onCallDayIndex: 4,
      createdBy: leader.userId,
    });
    addTeamMember(db, team.team_id, u.userId);
    db.prepare(`UPDATE teams SET rotation_active = 0 WHERE team_id = ?`).run(team.team_id);

    assert.equal(findUserTeamForAutoAssign(db, u.userId), null);
  });

  it('listTeamsBySala returns members and joinEligible', () => {
    const leader = ensureClinicalUser(db, { clientId: 'lead', rank: 'R2' });
    const r1 = ensureClinicalUser(db, { clientId: 'r1join', rank: 'R1' });
    const team = createTeam(db, {
      name: 'Sala Team',
      service: 'Sala',
      onCallDayIndex: 0,
      sala: 'Sala 1',
      createdBy: leader.userId,
    });
    addTeamMember(db, team.team_id, leader.userId);
    const rows = listTeamsBySala(db, { sala: 'Sala 1', forUserId: r1.userId });
    assert.ok(rows.length >= 1);
    const row = rows.find((t) => t.team_id === team.team_id);
    assert.ok(row);
    assert.ok(Array.isArray(row.members));
    assert.equal(row.joinEligible, true);
    joinTeam(db, team.team_id, r1.userId);
    const after = listTeamsBySala(db, { sala: 'Sala 1', forUserId: r1.userId });
    const joined = after.find((t) => t.team_id === team.team_id);
    assert.equal(joined?.isMember, true);
  });

  it('claimUsername updates row and rejects duplicate', () => {
    const u1 = ensureClinicalUser(db, { clientId: 'device-a', rank: 'R1' });
    const u2 = ensureClinicalUser(db, { clientId: 'device-b', rank: 'R1' });
    claimUsername(db, { userId: u1.userId, username: 'mgarcia' });
    const row = db.prepare('SELECT username FROM users WHERE user_id = ?').get(u1.userId);
    assert.equal(row.username, 'mgarcia');
    assert.throws(
      () => claimUsername(db, { userId: u2.userId, username: 'mgarcia' }),
      /ya está en uso/
    );
  });
});
