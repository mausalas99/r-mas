import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from '../../../lib/db/schema.mjs';
import { upsertBlob } from '../../../lib/db/clinical-blobs.mjs';
import {
  ensureClinicalUser,
  upsertRotationCycle,
  getActiveRotationCycle,
  archiveRotationAndTeams,
  createTeam,
  addTeamMember,
  removeTeamMember,
  setTeamGuardiaToday,
  getTeamGuardiaToday,
  promoteTeamLeader,
  getTeamById,
  updateTeam,
  archiveTeam,
  findUserTeamForAutoAssign,
  claimUsername,
  resolveBootstrapClinicalUser,
  attachClinicalIdentityByUsername,
  migrateTeamMemberships,
  listTeamsBySala,
  listTeamsForRenderer,
  buildActivePatientCountByTeam,
  buildLanAssignmentCountByTeam,
  loadCensusPatientIdSet,
  countTeamsInEffectiveSala,
  effectiveTeamSala,
  joinTeam,
  getSalaTeamCountWarning,
  SOFT_MAX_TEAMS_PER_SALA,
  getClinicalScopeContext,
  fetchIncomingAssignments,
  assignPatientToTeam,
  upsertClinicalProfile,
  touchClinicalUserActivity,
  listDirectoryUsers,
  deleteDirectoryUser,
} from '../../../lib/db/clinical-access-db.mjs';

describe('clinical-access-db', () => {
  /** @type {import('better-sqlite3').Database} */
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
    applyMigrations(db);
  });

  it('ensureClinicalUser creates and reuses a device user', () => {
    const first = ensureClinicalUser(db, { clientId: 'client-a', rank: 'Team' });
    const second = ensureClinicalUser(db, { clientId: 'client-a', rank: 'Admin' });
    assert.equal(first.userId, second.userId);
    assert.equal(second.rank, 'Team');
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
    const u1 = ensureClinicalUser(db, { clientId: 'a', rank: 'Team' });
    const u2 = ensureClinicalUser(db, { clientId: 'b', rank: 'Team' });
    const team = createTeam(db, {
      name: 'Sala A',
      service: 'HF',
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

  it('promoteTeamLeader updates leader_user_id and returns full team row', () => {
    const u = ensureClinicalUser(db, { clientId: 'leader', rank: 'Team' });
    const newLeader = ensureClinicalUser(db, { clientId: 'new-leader', rank: 'Team' });
    const team = createTeam(db, {
      name: 'Team A',
      service: 'HF',
      onCallDayIndex: 2,
      createdBy: u.userId,
    });
    assert.equal(team.leader_user_id, u.userId);

    const updated = promoteTeamLeader(db, team.team_id, newLeader.userId);
    assert.ok(updated);
    assert.equal(updated.team_id, team.team_id);
    assert.equal(updated.leader_user_id, newLeader.userId);
    assert.equal(updated.name, 'Team A');
    assert.equal(updated.service, 'HF');
    assert.equal(updated.on_call_day_index, 2);
    assert.equal(updated.rotation_active, 1);
    assert.equal(updated.archived_at, null);
  });

  it('getTeamById returns full team row', () => {
    const u = ensureClinicalUser(db, { clientId: 'u', rank: 'Team' });
    const team = createTeam(db, {
      name: 'Team B',
      service: 'HF',
      onCallDayIndex: 1,
      sala: 'Sala 1',
      teamLeaderName: 'Dr. Smith',
      createdBy: u.userId,
    });

    const fetched = getTeamById(db, team.team_id);
    assert.ok(fetched);
    assert.equal(fetched.team_id, team.team_id);
    assert.equal(fetched.name, 'Team B');
    assert.equal(fetched.service, 'HF');
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
    const u = ensureClinicalUser(db, { clientId: 'r1', rank: 'Team' });
    const leader = ensureClinicalUser(db, { clientId: 'r2leader', rank: 'Team' });
    const team = createTeam(db, {
      name: 'Auto Team',
      service: 'HF',
      onCallDayIndex: 1,
      createdBy: leader.userId,
    });
    addTeamMember(db, team.team_id, u.userId);

    const result = findUserTeamForAutoAssign(db, u.userId);
    assert.ok(result);
    assert.equal(result.team_id, team.team_id);
  });

  it('findUserTeamForAutoAssign returns null for non-member', () => {
    const u = ensureClinicalUser(db, { clientId: 'nonmember', rank: 'Team' });
    assert.equal(findUserTeamForAutoAssign(db, u.userId), null);
  });

  it('findUserTeamForAutoAssign returns null when team is archived', () => {
    const u = ensureClinicalUser(db, { clientId: 'archived-r1', rank: 'Team' });
    const leader = ensureClinicalUser(db, { clientId: 'archived-r2', rank: 'Team' });
    const team = createTeam(db, {
      name: 'Archived Team',
      service: 'HF',
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
    const u = ensureClinicalUser(db, { clientId: 'inactive-r1', rank: 'Team' });
    const leader = ensureClinicalUser(db, { clientId: 'inactive-r2', rank: 'Team' });
    const team = createTeam(db, {
      name: 'Inactive Team',
      service: 'HF',
      onCallDayIndex: 4,
      createdBy: leader.userId,
    });
    addTeamMember(db, team.team_id, u.userId);
    db.prepare(`UPDATE teams SET rotation_active = 0 WHERE team_id = ?`).run(team.team_id);

    assert.equal(findUserTeamForAutoAssign(db, u.userId), null);
  });

  it('removeTeamMember removes membership row', () => {
    const leader = ensureClinicalUser(db, { clientId: 'lead-leave', rank: 'Team' });
    const r1 = ensureClinicalUser(db, { clientId: 'r1leave', rank: 'Team' });
    const team = createTeam(db, {
      name: 'Leave Block',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 1',
      createdBy: leader.userId,
    });
    addTeamMember(db, team.team_id, r1.userId);
    removeTeamMember(db, team.team_id, r1.userId);
    const row = db
      .prepare(`SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?`)
      .get(team.team_id, r1.userId);
    assert.equal(row, undefined);
  });

  it('buildActivePatientCountByTeam ignores LAN stubs without census chart', () => {
    const leader = ensureClinicalUser(db, { clientId: 'lead-stub-count', rank: 'Team' });
    const team = createTeam(db, {
      name: 'Stub Team',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 1',
      createdBy: leader.userId,
    });
    const now = new Date().toISOString();
    assignPatientToTeam(db, { patientId: 'stub-only', teamId: team.team_id, effectiveAt: now });
    assignPatientToTeam(db, { patientId: 'p-real', teamId: team.team_id, effectiveAt: now });
    db.prepare(`INSERT OR IGNORE INTO patients (id) VALUES ('p-real')`).run();
    upsertBlob(db, 'patients', JSON.stringify([{ id: 'p-real', nombre: 'REAL' }]));
    const censusCounts = buildActivePatientCountByTeam(db, now);
    const lanCounts = buildLanAssignmentCountByTeam(db, now);
    assert.equal(censusCounts.get(team.team_id), 1);
    assert.equal(lanCounts.get(team.team_id), 2);
  });

  it('buildActivePatientCountByTeam counts latest assignment per patient', () => {
    const leader = ensureClinicalUser(db, { clientId: 'lead-pat-count', rank: 'Team' });
    const teamA = createTeam(db, {
      name: 'Team A',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 1',
      createdBy: leader.userId,
    });
    const teamB = createTeam(db, {
      name: 'Team B',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 1',
      createdBy: leader.userId,
    });
    const now = new Date().toISOString();
    assignPatientToTeam(db, { patientId: 'p1', teamId: teamA.team_id, effectiveAt: '2026-06-01T00:00:00.000Z' });
    assignPatientToTeam(db, { patientId: 'p2', teamId: teamA.team_id, effectiveAt: '2026-06-01T00:00:00.000Z' });
    assignPatientToTeam(db, { patientId: 'p1', teamId: teamB.team_id, effectiveAt: now });
    upsertBlob(
      db,
      'patients',
      JSON.stringify([
        { id: 'p1', nombre: 'P1' },
        { id: 'p2', nombre: 'P2' },
      ])
    );
    const counts = buildActivePatientCountByTeam(db, now);
    assert.equal(counts.get(teamA.team_id), 1);
    assert.equal(counts.get(teamB.team_id), 1);
  });

  it('listTeamsBySala returns members, joinEligible, and patientCount', () => {
    const leader = ensureClinicalUser(db, { clientId: 'lead', rank: 'Team' });
    const r1 = ensureClinicalUser(db, { clientId: 'r1join', rank: 'Team' });
    const team = createTeam(db, {
      name: 'Sala Team',
      service: 'HF',
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
    assert.equal(row.patientCount, 0);
    joinTeam(db, team.team_id, r1.userId);
    const after = listTeamsBySala(db, { sala: 'Sala 1', forUserId: r1.userId });
    const joined = after.find((t) => t.team_id === team.team_id);
    assert.equal(joined?.isMember, true);
  });

  it('joining a team that already has two members has no member-count cap', () => {
    const joiner = ensureClinicalUser(db, { clientId: 'joiner-full', rank: 'Team', sala: 'Sala 1' });
    const m1 = ensureClinicalUser(db, { clientId: 'm1-full', rank: 'Team', sala: 'Sala 1' });
    const m2 = ensureClinicalUser(db, { clientId: 'm2-full', rank: 'Team', sala: 'Sala 1' });
    const team = createTeam(db, {
      name: 'Full Team',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 1',
      createdBy: m1.userId,
    });
    addTeamMember(db, team.team_id, m1.userId);
    addTeamMember(db, team.team_id, m2.userId);

    const rows = listTeamsBySala(db, { sala: 'Sala 1', forUserId: joiner.userId });
    const row = rows.find((t) => t.team_id === team.team_id);
    assert.ok(row);
    assert.equal(row.joinEligible, true);
    assert.equal(String(row.joinWarning || ''), '');

    const { warnings } = joinTeam(db, team.team_id, joiner.userId);
    assert.ok(Array.isArray(warnings));
    assert.equal(warnings.length, 0);
    const member = db
      .prepare(`SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?`)
      .get(team.team_id, joiner.userId);
    assert.ok(member);
  });

  it('addTeamMember exclusive moves a member off the previous team', () => {
    const r2 = ensureClinicalUser(db, { clientId: 'r2-move', rank: 'Team', sala: 'Sala 2' });
    const r1 = ensureClinicalUser(db, { clientId: 'r1-move', rank: 'Team', sala: 'Sala 2' });
    const teamA = createTeam(db, {
      name: 'Team A',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 2',
      createdBy: r2.userId,
    });
    const teamB = createTeam(db, {
      name: 'Team B',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 2',
      createdBy: r2.userId,
    });
    addTeamMember(db, teamA.team_id, r2.userId, { subAreaFraction: 'A' });
    addTeamMember(db, teamA.team_id, r1.userId, { subAreaFraction: 'A1' });

    const movedR2 = addTeamMember(db, teamB.team_id, r2.userId, {
      subAreaFraction: 'B',
      exclusive: true,
    });
    assert.equal(movedR2.movedFrom, 1);
    assert.equal(
      db
        .prepare(`SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?`)
        .get(teamA.team_id, r2.userId),
      undefined
    );
    assert.ok(
      db
        .prepare(`SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?`)
        .get(teamB.team_id, r2.userId)
    );

    const movedR1 = addTeamMember(db, teamB.team_id, r1.userId, {
      subAreaFraction: 'B1',
      exclusive: true,
    });
    assert.equal(movedR1.movedFrom, 1);
    assert.equal(
      db
        .prepare(`SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?`)
        .get(teamA.team_id, r1.userId),
      undefined
    );
    assert.equal(
      db
        .prepare(`SELECT sub_area_fraction AS f FROM team_membership WHERE team_id = ? AND user_id = ?`)
        .get(teamB.team_id, r1.userId)?.f,
      'B1'
    );
  });

  it('allows more than SOFT_MAX_TEAMS_PER_SALA teams with create warning but no per-team joinWarning', () => {
    for (let i = 0; i < SOFT_MAX_TEAMS_PER_SALA; i += 1) {
      const leader = ensureClinicalUser(db, {
        clientId: `sala-max-lead-${i}`,
        rank: 'Team',
        sala: 'Sala 1',
      });
      const team = createTeam(db, {
        name: `Team ${i + 1}`,
        service: 'HF',
        onCallDayIndex: 0,
        sala: 'Sala 1',
        createdBy: leader.userId,
      });
      addTeamMember(db, team.team_id, leader.userId);
    }
    assert.match(String(getSalaTeamCountWarning(db, 'Sala 1') || ''), /recomendado máximo/);
    const joiner = ensureClinicalUser(db, {
      clientId: 'sala-max-joiner',
      rank: 'Team',
      sala: 'Sala 1',
    });
    // Directory only lists rotation_active=1; soft-cap still counts staged teams.
    const listed = listTeamsBySala(db, { sala: 'Sala 1', forUserId: joiner.userId });
    assert.ok(listed.length >= 1);
    for (const row of listed) {
      if (!row.isMember) assert.equal(String(row.joinWarning || ''), '');
    }
    const extraLeader = ensureClinicalUser(db, {
      clientId: 'sala-max-lead-extra',
      rank: 'Team',
      sala: 'Sala 1',
    });
    const extra = createTeam(db, {
      name: 'Team extra',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 1',
      createdBy: extraLeader.userId,
    });
    assert.ok(extra.team_id);
    assert.equal(countTeamsInEffectiveSala(db, 'Sala 1'), SOFT_MAX_TEAMS_PER_SALA + 1);
  });

  it('countTeamsInEffectiveSala includes teams inferred from creator', () => {
    const leader = ensureClinicalUser(db, {
      clientId: 'lead-count-sala',
      rank: 'Team',
      sala: 'Sala 2',
    });
    createTeam(db, {
      name: 'Inferred Sala Team',
      service: 'HF',
      onCallDayIndex: 0,
      createdBy: leader.userId,
    });
    assert.equal(countTeamsInEffectiveSala(db, 'Sala 2'), 1);
  });

  it('listTeamsBySala matches teams without sala via creator profile', () => {
    const leader = ensureClinicalUser(db, {
      clientId: 'lead-infer-sala',
      rank: 'Team',
      sala: 'Sala 2',
    });
    const r1 = ensureClinicalUser(db, { clientId: 'r1-infer-sala', rank: 'Team', sala: 'Sala 2' });
    const team = createTeam(db, {
      name: 'Legacy Team',
      service: 'HF',
      onCallDayIndex: 0,
      createdBy: leader.userId,
    });
    assert.equal(effectiveTeamSala(db, team), 'Sala 2');
    addTeamMember(db, team.team_id, leader.userId);
    const rows = listTeamsBySala(db, { sala: 'Sala 2', forUserId: r1.userId });
    assert.ok(rows.some((t) => t.team_id === team.team_id));
  });

  it('claimUsername updates row and rejects duplicate', () => {
    const u1 = ensureClinicalUser(db, { clientId: 'device-a', rank: 'Team' });
    const u2 = ensureClinicalUser(db, { clientId: 'device-b', rank: 'Team' });
    claimUsername(db, { userId: u1.userId, username: 'mgarcia' });
    const row = db.prepare('SELECT username FROM users WHERE user_id = ?').get(u1.userId);
    assert.equal(row.username, 'mgarcia');
    assert.throws(
      () => claimUsername(db, { userId: u2.userId, username: 'mgarcia' }),
      /ya está en uso/
    );
  });

  it('resolveBootstrapClinicalUser prefers LAN handle over new device row', () => {
    const u1 = ensureClinicalUser(db, { clientId: 'device-a', rank: 'Team' });
    claimUsername(db, { userId: u1.userId, username: 'msalas' });
    const ghost = ensureClinicalUser(db, { clientId: 'device-b', rank: 'Team' });
    assert.notEqual(ghost.userId, u1.userId);
    const resumed = resolveBootstrapClinicalUser(db, {
      clientId: 'device-b',
      rank: 'Team',
      preferredUsername: 'msalas',
    });
    assert.equal(resumed.userId, u1.userId);
    assert.equal(resumed.username, 'msalas');
  });

  it('resolveBootstrapClinicalUser prefers stored user id', () => {
    const u1 = ensureClinicalUser(db, { clientId: 'device-a', rank: 'Team' });
    const resumed = resolveBootstrapClinicalUser(db, {
      clientId: 'other-device',
      preferredUserId: u1.userId,
    });
    assert.equal(resumed.userId, u1.userId);
  });

  it('resolveBootstrapClinicalUser ignores stale user id when LAN handle is set', () => {
    const u1 = ensureClinicalUser(db, { clientId: 'device-a', rank: 'Team' });
    claimUsername(db, { userId: u1.userId, username: 'msalas' });
    const ghost = ensureClinicalUser(db, { clientId: 'device-b', rank: 'Team' });
    const resumed = resolveBootstrapClinicalUser(db, {
      clientId: 'device-b',
      preferredUserId: ghost.userId,
      preferredUsername: 'msalas',
    });
    assert.equal(resumed.userId, u1.userId);
    assert.equal(resumed.username, 'msalas');
  });

  it('migrateTeamMemberships moves rows to recovered user', () => {
    const ghost = ensureClinicalUser(db, { clientId: 'ghost-dev', rank: 'Team' });
    const real = ensureClinicalUser(db, { clientId: 'real-dev', rank: 'Team' });
    claimUsername(db, { userId: real.userId, username: 'msalas' });
    const team = createTeam(db, {
      name: 'Equipo',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 1',
      createdBy: ghost.userId,
    });
    joinTeam(db, team.team_id, ghost.userId);
    const moved = migrateTeamMemberships(db, {
      fromUserId: ghost.userId,
      toUserId: real.userId,
    });
    assert.equal(moved.moved, 1);
    const members = db
      .prepare('SELECT user_id FROM team_membership WHERE team_id = ?')
      .all(team.team_id);
    assert.equal(members.length, 1);
    assert.equal(members[0].user_id, real.userId);
  });

  it('attachClinicalIdentityByUsername returns existing LAN user', () => {
    const u1 = ensureClinicalUser(db, { clientId: 'device-a', rank: 'Team' });
    claimUsername(db, { userId: u1.userId, username: 'msalas' });
    const found = attachClinicalIdentityByUsername(db, 'msalas');
    assert.equal(found.userId, u1.userId);
    assert.throws(() => attachClinicalIdentityByUsername(db, 'nope'), /No encontramos/);
  });

  it('touchClinicalUserActivity keeps newest; profile upsert does not stamp activity', () => {
    const u = ensureClinicalUser(db, { clientId: 'activity-dev', rank: 'Team' });
    touchClinicalUserActivity(db, u.userId, '2026-06-10T10:00:00.000Z');
    let row = db.prepare('SELECT last_activity_at FROM users WHERE user_id = ?').get(u.userId);
    assert.equal(row.last_activity_at, '2026-06-10T10:00:00.000Z');
    touchClinicalUserActivity(db, u.userId, '2026-06-09T08:00:00.000Z');
    row = db.prepare('SELECT last_activity_at FROM users WHERE user_id = ?').get(u.userId);
    assert.equal(row.last_activity_at, '2026-06-10T10:00:00.000Z');
    upsertClinicalProfile(db, {
      userId: u.userId,
      clinicalName: 'Dr. Activo',
      rank: 'Team',
      sala: 'Sala 1',
    });
    row = db.prepare('SELECT last_activity_at FROM users WHERE user_id = ?').get(u.userId);
    assert.equal(row.last_activity_at, '2026-06-10T10:00:00.000Z');
  });

  it('upsertClinicalProfile requires admin code when enabling program admin', () => {
    const u = ensureClinicalUser(db, { clientId: 'device-a', rank: 'Team' });
    assert.throws(
      () =>
        upsertClinicalProfile(db, {
          userId: u.userId,
          clinicalName: 'Dr. Test',
          rank: 'Team',
          sala: 'Sala 1',
          isProgramAdmin: true,
        }),
      /Código de administración incorrecto/
    );
    const profile = upsertClinicalProfile(db, {
      userId: u.userId,
      clinicalName: 'Dr. Test',
      rank: 'Team',
      sala: 'Sala 1',
      isProgramAdmin: true,
      adminAccessCode: 'Msg170699',
    });
    assert.equal(profile.is_program_admin, 1);
  });

  it('upsertClinicalProfile requires admin code to demote an existing admin', () => {
    const u = ensureClinicalUser(db, { clientId: 'device-admin-demo', rank: 'Team' });
    upsertClinicalProfile(db, {
      userId: u.userId,
      clinicalName: 'Dr. Admin',
      rank: 'Team',
      sala: 'Unidad IC',
      isProgramAdmin: true,
      adminAccessCode: 'Msg170699',
    });
    assert.throws(
      () =>
        upsertClinicalProfile(db, {
          userId: u.userId,
          clinicalName: 'Dr. Admin',
          rank: 'Team',
          sala: 'Unidad IC',
          isProgramAdmin: false,
        }),
      /Código de administración incorrecto/
    );
    // Omitting the flag (e.g. an unrelated profile save) must not touch admin status.
    const unchanged = upsertClinicalProfile(db, {
      userId: u.userId,
      clinicalName: 'Dr. Admin',
      rank: 'Team',
      sala: 'Unidad IC',
    });
    assert.equal(unchanged.is_program_admin, 1);
  });

  it('updateTeam and archiveTeam require elevated roster privileges', () => {
    const r2 = ensureClinicalUser(db, { clientId: 'r2-dev', rank: 'Team' });
    const r4 = ensureClinicalUser(db, { clientId: 'r4-dev', rank: 'Admin' });
    const team = createTeam(db, {
      name: 'Equipo A',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 1',
      createdBy: r4.userId,
    });

    assert.throws(
      () => updateTeam(db, team.team_id, { name: 'Nuevo', callerUserId: r2.userId }),
      /privilegios de administración/
    );
    assert.throws(
      () => archiveTeam(db, team.team_id, r2.userId),
      /privilegios de administración/
    );

    const updated = updateTeam(db, team.team_id, {
      name: 'Equipo renombrado',
      sala: 'Sala 2',
      callerUserId: r4.userId,
    });
    assert.equal(updated.name, 'Equipo renombrado');
    assert.equal(updated.sala, 'Sala 2');

    const archived = archiveTeam(db, team.team_id, r4.userId);
    assert.ok(archived.archived_at);
    assert.equal(getTeamById(db, team.team_id).archived_at, archived.archived_at);
    assert.equal(
      db.prepare('SELECT COUNT(*) AS cnt FROM team_membership WHERE team_id = ?').get(team.team_id)
        .cnt,
      0
    );
  });

  it('getClinicalScopeContext includes active patient team assignments', () => {
    const admin = ensureClinicalUser(db, { clientId: 'admin-scope', rank: 'Admin' });
    const team = createTeam(db, {
      name: 'Equipo A',
      service: 'HF',
      onCallDayIndex: 1,
      sala: 'Sala 1',
      createdBy: admin.userId,
    });
    assignPatientToTeam(db, {
      patientId: 'p-active',
      teamId: team.team_id,
      effectiveAt: '2026-06-01T00:00:00Z',
    });
    const ctx = getClinicalScopeContext(db, admin.userId);
    assert.ok(Array.isArray(ctx.assignments));
    assert.equal(
      ctx.assignments.some((row) => row.patient_id === 'p-active' && row.team_id === team.team_id),
      true
    );
  });

  it('getClinicalScopeContext includes teams_archived for month handoff', () => {
    const admin = ensureClinicalUser(db, { clientId: 'admin-arch', rank: 'Admin' });
    const team = createTeam(db, {
      name: 'Dr. Fer',
      service: 'HF',
      onCallDayIndex: 1,
      sala: 'Sala 2',
      subAreaFraction: 'B',
      createdBy: admin.userId,
    });
    archiveTeam(db, team.team_id, admin.userId);
    const ctx = getClinicalScopeContext(db, admin.userId);
    assert.ok(Array.isArray(ctx.teams_archived));
    assert.ok(ctx.teams_archived.some((t) => t.team_id === team.team_id && t.name === 'Dr. Fer'));
    assert.equal(ctx.teams.some((t) => t.team_id === team.team_id), false);
  });

  it('fetchIncomingAssignments uses only patients columns present in schema', () => {
    const admin = ensureClinicalUser(db, { clientId: 'admin', rank: 'Admin' });
    upsertRotationCycle(db, {
      monthEndAt: '2026-05-31T23:59:59',
      effectiveAt: '2026-06-01T00:00:00',
      previewDays: 2,
      createdBy: admin.userId,
    });
    db.prepare(`INSERT INTO patients (id) VALUES ('p-incoming')`).run();
    const team = createTeam(db, {
      name: 'Sala 2',
      service: 'HF',
      onCallDayIndex: 1,
      sala: 'Sala 2',
      createdBy: admin.userId,
    });
    assignPatientToTeam(db, {
      patientId: 'p-incoming',
      teamId: team.team_id,
      effectiveAt: '2026-06-01T00:00:00',
    });
    const nowIso = '2026-05-30T12:00:00';
    const rows = fetchIncomingAssignments(db, nowIso);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].patient_id, 'p-incoming');
    assert.doesNotThrow(() => getClinicalScopeContext(db));
  });

  it('listDirectoryUsers includes registered handles and teammates pending @usuario', () => {
    const admin = ensureClinicalUser(db, {
      clientId: 'admin-dir',
      rank: 'Admin',
      clinicalName: 'Admin',
    });
    claimUsername(db, { userId: admin.userId, username: 'admin_dir' });

    const legacy = ensureClinicalUser(db, {
      clientId: 'lc_pending_device',
      rank: 'Team',
      clinicalName: 'Residente Pendiente',
      sala: 'Sala 1',
    });
    const team = createTeam(db, {
      name: 'Equipo dir',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 1',
      createdBy: admin.userId,
    });
    addTeamMember(db, team.team_id, legacy.userId);

    const listed = listDirectoryUsers(db);
    const adminRow = listed.find((u) => u.user_id === admin.userId);
    const legacyRow = listed.find((u) => u.user_id === legacy.userId);
    assert.ok(adminRow);
    assert.equal(adminRow.lanDirectoryPending, false);
    assert.ok(legacyRow);
    assert.equal(legacyRow.lanDirectoryPending, true);
  });

  it('deleteDirectoryUser removes user and blocks listDirectoryUsers', () => {
    const admin = ensureClinicalUser(db, {
      clientId: 'admin-del',
      rank: 'Admin',
      clinicalName: 'Admin Del',
    });
    claimUsername(db, { userId: admin.userId, username: 'admin_del' });

    const target = ensureClinicalUser(db, {
      clientId: 'target-del-device',
      rank: 'Team',
      clinicalName: 'Borrar Yo',
      sala: 'Sala 1',
    });
    claimUsername(db, { userId: target.userId, username: 'borrar_yo' });
    const team = createTeam(db, {
      name: 'Equipo del',
      service: 'HF',
      onCallDayIndex: 1,
      createdBy: admin.userId,
      sala: 'Sala 1',
    });
    joinTeam(db, team.team_id, target.userId);

    deleteDirectoryUser(db, {
      targetUserId: target.userId,
      callerUserId: admin.userId,
    });

    assert.equal(
      db.prepare('SELECT 1 AS ok FROM users WHERE user_id = ?').get(target.userId),
      undefined
    );
    assert.equal(
      db
        .prepare('SELECT 1 AS ok FROM team_membership WHERE team_id = ? AND user_id = ?')
        .get(team.team_id, target.userId),
      undefined
    );
    const listed = listDirectoryUsers(db);
    assert.ok(!listed.some((u) => u.user_id === target.userId));
    assert.throws(
      () =>
        deleteDirectoryUser(db, {
          targetUserId: admin.userId,
          callerUserId: admin.userId,
        }),
      /No puedes eliminar tu propio usuario/
    );
  });

  it('stages new teams while current rotation is active and promotes them on nueva rotación', () => {
    const leader = ensureClinicalUser(db, { clientId: 'lead-rot-stage', rank: 'Admin' });
    const r1 = ensureClinicalUser(db, { clientId: 'r1-rot-stage', rank: 'Team' });
    const current = createTeam(db, {
      name: 'Dr. Fer',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 2',
      createdBy: leader.userId,
    });
    assert.equal(current.rotation_active, 1);
    const incoming = createTeam(db, {
      name: 'Dra. Leslie',
      service: 'HF',
      onCallDayIndex: 0,
      sala: 'Sala 2',
      createdBy: leader.userId,
    });
    assert.equal(incoming.rotation_active, 0);

    const browse = listTeamsBySala(db, { sala: 'Sala 2', forUserId: r1.userId });
    assert.ok(browse.some((t) => t.team_id === current.team_id));
    assert.ok(!browse.some((t) => t.team_id === incoming.team_id));

    addTeamMember(db, incoming.team_id, r1.userId);
    const rendererTeams = listTeamsForRenderer(db, r1.userId);
    assert.ok(rendererTeams.some((t) => t.team_id === incoming.team_id));

    archiveRotationAndTeams(db);
    assert.ok(getTeamById(db, current.team_id).archived_at);
    assert.equal(getTeamById(db, incoming.team_id).rotation_active, 1);
    assert.equal(getTeamById(db, incoming.team_id).archived_at, null);
  });
});
