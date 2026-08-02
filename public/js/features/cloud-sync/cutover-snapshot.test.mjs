import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCutoverSnapshot,
  saveCutoverSnapshot,
  loadCutoverSnapshot,
  clearCutoverSnapshot,
  SNAPSHOT_STORAGE_KEY,
} from './cutover-snapshot.mjs';
import { filterSnapshotPatients, claimPatientsToTeam } from './cutover-claim.mjs';
import { getCutoverFlag, setCutoverFlag } from './cutover-flags.mjs';
import { ensure79CutoverSnapshotAndWipe } from './cutover-wipe.mjs';

function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(String(k), String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  installLocalStorage();
  globalThis.window = { __RPC_APP_VERSION__: '7.9.0' };
});

describe('buildCutoverSnapshot', () => {
  it('maps users teams membership and patient ownership', () => {
    const snap = buildCutoverSnapshot({
      ops: {
        clinical_users: [
          {
            user_id: 'u1',
            username: 'drmendoza',
            clinical_name: 'Dr. Mendoza',
            rank: 'R1',
            sala: 'Sala 1',
          },
          {
            user_id: 'u2',
            username: 'r2garcia',
            clinical_name: 'R2 Garcia',
            rank: 'R2',
            sala: 'Sala 1',
          },
        ],
        teams: [{ team_id: 't1', name: 'Equipo A', sala: 'Sala 1' }],
        team_membership: [
          { team_id: 't1', user_id: 'u1' },
          { team_id: 't1', user_id: 'u2' },
        ],
        patient_team_assignment: [
          { patient_id: 'p1', team_id: 't1', effective_at: '2026-08-01T00:00:00Z' },
        ],
      },
      patients: [{ id: 'p1', nombre: 'Juan', registro: '123', sala: 'Sala 1' }],
    });
    assert.equal(snap.users.length, 2);
    assert.equal(snap.teams[0].memberUsernames.includes('drmendoza'), true);
    assert.equal(snap.patients[0].teamId, 't1');
    assert.equal(snap.patients[0].ownerUsername, 'drmendoza');
  });
});

describe('cutover snapshot storage', () => {
  it('round-trips in localStorage', () => {
    clearCutoverSnapshot();
    const snap = { version: 1, createdAt: 'x', users: [], teams: [], patients: [] };
    saveCutoverSnapshot(snap);
    assert.equal(loadCutoverSnapshot()?.version, 1);
    assert.ok(localStorage.getItem(SNAPSHOT_STORAGE_KEY));
    clearCutoverSnapshot();
    assert.equal(loadCutoverSnapshot(), null);
  });
});

describe('filterSnapshotPatients', () => {
  it('includes team patients for username membership', () => {
    const snapshot = {
      teams: [{ teamId: 't1', memberUsernames: ['drmendoza'] }],
      patients: [
        { id: 'p1', teamId: 't1', ownerUsername: 'r2garcia' },
        { id: 'p2', teamId: 't2', ownerUsername: 'other' },
      ],
    };
    const list = filterSnapshotPatients(snapshot, { username: 'drmendoza' });
    assert.deepEqual(
      list.map((p) => p.id),
      ['p1']
    );
  });
});

describe('claimPatientsToTeam', () => {
  it('rewrites assignment for selected ids via assigner', async () => {
    const calls = [];
    const out = await claimPatientsToTeam(['p1', 'p2', ''], 'team-x', {
      assign: async (pid, tid) => {
        calls.push([pid, tid]);
        return true;
      },
    });
    assert.equal(out.claimed, 2);
    assert.deepEqual(calls, [
      ['p1', 'team-x'],
      ['p2', 'team-x'],
    ]);
  });
});

describe('cutover flags', () => {
  it('persists pending and done', () => {
    setCutoverFlag('pending');
    assert.equal(getCutoverFlag(), 'pending');
    setCutoverFlag('done');
    assert.equal(getCutoverFlag(), 'done');
  });
});

describe('ensure79CutoverSnapshotAndWipe', () => {
  it('is crash-safe: skips re-wipe when snapshot + pending', async () => {
    const snap = { version: 1, createdAt: 'x', users: [], teams: [], patients: [] };
    saveCutoverSnapshot(snap);
    setCutoverFlag('pending');
    let wipeCalls = 0;
    const out = await ensure79CutoverSnapshotAndWipe({
      api: {
        dbClinicalOpsExport: async () => {
          throw new Error('should not export');
        },
        dbClinical79CutoverWipe: async () => {
          wipeCalls += 1;
          return { ok: true };
        },
      },
    });
    assert.equal(out.ran, false);
    assert.equal(out.reason, 'already_pending');
    assert.equal(wipeCalls, 0);
  });

  it('exports snapshot then wipes once', async () => {
    let wipeCalls = 0;
    const out = await ensure79CutoverSnapshotAndWipe({
      getPatients: () => [{ id: 'p1', nombre: 'A', registro: '1' }],
      api: {
        dbClinicalOpsExport: async () => ({
          ok: true,
          snapshot: {
            clinical_users: [
              {
                user_id: 'u1',
                username: 'drmendoza',
                clinical_name: 'M',
                rank: 'R1',
                sala: 'Sala 1',
              },
            ],
            teams: [],
            team_membership: [],
            patient_team_assignment: [],
          },
        }),
        dbClinical79CutoverWipe: async () => {
          wipeCalls += 1;
          return { ok: true, count: 1 };
        },
      },
    });
    assert.equal(out.ran, true);
    assert.equal(wipeCalls, 1);
    assert.equal(getCutoverFlag(), 'pending');
    assert.equal(loadCutoverSnapshot()?.users[0]?.username, 'drmendoza');
  });
});
