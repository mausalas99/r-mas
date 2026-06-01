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

  it('pickNewerClinicalOpsSnapshot chooses latest exportedAt', () => {
    const older = { clinicalOps: { exportedAt: '2020-01-01T00:00:00', version: 1 } };
    const newer = { clinicalOps: { exportedAt: '2025-01-01T00:00:00', version: 1 } };
    const picked = pickNewerClinicalOpsSnapshot([older, newer, {}]);
    assert.equal(picked.exportedAt, '2025-01-01T00:00:00');
  });
});
