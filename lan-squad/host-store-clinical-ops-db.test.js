'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { test } = require('node:test');
const { createHostStore } = require('./host-store.js');

test('putRoomClinicalOps writes authoritative snapshot from SQLCipher when DB unlocked', async () => {
  const { createUnlockedDbManager } = await import('../lib/db/test-open-db.mjs');
  const { ensureClinicalUser, createTeam } = await import('../lib/db/clinical-access-db.mjs');
  const { exportClinicalOpsSnapshot } = await import('../lib/db/clinical-ops-sync.mjs');

  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-ops-db-'));
  const mgr = await createUnlockedDbManager(dbDir);
  const prevDbManager = globalThis.__rplusDbManager;
  globalThis.__rplusDbManager = mgr;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-ops-state-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });

  try {
    const { userId } = await mgr.withTransaction((db) => {
      const user = ensureClinicalUser(db, { clientId: 'host-ops-db', rank: 'R2' });
      createTeam(db, {
        name: 'Host DB Team',
        service: 'Sala',
        onCallDayIndex: 1,
        createdBy: user.userId,
      });
      return { userId: user.userId };
    });

    const room = store.createRoom('Ops DB');
    const baseSnap = await mgr.withTransaction((db) => exportClinicalOpsSnapshot(db));
    store.putRoomSyncBundle(room.id, {
      baseRevision: 0,
      baseEntityVersions: {},
      clinicalOps: baseSnap,
    });

    const baseRevision = store.getRoomSyncBundle(room.id).revision;
    const incoming = {
      ...baseSnap,
      exportedAt: '2099-06-01T12:00:00.000Z',
      teams: [
        ...(baseSnap.teams || []),
        {
          team_id: 'lan-peer-team',
          name: 'Peer LAN Team',
          service: 'Sala',
          on_call_day_index: 2,
          created_by: userId,
          created_at: '2099-06-01T12:00:00.000Z',
          rotation_active: 1,
        },
      ],
    };

    const out = await store.putRoomClinicalOps(room.id, {
      baseRevision,
      clientId: 'peer-test',
      snapshot: incoming,
    });

    const dbSnap = await mgr.withTransaction((db) => exportClinicalOpsSnapshot(db));
    const dbTeamIds = new Set((dbSnap.teams || []).map((t) => t.team_id));
    assert.ok(dbTeamIds.has('lan-peer-team'));

    assert.deepStrictEqual(
      (out.snapshot.teams || []).map((t) => t.team_id).sort(),
      (dbSnap.teams || []).map((t) => t.team_id).sort()
    );
    assert.ok(out.snapshot.exportedAt);

    const bundle = store.getRoomSyncBundle(room.id);
    assert.deepStrictEqual(
      (bundle.clinicalOps.teams || []).map((t) => t.team_id).sort(),
      (dbSnap.teams || []).map((t) => t.team_id).sort()
    );
    assert.ok(
      (bundle.clinicalOps.teams || []).some((t) => String(t.team_id) === 'lan-peer-team')
    );
  } finally {
    globalThis.__rplusDbManager = prevDbManager;
    mgr.lock();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(dbDir, { recursive: true, force: true });
  }
});

test('putRoomClinicalOps keeps JSON merge when host DB is locked', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-ops-locked-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  const prevDbManager = globalThis.__rplusDbManager;
  globalThis.__rplusDbManager = {
    isUnlocked: () => false,
    withTransaction() {
      throw new Error('should not call DB while locked');
    },
    getDb: () => null,
  };

  try {
    const room = store.createRoom('Ops locked');
    store.putRoomSyncBundle(room.id, {
      baseRevision: 0,
      baseEntityVersions: {},
      clinicalOps: {
        exportedAt: '2020-01-01T00:00:00',
        teams: [{ team_id: 'team-a', name: 'A', created_at: '2020-01-01T00:00:00' }],
        team_membership: [],
      },
    });
    const baseRevision = store.getRoomSyncBundle(room.id).revision;
    const out = await store.putRoomClinicalOps(room.id, {
      baseRevision,
      clientId: 'peer-json',
      snapshot: {
        exportedAt: '2025-01-01T00:00:00',
        teams: [{ team_id: 'team-b', name: 'B', created_at: '2025-01-01T00:00:00' }],
        team_membership: [],
      },
    });
    assert.strictEqual(out.snapshot.teams.length, 2);
    assert.ok(out.snapshot.teams.some((t) => t.team_id === 'team-a'));
    assert.ok(out.snapshot.teams.some((t) => t.team_id === 'team-b'));
  } finally {
    globalThis.__rplusDbManager = prevDbManager;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('getRoomSyncBundle unions bundle clinical_users when DB export is newer but smaller', async () => {
  const { createUnlockedDbManager } = await import('../lib/db/test-open-db.mjs');
  const { ensureClinicalUser, claimUsername } = await import('../lib/db/clinical-access-db.mjs');
  const { exportClinicalOpsSnapshot } = await import('../lib/db/clinical-ops-sync.mjs');

  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-ops-union-'));
  const mgr = await createUnlockedDbManager(dbDir);
  const prevDbManager = globalThis.__rplusDbManager;
  globalThis.__rplusDbManager = mgr;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-ops-union-state-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });

  try {
    const localUserId = await mgr.withTransaction(async (db) => {
      const user = ensureClinicalUser(db, { clientId: 'host-only', rank: 'R2', clinicalName: 'Host' });
      claimUsername(db, { userId: user.userId, username: 'host_only' });
      return user.userId;
    });
    const dbSnap = await mgr.withTransaction((db) => exportClinicalOpsSnapshot(db));
    assert.equal(dbSnap.clinical_users.length, 1);

    const remoteUserId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const room = store.createRoom('Union users');
    const state = store.getState();
    state.roomSyncBundles[room.id] = {
      revision: 2,
      entityVersions: { clinicalOps: 2 },
      committedAt: '2026-06-01T00:00:00',
      uploadedByClientId: 'peer',
      entities: {},
      agenda: [],
      todos: {},
      entries: [],
      manejo: null,
      clinicalOps: {
        exportedAt: '2026-06-01T08:00:00.000Z',
        clinical_users: [
          dbSnap.clinical_users[0],
          {
            user_id: remoteUserId,
            username: 'peer_two',
            rank: 'R1',
            clinical_name: 'Peer Two',
            sala: 'Sala 2',
            is_program_admin: 0,
          },
        ],
        teams: [],
        team_membership: [
          { team_id: 'team-x', user_id: localUserId, sub_area_fraction: null },
          { team_id: 'team-x', user_id: remoteUserId, sub_area_fraction: null },
        ],
      },
      audit_log: [],
    };

    const bundle = store.getRoomSyncBundle(room.id);
    assert.ok(
      (bundle.clinicalOps.clinical_users || []).some((u) => u.user_id === remoteUserId),
      'peer from bundle cache must survive DB refresh'
    );
    assert.ok(
      (bundle.clinicalOps.clinical_users || []).some((u) => u.user_id === localUserId),
      'host user must remain'
    );
    assert.ok(
      String(bundle.clinicalOps.exportedAt) >= String(dbSnap.exportedAt),
      'merged snapshot should adopt newer exportedAt'
    );
  } finally {
    globalThis.__rplusDbManager = prevDbManager;
    mgr.lock();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(dbDir, { recursive: true, force: true });
  }
});

test('persistRoomBundleClinicalOpsToHostDb folds sync-bundle clinicalOps into SQLCipher', async () => {
  const { createUnlockedDbManager } = await import('../lib/db/test-open-db.mjs');
  const { ensureClinicalUser, claimUsername } = await import('../lib/db/clinical-access-db.mjs');
  const { exportClinicalOpsSnapshot } = await import('../lib/db/clinical-ops-sync.mjs');

  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-ops-bundle-db-'));
  const mgr = await createUnlockedDbManager(dbDir);
  const prevDbManager = globalThis.__rplusDbManager;
  globalThis.__rplusDbManager = mgr;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-ops-bundle-db-state-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });

  try {
    const localSnap = await mgr.withTransaction(async (db) => {
      const user = ensureClinicalUser(db, { clientId: 'host-bundle', rank: 'R2' });
      claimUsername(db, { userId: user.userId, username: 'host_bundle' });
      return exportClinicalOpsSnapshot(db);
    });

    const remoteUserId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    const room = store.createRoom('Bundle DB');
    store.putRoomSyncBundle(room.id, {
      baseRevision: 0,
      baseEntityVersions: {},
      clinicalOps: {
        ...localSnap,
        exportedAt: '2099-06-01T12:00:00.000Z',
        clinical_users: [
          ...(localSnap.clinical_users || []),
          {
            user_id: remoteUserId,
            username: 'remote_bundle',
            rank: 'R1',
            clinical_name: 'Remote Bundle',
            sala: 'Sala 2',
            is_program_admin: 0,
          },
        ],
        team_membership: [
          ...(localSnap.team_membership || []),
          { team_id: 'team-bundle', user_id: remoteUserId, sub_area_fraction: 'A1' },
        ],
      },
    });

    await store.persistRoomBundleClinicalOpsToHostDb(room.id);
    const dbSnap = await mgr.withTransaction((db) => exportClinicalOpsSnapshot(db));
    assert.ok(
      dbSnap.clinical_users.some((u) => u.username === 'remote_bundle'),
      'peer user from bundle should land in host DB'
    );
    const bundle = store.getRoomSyncBundle(room.id);
    assert.ok(
      (bundle.clinicalOps.clinical_users || []).some((u) => u.username === 'remote_bundle')
    );
  } finally {
    globalThis.__rplusDbManager = prevDbManager;
    mgr.lock();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(dbDir, { recursive: true, force: true });
  }
});

test('getRoomSyncBundle refreshes stale clinicalOps cache from DB export', async () => {
  const { createUnlockedDbManager } = await import('../lib/db/test-open-db.mjs');
  const { ensureClinicalUser, createTeam } = await import('../lib/db/clinical-access-db.mjs');
  const { exportClinicalOpsSnapshot } = await import('../lib/db/clinical-ops-sync.mjs');

  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-ops-stale-'));
  const mgr = await createUnlockedDbManager(dbDir);
  const prevDbManager = globalThis.__rplusDbManager;
  globalThis.__rplusDbManager = mgr;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'host-ops-stale-state-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });

  try {
    await mgr.withTransaction((db) => {
      const user = ensureClinicalUser(db, { clientId: 'stale-cache', rank: 'R2' });
      createTeam(db, {
        name: 'Fresh DB Team',
        service: 'Sala',
        onCallDayIndex: 3,
        createdBy: user.userId,
      });
    });

    const room = store.createRoom('Stale cache');
    const state = store.getState();
    state.roomSyncBundles[room.id] = {
      revision: 1,
      entityVersions: { clinicalOps: 1 },
      committedAt: '2020-01-01T00:00:00',
      uploadedByClientId: '',
      entities: {},
      agenda: [],
      todos: {},
      entries: [],
      manejo: null,
      clinicalOps: {
        exportedAt: '2020-01-01T00:00:00',
        teams: [],
        team_membership: [],
      },
      audit_log: [],
    };

    const bundle = store.getRoomSyncBundle(room.id);
    const dbSnap = await mgr.withTransaction((db) => exportClinicalOpsSnapshot(db));
    assert.notEqual(bundle.clinicalOps.exportedAt, '2020-01-01T00:00:00');
    assert.ok((bundle.clinicalOps.teams || []).length >= 1);
    assert.ok((dbSnap.teams || []).length >= 1);
    assert.ok(
      (bundle.clinicalOps.teams || []).some((t) =>
        (dbSnap.teams || []).some((d) => d.team_id === t.team_id)
      )
    );
  } finally {
    globalThis.__rplusDbManager = prevDbManager;
    mgr.lock();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(dbDir, { recursive: true, force: true });
  }
});
