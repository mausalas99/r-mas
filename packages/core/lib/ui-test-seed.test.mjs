import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './db/schema.mjs';
import { getBlob } from './db/clinical-blobs.mjs';
import {
  buildUiTestRoster,
  seedUiTestData,
  seedUiTestTeams,
  seedUiTestUser,
  UI_TEST_TEAMS,
  UI_TEST_USERNAME,
} from './ui-test-seed.mjs';
import { listActiveTeams, listTeamMembers } from './db/clinical-access-teams-core.mjs';
import { findClinicalUserByUsername } from './db/clinical-access-users.mjs';

describe('ui-test-seed', () => {
  it('builds a roster spanning Censo/Sala/Guardia teams with unique ids and registros', () => {
    const { patients } = buildUiTestRoster(new Date('2026-09-18T12:00:00Z'));
    assert.ok(patients.length >= 15);
    const ids = new Set(patients.map((p) => p.id));
    const registros = new Set(patients.map((p) => p.registro));
    assert.equal(ids.size, patients.length);
    assert.equal(registros.size, patients.length);
    const teams = new Set(patients.map((p) => p.censusTeamId));
    assert.ok(teams.has(UI_TEST_TEAMS.CENSO));
    assert.ok(teams.has(UI_TEST_TEAMS.SALA));
    assert.ok(teams.has(UI_TEST_TEAMS.GUARDIA));
    assert.ok(patients.some((p) => p.interconsult_type !== 'None'));
    assert.ok(patients.every((p) => !p.isDemo));
  });

  it('parses lab fixtures for real (non-empty resLabs) for structured and raw-fixture patients', () => {
    const { patients, labHistory } = buildUiTestRoster(new Date('2026-09-18T12:00:00Z'));
    const withLabs = patients.filter((p) => labHistory[p.id]);
    assert.ok(withLabs.length > 0);
    for (const p of withLabs) {
      for (const entry of labHistory[p.id]) {
        assert.ok(Array.isArray(entry.resLabs) && entry.resLabs.length > 0, `${p.id} resLabs`);
        assert.ok(entry.sourceText && entry.sourceText.includes('Expediente'));
      }
    }
  });

  it('seedUiTestData writes patients + labHistory via the real upsertBlob path', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const result = seedUiTestData(db, new Date('2026-09-18T12:00:00Z'));
    assert.ok(result.patientCount > 0);
    const patients = JSON.parse(getBlob(db, 'patients'));
    const labHistory = JSON.parse(getBlob(db, 'labHistory'));
    assert.equal(patients.length, result.patientCount);
    assert.equal(Object.keys(labHistory).length, result.labHistoryPatientCount);
    db.close();
  });

  it('seedUiTestTeams creates one real, unowned, unjoined team per sala', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    const created = seedUiTestTeams(db);
    assert.equal(created.length, 8);
    const teams = listActiveTeams(db);
    assert.equal(teams.length, 8);
    assert.ok(teams.some((t) => t.sala === 'Sala 1'));
    assert.ok(teams.every((t) => t.created_by === null && t.leader_user_id === null));
    db.close();
  });

  it('seedUiTestUser creates the fixed uitest account already joined to the Sala 1 team', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    seedUiTestTeams(db);
    const user = seedUiTestUser(db);
    assert.equal(user.username, UI_TEST_USERNAME);
    const salaOneTeam = listActiveTeams(db).find((t) => t.sala === 'Sala 1');
    const members = listTeamMembers(db, salaOneTeam.team_id);
    assert.ok(members.some((m) => m.user_id === user.userId));
  });

  it('seedUiTestUser is idempotent — a second call reuses the same user, no throw', () => {
    const db = new Database(':memory:');
    applyMigrations(db);
    seedUiTestTeams(db);
    const first = seedUiTestUser(db);
    const second = seedUiTestUser(db);
    assert.equal(second.userId, first.userId);
    assert.ok(findClinicalUserByUsername(db, UI_TEST_USERNAME));
  });
});
