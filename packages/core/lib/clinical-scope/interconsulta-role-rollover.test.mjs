import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from '../db/schema.mjs';
import { redistributePostCallPatients } from './interconsulta-role-rollover.mjs';

const NOW = '2026-08-25T12:00:00.000Z';

function openDb() {
  const db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

function makeTeam(db, teamId) {
  db.prepare(
    `INSERT INTO teams (team_id, name, service, on_call_day_index) VALUES (?, ?, 'Interconsultas', 0)`
  ).run(teamId, teamId);
}

function makePatient(db, patientId, { teamId, status = 'Pending' } = {}) {
  db.prepare(`INSERT INTO patients (id, interconsult_status) VALUES (?, ?)`).run(patientId, status);
  if (teamId) {
    db.prepare(
      `INSERT INTO patient_team_assignment (patient_id, team_id, effective_at) VALUES (?, ?, ?)`
    ).run(patientId, teamId, NOW);
  }
}

describe('redistributePostCallPatients', () => {
  it('splits patients round-robin across remaining teams, skipping resolved ones', () => {
    const db = openDb();
    const postCall = 'postguardia';
    const remaining = ['A', 'B', 'C'];
    makeTeam(db, postCall);
    for (const t of remaining) makeTeam(db, t);

    for (let i = 1; i <= 7; i++) {
      makePatient(db, `p${i}`, { teamId: postCall });
    }
    // A resolved patient on the same team must not move.
    makePatient(db, 'p-resolved', { teamId: postCall, status: 'Resolved' });

    const summary = redistributePostCallPatients(db, postCall, remaining, NOW);

    assert.equal(summary.movedCount, 7);
    assert.deepEqual(Object.keys(summary.byTeam).sort(), remaining.slice().sort());
    assert.equal(summary.byTeam.A.length, 3);
    assert.equal(summary.byTeam.B.length, 2);
    assert.equal(summary.byTeam.C.length, 2);
    for (const list of Object.values(summary.byTeam)) {
      assert.ok(list.every((id) => id !== 'p-resolved'));
    }

    const allMoved = Object.values(summary.byTeam).flat().sort();
    assert.deepEqual(allMoved, ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].sort());
  });

  it('returns an empty summary when there are no remaining teams', () => {
    const db = openDb();
    makeTeam(db, 'postguardia');
    makePatient(db, 'p1', { teamId: 'postguardia' });

    const summary = redistributePostCallPatients(db, 'postguardia', [], NOW);
    assert.deepEqual(summary, { movedCount: 0, byTeam: {} });
  });
});
