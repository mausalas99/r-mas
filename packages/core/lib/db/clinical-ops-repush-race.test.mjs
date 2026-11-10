import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import { ensureClinicalUser, claimUsername, createTeam, joinTeam, removeTeamMember } from './clinical-access-db.mjs';
import { exportClinicalOpsSnapshot, mergeClinicalOpsSnapshot } from './clinical-ops-sync.mjs';

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
globalThis.localStorage ??= memoryStorage();
globalThis.sessionStorage ??= memoryStorage();
const { clinicalOpsHasRowsRoomLacks } = await import(
  '../../public/js/features/cloud-sync/cloud-clinical-ops-sala.mjs'
);

function openDb() {
  const db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

const memberCount = (db, teamId) =>
  db.prepare(`SELECT COUNT(*) AS n FROM team_membership WHERE team_id = ?`).get(teamId).n;

describe('clinicalOpsHasRowsRoomLacks — leave and rejoin records', () => {
  const users = [{ user_id: 'u1', username: 'r1doc' }];
  const base = { teams: [{ team_id: 't1' }], patient_team_assignment: [], clinical_users: users };

  it('reports a local leave record the room copy lacks', () => {
    const local = { ...base, team_membership_removals: [{ team_id: 't1', user_id: 'u1', removed_at: '2026-01-02T00:00:00.000Z' }] };
    assert.equal(clinicalOpsHasRowsRoomLacks(local, { ...base, team_membership_removals: [] }), true);
    assert.equal(clinicalOpsHasRowsRoomLacks(local, local), false);
  });

  it('reports a local rejoin record the room copy lacks', () => {
    const local = { ...base, team_membership_rejoins: [{ team_id: 't1', user_id: 'u1', joined_at: '2026-01-02T00:00:00.000Z' }] };
    assert.equal(clinicalOpsHasRowsRoomLacks(local, base), true);
    assert.equal(clinicalOpsHasRowsRoomLacks(local, local), false);
  });

  it('reports a local leave newer than the room copy of the same leave, not an older one', () => {
    const at = (removed_at) => ({ ...base, team_membership_removals: [{ team_id: 't1', user_id: 'u1', removed_at }] });
    const older = at('2026-01-01T00:00:00.000Z');
    const newer = at('2026-01-03T00:00:00.000Z');
    assert.equal(clinicalOpsHasRowsRoomLacks(newer, older), true);
    assert.equal(clinicalOpsHasRowsRoomLacks(older, newer), false);
  });

  it('matches one @username under two device user_ids (no re-push loop)', () => {
    const row = (user_id) => ({
      ...base,
      clinical_users: [{ user_id, username: 'R1Doc' }],
      team_membership_removals: [{ team_id: 't1', user_id, removed_at: '2026-01-02T00:00:00.000Z' }],
    });
    assert.equal(clinicalOpsHasRowsRoomLacks(row('id-on-a'), row('id-on-b')), false);
    assert.equal(clinicalOpsHasRowsRoomLacks(row('id-on-b'), row('id-on-a')), false);
  });
});

describe('lost team leave: stale whole-copy push from A lands after B left', () => {
  it('B re-pushes its leave, A drops the member, a later rejoin wins, and no side keeps re-pushing', (t) => {
    t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-10T10:00:00.000Z') });

    // Device A: team with two members.
    const a = openDb();
    const leaderA = ensureClinicalUser(a, { clientId: 'mac-a', rank: 'R4' });
    claimUsername(a, { userId: leaderA.userId, username: 'lider_a' });
    const team = createTeam(a, { name: 'Equipo A', service: 'Sala', onCallDayIndex: 1, createdBy: leaderA.userId, sala: 'Sala 1' });
    joinTeam(a, team.team_id, leaderA.userId, { subAreaFraction: 'A1' });
    const peerOnA = ensureClinicalUser(a, { clientId: 'mac-b-as-seen-by-a', rank: 'R1' });
    claimUsername(a, { userId: peerOnA.userId, username: 'r1doc' });
    joinTeam(a, team.team_id, peerOnA.userId, { subAreaFraction: 'A2' });

    // Device B: same @username under its own user_id, then pulls A's copy.
    const b = openDb();
    const selfB = ensureClinicalUser(b, { clientId: 'mac-b', rank: 'R1' });
    claimUsername(b, { userId: selfB.userId, username: 'r1doc' });
    mergeClinicalOpsSnapshot(b, exportClinicalOpsSnapshot(a), exportClinicalOpsSnapshot(b));
    assert.notEqual(selfB.userId, peerOnA.userId);
    assert.equal(memberCount(b, team.team_id), 2);

    // B leaves and pushes. A's stale push then replaces the room copy whole.
    t.mock.timers.tick(1000);
    removeTeamMember(b, team.team_id, selfB.userId);
    const staleRoom = exportClinicalOpsSnapshot(a);
    assert.equal(memberCount(a, team.team_id), 2);

    // B pulls A's stale copy: B keeps its leave, and must see the room lacks it.
    mergeClinicalOpsSnapshot(b, staleRoom, exportClinicalOpsSnapshot(b));
    assert.equal(memberCount(b, team.team_id), 1);
    assert.equal(clinicalOpsHasRowsRoomLacks(exportClinicalOpsSnapshot(b), staleRoom), true, 'B must re-push its leave');

    // A pulls B's re-push: the member goes.
    const roomFromB = exportClinicalOpsSnapshot(b);
    mergeClinicalOpsSnapshot(a, roomFromB, exportClinicalOpsSnapshot(a));
    assert.equal(memberCount(a, team.team_id), 1);

    // Settled: neither side sees a row the other lacks.
    assert.equal(clinicalOpsHasRowsRoomLacks(exportClinicalOpsSnapshot(a), roomFromB), false, 'A must not re-push');
    assert.equal(clinicalOpsHasRowsRoomLacks(exportClinicalOpsSnapshot(b), exportClinicalOpsSnapshot(a)), false, 'B must not re-push');

    // B joins again later: the newer rejoin wins on A too.
    t.mock.timers.tick(1000);
    const roomBeforeRejoin = exportClinicalOpsSnapshot(a);
    joinTeam(b, team.team_id, selfB.userId, { subAreaFraction: 'A2' });
    assert.equal(clinicalOpsHasRowsRoomLacks(exportClinicalOpsSnapshot(b), roomBeforeRejoin), true, 'B must re-push its rejoin');
    const roomAfterRejoin = exportClinicalOpsSnapshot(b);
    mergeClinicalOpsSnapshot(a, roomAfterRejoin, exportClinicalOpsSnapshot(a));
    assert.equal(memberCount(a, team.team_id), 2);
    assert.equal(clinicalOpsHasRowsRoomLacks(exportClinicalOpsSnapshot(a), roomAfterRejoin), false);
    assert.equal(clinicalOpsHasRowsRoomLacks(exportClinicalOpsSnapshot(b), exportClinicalOpsSnapshot(a)), false);
  });
});
