import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import { migrateToV29AssignmentTombstone } from './schema-migrate-v29-assignment-tombstone.mjs';
import { createTeam, ensureClinicalUser } from './clinical-access-db.mjs';
import { assignPatientToTeam } from './clinical-access-assignments.mjs';
import {
  exportClinicalOpsSnapshot,
  exportClinicalOpsSnapshotForSala,
  mergeClinicalOpsSnapshot,
} from './clinical-ops-sync.mjs';
import { mergeClinicalOpsSnapshotsData } from './clinical-ops-bundle-merge.cjs';
import { resolvePatientTeamIdFromAssignments, patientHasExplicitTeamAssignment } from '../clinical-scope/team-membership.mjs';
import { resolvePatientCensusTeamId, tagPatientsForTeamFilter, applyElevatedPatientFilters } from '../../public/js/features/patients-clinical-filter.mjs';
import { mergeClinicalOpsLww } from '../../cloud/sync-worker/src/clinical-ops-lww.js';

function openDb() {
  const db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

function seed(db) {
  const u = ensureClinicalUser(db, { clientId: 'c1', rank: 'R4' });
  return createTeam(db, { name: 'Equipo A', service: 'Sala', onCallDayIndex: 0, sala: 'Sala 1', createdBy: u.userId });
}

const T1 = '2026-09-30T10:00:00.000Z';
const T2 = '2026-09-30T11:00:00.000Z';
const now = '2026-09-30T12:00:00.000Z';

describe('patient_team_assignment tombstone (team_id empty)', () => {
  it('migration v29 drops the teams FK, keeps rows, and is a no-op twice', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE app_meta (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE patients (id TEXT PRIMARY KEY);
      CREATE TABLE teams (team_id TEXT PRIMARY KEY);
      CREATE TABLE patient_team_assignment (
        patient_id TEXT NOT NULL, team_id TEXT NOT NULL, effective_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (patient_id, team_id, effective_at),
        FOREIGN KEY(patient_id) REFERENCES patients(id),
        FOREIGN KEY(team_id) REFERENCES teams(team_id));
      INSERT INTO patients VALUES ('p1'); INSERT INTO teams VALUES ('t1');
      INSERT INTO patient_team_assignment (patient_id, team_id, effective_at) VALUES ('p1','t1','${T1}');
    `);
    migrateToV29AssignmentTombstone(db);
    migrateToV29AssignmentTombstone(db);
    db.prepare(`INSERT INTO patient_team_assignment (patient_id, team_id, effective_at) VALUES ('p1','',?)`).run(T2);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM patient_team_assignment').get().n, 2);
    assert.equal(db.prepare("SELECT value FROM app_meta WHERE key='schema_version'").get().value, '29');
    db.close();
  });

  it('fresh DB accepts an empty team and the resolver returns no team', () => {
    const db = openDb();
    const team = seed(db);
    assignPatientToTeam(db, { patientId: 'p1', teamId: team.team_id, effectiveAt: T1 });
    assignPatientToTeam(db, { patientId: 'p1', teamId: '', effectiveAt: T2 });
    const rows = db.prepare('SELECT * FROM patient_team_assignment').all();
    assert.equal(resolvePatientTeamIdFromAssignments('p1', rows, now), '');
    assert.equal(resolvePatientTeamIdFromAssignments('p1', rows.filter((r) => r.team_id), now), team.team_id);
    db.close();
  });

  it('export keeps the tombstone for the sala that held the patient', () => {
    const db = openDb();
    const team = seed(db);
    assignPatientToTeam(db, { patientId: 'p1', teamId: team.team_id, effectiveAt: T1 });
    assignPatientToTeam(db, { patientId: 'p1', teamId: '', effectiveAt: T2 });
    assignPatientToTeam(db, { patientId: 'p2', teamId: '', effectiveAt: T2 });
    const snap = exportClinicalOpsSnapshotForSala(db, 'Sala 1');
    const tomb = snap.patient_team_assignment.filter((r) => !r.team_id);
    assert.deepEqual(tomb.map((r) => r.patient_id), ['p1']);
    db.close();
  });

  it('peer DB merge and bundle merge both apply the tombstone', () => {
    const a = openDb();
    const b = openDb();
    const team = seed(a);
    assignPatientToTeam(a, { patientId: 'p1', teamId: team.team_id, effectiveAt: T1 });
    mergeClinicalOpsSnapshot(b, exportClinicalOpsSnapshot(a));
    assignPatientToTeam(a, { patientId: 'p1', teamId: '', effectiveAt: T2 });
    const snapA = exportClinicalOpsSnapshot(a);
    mergeClinicalOpsSnapshot(b, snapA);
    const rowsB = b.prepare('SELECT * FROM patient_team_assignment').all();
    assert.equal(resolvePatientTeamIdFromAssignments('p1', rowsB, now), '');
    const merged = mergeClinicalOpsSnapshotsData(exportClinicalOpsSnapshot(b), snapA);
    assert.equal(resolvePatientTeamIdFromAssignments('p1', merged.patient_team_assignment, now), '');
    a.close();
    b.close();
  });

  it('Worker keeps the tombstone and a later re-assign to the same team', () => {
    const rows = (...r) => ({ patient_team_assignment: r });
    const A = { patient_id: 'p1', team_id: 't1', effective_at: T1 };
    const none = { patient_id: 'p1', team_id: '', effective_at: T2 };
    const again = { patient_id: 'p1', team_id: 't1', effective_at: '2026-09-30T11:30:00.000Z' };
    const out = mergeClinicalOpsLww(rows(A), rows(none, again)).patient_team_assignment;
    assert.equal(out.length, 3);
    assert.equal(mergeClinicalOpsLww(rows(A, none), rows(A)).patient_team_assignment.length, 2);
  });

  it('a «no team» row leaves the patient unassigned, with no structural guess', () => {
    const teams = [{ team_id: 't1', name: 'EQUIPO A', service: 'Sala', sala: 'Sala 1' }];
    const rows = [
      { patient_id: 'p1', team_id: 't1', effective_at: T1 },
      { patient_id: 'p1', team_id: '', effective_at: T2 },
    ];
    assert.equal(patientHasExplicitTeamAssignment('p1', rows.slice(0, 1)), true);
    assert.equal(patientHasExplicitTeamAssignment('p1', rows), false);
    assert.equal(resolvePatientCensusTeamId({ id: 'p1', sala: 'Sala 1', servicio: 'Sala' }, teams, rows, now), '');
    assert.equal(resolvePatientCensusTeamId({ id: 'p1' }, teams, rows.slice(0, 1), now), 't1');
  });

  it('the «Sin equipo asignado» filter lists a patient taken off its team', () => {
    const teams = [{ team_id: 't1', name: 'EQUIPO A', service: 'Sala', sala: 'Sala 1' }];
    const rows = [
      { patient_id: 'p1', team_id: 't1', effective_at: T1 },
      { patient_id: 'p1', team_id: '', effective_at: T2 },
      { patient_id: 'p2', team_id: 't1', effective_at: T1 },
    ];
    const list = tagPatientsForTeamFilter([{ id: 'p1' }, { id: 'p2' }], { teams, assignments: rows, now });
    const out = applyElevatedPatientFilters(list, { teamId: '__unassigned__' }, { teams, assignments: rows, now });
    assert.deepEqual(out.map((p) => p.id), ['p1']);
  });
});
