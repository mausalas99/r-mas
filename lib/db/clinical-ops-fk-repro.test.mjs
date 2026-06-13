import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import { ensureClinicalUser, claimUsername } from './clinical-access-db.mjs';
import { exportClinicalOpsSnapshot, mergeClinicalOpsSnapshot } from './clinical-ops-sync.mjs';

function openDb() {
  const db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

describe('clinical-ops FK guards', () => {
  it('merge inserts patient_team_assignment stub row when chart not on peer yet', () => {
    const db = openDb();
    try {
      const peer = ensureClinicalUser(db, { clientId: 'peer', rank: 'R1' });
      claimUsername(db, { userId: peer.userId, username: 'peer_user' });
      const local = exportClinicalOpsSnapshot(db);
      const incoming = {
        exportedAt: new Date().toISOString(),
        clinical_users: [
          {
            user_id: 'u-host-1',
            username: 'host1',
            rank: 'R4',
            clinical_name: 'Host One',
          },
        ],
        teams: [
          {
            team_id: 't1',
            name: 'Equipo A',
            service: 'Sala',
            on_call_day_index: 0,
            created_by: 'u-host-1',
            created_at: '2026-06-01T00:00:00.000Z',
          },
        ],
        team_membership: [{ team_id: 't1', user_id: 'u-host-1' }],
        patient_team_assignment: [
          {
            patient_id: 'missing-patient',
            team_id: 't1',
            effective_at: '2026-06-01',
            created_at: '2026-06-01T00:00:00.000Z',
          },
        ],
        team_guardia_today: [],
        active_guardias: [],
      };
      const out = mergeClinicalOpsSnapshot(db, incoming, local);
      assert.equal(out.merged, true);
      assert.equal(out.stats.usersInserted, 1);
      const team = db.prepare(`SELECT name FROM teams WHERE team_id = ?`).get('t1');
      assert.equal(team.name, 'Equipo A');
      const assign = db
        .prepare(`SELECT team_id FROM patient_team_assignment WHERE patient_id = ?`)
        .get('missing-patient');
      assert.equal(assign?.team_id, 't1');
      const patientRow = db.prepare(`SELECT id FROM patients WHERE id = ?`).get('missing-patient');
      assert.equal(patientRow?.id, 'missing-patient');
    } finally {
      db.close();
    }
  });
});
