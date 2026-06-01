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
});
