'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { hashTeamCode } = require('./team-code.js');
const { readHostState, writeHostState } = createRequire(__filename)(
  '../lib/db/lan-host-persistence.mjs'
);
const { agendaEntityKey, todoEntityKey, historiaClinicaEntityKey } = require('./entity-keys.js');
const {
  writeHistoriaClinicaArchive,
  resolveStorageRoot,
} = require('../lib/historia-clinica/storage.js');
const { createWriteQueue } = require('./write-queue.js');
const { createCommitBarrier } = require('./persistence/commit-barrier.js');
const {
  isShardedLayout,
  loadShardedState,
  loadShardedStateSync,
  initEmptyShardedState,
  initEmptyShardedStateSync,
  migrateMonolithToShards,
  commitDirtyShards,
  repairShardsOnBoot,
  migrateLabSidecarsOnBoot,
  repairLabSidecarsOnBoot,
  entryPatientId,
} = require('./persistence/sharded-host-persistence.js');
const {
  emptySidecar,
  upsertLabSidecar,
  assembleLabHistory,
  readLabSidecarSync,
  labMetaFromSidecar,
  sidecarFromLabHistory,
} = require('./persistence/lab-sidecar.js');
const {
  dbHasLanHostV15,
  sqlMetaNeedsImport,
  loadCacheFromSql,
  loadLabSidecarsIntoCache,
  importFromJsonShards,
  backupJsonShardsForSqlImport,
  commitDirtyShardsSql,
  persistFullCacheSql,
} = require('./persistence/sqlite-host-repositories.js');
const { createHostStateCache } = require('./host-state-cache.js');
const { readJson, writeJsonAtomic } = require('./atomic-json.js');
const { migrateHostStateIfNeeded } = require('./migrate-host-state.js');
const { mergeBundlePut } = require('./bundle-merge.js');
const { mergeClinicalOpsSnapshotsData } = require('../lib/db/clinical-ops-bundle-merge.cjs');
const {
  mergeClinicalOpsSnapshot,
  exportClinicalOpsSnapshot,
} = createRequire(__filename)('../lib/db/clinical-ops-sync.mjs');
const { appendAudit } = require('./audit-log.js');
const { getLanDbManager } = require('../lib/db/lan-db-bridge.cjs');

function getGlobalClinicalDbManager() {
  const mgr = getLanDbManager();
  return mgr && typeof mgr.isUnlocked === 'function' && mgr.isUnlocked() ? mgr : null;
}

function clinicalOpsCacheStale(cached, exported) {
  if (!exported || typeof exported !== 'object') return false;
  if (!cached || typeof cached !== 'object') return true;
  const cacheAt = cached.exportedAt ? String(cached.exportedAt) : '';
  const dbAt = exported.exportedAt ? String(exported.exportedAt) : '';
  return dbAt > cacheAt;
}

function refreshBundleClinicalOpsCacheIfStale(bundle) {
  const mgr = getGlobalClinicalDbManager();
  if (!mgr || !bundle) return;
  const db = mgr.getDb();
  if (!db) return;
  const exported = exportClinicalOpsSnapshot(db);
  if (!clinicalOpsCacheStale(bundle.clinicalOps, exported)) return;
  const cached =
    bundle.clinicalOps && typeof bundle.clinicalOps === 'object' ? bundle.clinicalOps : null;
  if (!cached) {
    bundle.clinicalOps = exported;
    return;
  }
  // DB export can be newer yet smaller when peers merged via sync-bundle only; union, never regress.
  bundle.clinicalOps = mergeClinicalOpsSnapshotsData(cached, exported);
}

async function mergeBundleClinicalOpsIntoHostDb(snapshot, { roomId, revision } = {}) {
  const mgr = getGlobalClinicalDbManager();
  if (!mgr || !snapshot || typeof snapshot !== 'object') return null;
  let exported = null;
  await mgr.withTransaction((db, { audit }) => {
    mergeClinicalOpsSnapshot(db, snapshot);
    exported = exportClinicalOpsSnapshot(db);
    audit('host', 'lan.clinical_ops.put', {
      roomId: roomId || null,
      revision: revision != null ? revision : null,
      exportedAt: exported.exportedAt || null,
    });
  });
  return exported;
}

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

function atomicWriteJson(filePath, obj) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 0), 'utf8');
  fs.renameSync(tmp, filePath);
}

function readStateSync(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') throw new Error('bad shape');
    return o;
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function defaultState(teamCodeHash) {
  return {
    version: 2,
    teamCodeHash,
    patients: [],
    rooms: [],
    roomSyncBundles: {},
  };
}

function assertDbUnlocked(dbManager) {
  if (!dbManager.isUnlocked()) {
    const err = new Error('Database locked');
    err.code = 'DB_LOCKED';
    throw err;
  }
}

function normalizeLoadedState(s) {
  let state = migrateHostStateIfNeeded(s);
  state.patients = Array.isArray(state.patients) ? state.patients : [];
  state.rooms = Array.isArray(state.rooms) ? state.rooms : [];
  state.roomSyncBundles =
    state.roomSyncBundles && typeof state.roomSyncBundles === 'object'
      ? state.roomSyncBundles
      : {};
  for (const rid of Object.keys(state.roomSyncBundles)) {
    const b = state.roomSyncBundles[rid];
    if (b && typeof b === 'object' && (!b.entities || typeof b.entities !== 'object')) {
      b.entities = {};
    }
  }
  delete state.calendarEvents;
  return state;
}

function alignTeamCodeHash(s, teamCodeHash) {
  if (s.teamCodeHash === teamCodeHash) return false;
  s.teamCodeHash = teamCodeHash;
  return true;
}

function persistAlignedTeamCodeHash({
  aligned,
  migrated,
  useDb,
  persistCacheToDb,
  flushCacheToDiskFn,
  resolvePersistModeFn,
  filePath,
  stateDir,
  queue,
  markDirtyFn,
}) {
  if (!aligned) return;
  if (useDb()) {
    if (resolvePersistModeFn && resolvePersistModeFn() === 'sql-v3') {
      markDirtyFn(null);
      queue.enqueue(() => flushCacheToDiskFn()).catch(() => {});
      return;
    }
    queue.enqueue(() => persistCacheToDb()).catch(() => {});
    return;
  }
  if (isShardedLayout(stateDir)) {
    markDirtyFn(null);
    const existing = readStateSync(path.join(stateDir, 'meta.json')) || {};
    queue.enqueue(() =>
      writeJsonAtomic(path.join(stateDir, 'meta.json'), {
        ...existing,
        version: 2,
        teamCodeHash: migrated.teamCodeHash,
        patients: migrated.patients,
        rooms: migrated.rooms,
        roomRevisions: existing.roomRevisions || {},
      })
    ).catch(() => {});
    return;
  }
  // Sync write so a prior store instance's queued snapshot cannot clobber the new hash.
  try {
    atomicWriteJson(filePath, migrated);
  } catch (_e) {}
  queue.enqueue(() => writeJsonAtomic(filePath, migrated)).catch(() => {});
}

/** Env rollback: legacy | json | sql | sql-monolith (ward IT / support). */
function readPersistModeOverride() {
  const raw = String(process.env.R_PLUS_LAN_PERSIST_MODE || '').trim().toLowerCase();
  if (!raw || raw === 'auto') return null;
  const map = {
    legacy: 'json-monolith',
    monolith: 'json-monolith',
    json: 'json-sharded',
    sharded: 'json-sharded',
    sql: 'sql-v3',
    'sql-v3': 'sql-v3',
    'sql-monolith': 'sql-monolith',
  };
  return map[raw] || null;
}

function createHostStore({
  filePath,
  hostStateDir = null,
  teamCodePlain,
  dbManager = null,
  getClientId = () => 'host',
}) {
  const teamCodeHash = hashTeamCode(teamCodePlain);
  const stateDir = hostStateDir || path.join(path.dirname(filePath), 'lan-host');
  const cache = createHostStateCache();
  const queue = createWriteQueue();
  const commitBarrier = createCommitBarrier({ coalesceMs: 150 });
  let lastCommitAudit = null;
  let initPromise = null;
  let dirtyMeta = false;
  const dirtyRooms = new Set();
  const dirtyLabSidecars = new Set();
  const labSidecarCache = new Map();
  let repairedRoomCount = 0;
  const useDb = () => dbManager != null;

  function resolvePersistMode() {
    const override = readPersistModeOverride();
    if (override) return override;
    if (useDb() && dbManager.isUnlocked()) {
      const db = dbManager.getDb();
      if (db && dbHasLanHostV15(db)) return 'sql-v3';
      return 'sql-monolith';
    }
    if (isShardedLayout(stateDir)) return 'json-sharded';
    return 'json-monolith';
  }

  function markDirty(roomId) {
    if (roomId) dirtyRooms.add(String(roomId));
    else dirtyMeta = true;
  }

  function labSidecarKey(roomId, patientId) {
    return `${String(roomId)}:${String(patientId)}`;
  }

  function markDirtyLab(roomId, patientId) {
    dirtyLabSidecars.add(labSidecarKey(roomId, patientId));
  }

  function getLabSidecar(roomId, patientId) {
    const key = labSidecarKey(roomId, patientId);
    if (labSidecarCache.has(key)) return labSidecarCache.get(key);
    const sc = readLabSidecarSync(stateDir, roomId, patientId) || emptySidecar();
    labSidecarCache.set(key, sc);
    return sc;
  }

  function setLabSidecar(roomId, patientId, sidecar) {
    const key = labSidecarKey(roomId, patientId);
    labSidecarCache.set(key, sidecar);
    markDirtyLab(roomId, patientId);
    return sidecar;
  }

  function stripEntryLabsToSidecar(roomId, entry) {
    const patientId = entryPatientId(entry);
    if (!patientId) return false;
    const labHistory = Array.isArray(entry.labHistory) ? entry.labHistory : [];
    if (!labHistory.length) return false;
    const sidecar = sidecarFromLabHistory(labHistory);
    setLabSidecar(roomId, patientId, sidecar);
    entry.labMeta = labMetaFromSidecar(
      sidecar,
      entry.labMeta && entry.labMeta.labHistoryVersion
    );
    delete entry.labHistory;
    return true;
  }

  function stripRoomBundleLabsToSidecars(roomId, bundle) {
    if (!bundle || !Array.isArray(bundle.entries)) return false;
    let changed = false;
    for (const entry of bundle.entries) {
      if (stripEntryLabsToSidecar(roomId, entry)) changed = true;
    }
    return changed;
  }

  async function persistCacheToDb() {
    assertDbUnlocked(dbManager);
    const snapshot = cache.get();
    const mode = resolvePersistMode();
    await dbManager.withTransaction((db, { audit }) => {
      const t0 = Date.now();
      if (mode === 'sql-v3') {
        persistFullCacheSql(db, snapshot, labSidecarCache);
      } else {
        writeHostState(db, snapshot);
      }
      const commitMs = Date.now() - t0;
      audit(getClientId(), 'lan.host.commit', {
        action: 'host.commit',
        byteLength: JSON.stringify(snapshot).length,
        commitMs,
        persistGeneration: mode,
      });
    });
  }

  async function flushCacheToDisk() {
    if (!cache.isLoaded()) return;
    const t0 = Date.now();
    const snapshot = cache.get();
    const mode = resolvePersistMode();
    if (mode === 'sql-v3') {
      const metaDirty = dirtyMeta;
      const roomsDirty = new Set(dirtyRooms);
      const labsDirty = new Set(dirtyLabSidecars);
      const result = await dbManager.withTransaction((db, { audit }) => {
        const innerT0 = Date.now();
        const out = commitDirtyShardsSql(db, {
          cache,
          dirtyMeta: metaDirty,
          dirtyRooms: roomsDirty,
          dirtyLabSidecars: labsDirty,
          labSidecarPayloads: labSidecarCache,
        });
        const commitMs = Date.now() - innerT0;
        audit(getClientId(), 'lan.host.commit', {
          action: 'host.commit',
          byteLength: out.byteLength,
          commitMs,
          shards: out.shards,
          persistGeneration: 'sql-v3',
        });
        return out;
      });
      dirtyMeta = false;
      dirtyRooms.clear();
      dirtyLabSidecars.clear();
      lastCommitAudit = {
        commitMs: Date.now() - t0,
        byteLength: result.byteLength,
        shards: result.shards,
        coalesced: true,
        persistGeneration: 'sql-v3',
      };
      return;
    }
    if (mode === 'sql-monolith') {
      await persistCacheToDb();
      lastCommitAudit = {
        commitMs: Date.now() - t0,
        byteLength: JSON.stringify(snapshot).length,
        shards: ['monolith'],
        coalesced: true,
        persistGeneration: 'sql-monolith',
      };
      return;
    }
    if (isShardedLayout(stateDir)) {
      const { shards, byteLength } = await commitDirtyShards({
        hostStateDir: stateDir,
        cache,
        dirtyMeta,
        dirtyRooms,
        dirtyLabSidecars,
        labSidecarPayloads: labSidecarCache,
      });
      dirtyMeta = false;
      dirtyRooms.clear();
      dirtyLabSidecars.clear();
      lastCommitAudit = {
        commitMs: Date.now() - t0,
        byteLength,
        shards,
        coalesced: true,
        persistGeneration: 'json-sharded',
      };
      return;
    }
    await writeJsonAtomic(filePath, snapshot);
    lastCommitAudit = {
      commitMs: Date.now() - t0,
      byteLength: JSON.stringify(snapshot).length,
      shards: ['monolith'],
      coalesced: true,
      persistGeneration: 'json-monolith',
    };
  }

  function schedulePersist() {
    return commitBarrier.scheduleFlush(() => queue.enqueue(() => flushCacheToDisk()));
  }

  async function awaitDurableCommit() {
    await schedulePersist();
  }

  async function flushCacheNow({ serialized } = {}) {
    const run = serialized
      ? () => flushCacheToDisk()
      : () => queue.enqueue(() => flushCacheToDisk());
    await commitBarrier.flushNow(run);
  }

  function getLastCommitAudit() {
    return lastCommitAudit;
  }

  async function persistSnapshot(snapshot) {
    if (useDb()) {
      cache.replace(snapshot);
      const mode = resolvePersistMode();
      if (mode === 'sql-v3') {
        markDirty(null);
        for (const rid of Object.keys(snapshot.roomSyncBundles || {})) markDirty(rid);
        await flushCacheToDisk();
        return;
      }
      await persistCacheToDb();
      return;
    }
    if (isShardedLayout(stateDir)) {
      cache.replace(snapshot);
      markDirty(null);
      for (const rid of Object.keys(snapshot.roomSyncBundles || {})) markDirty(rid);
      await commitDirtyShards({
        hostStateDir: stateDir,
        cache,
        dirtyMeta: true,
        dirtyRooms: new Set(Object.keys(snapshot.roomSyncBundles || {})),
        dirtyLabSidecars,
        labSidecarPayloads: labSidecarCache,
      });
      dirtyMeta = false;
      dirtyRooms.clear();
      dirtyLabSidecars.clear();
      return;
    }
    await writeJsonAtomic(filePath, snapshot);
  }

  async function loadJsonHostState() {
    if (isShardedLayout(stateDir)) {
      let s = await loadShardedState(stateDir, teamCodeHash);
      if (!s) {
        s = await initEmptyShardedState(stateDir, teamCodeHash);
      }
      cache.replace(s);
      const { repairedRooms } = await repairShardsOnBoot(stateDir, cache);
      repairedRoomCount = repairedRooms.length;
      if (repairedRooms.length) {
        s = await loadShardedState(stateDir, teamCodeHash);
        cache.replace(s);
      }
      await migrateLabSidecarsOnBoot(stateDir, cache);
      const { repaired: labRepairs } = await repairLabSidecarsOnBoot(stateDir, cache, labSidecarCache);
      repairedRoomCount += labRepairs.length;
      if (labRepairs.length) {
        s = await loadShardedState(stateDir, teamCodeHash);
        cache.replace(s);
      }
      return s;
    }
    if (fs.existsSync(filePath)) {
      await migrateMonolithToShards({
        monolithPath: filePath,
        hostStateDir: stateDir,
        teamCodeHash,
      });
      const s = await loadShardedState(stateDir, teamCodeHash);
      cache.replace(s);
      return s;
    }
    const s = await initEmptyShardedState(stateDir, teamCodeHash);
    cache.replace(s);
    return s;
  }

  async function loadSqlV3HostState() {
    assertDbUnlocked(dbManager);
    if (isShardedLayout(stateDir) && sqlMetaNeedsImport(dbManager.getDb())) {
      await backupJsonShardsForSqlImport(stateDir);
      await dbManager.withTransaction((db) =>
        importFromJsonShards(db, stateDir, teamCodeHash)
      );
    }
    let s = await dbManager.withTransaction((db) => loadCacheFromSql(db, teamCodeHash));
    if (!s) {
      s = defaultState(teamCodeHash);
      await persistSnapshot(s);
      cache.replace(s);
      return s;
    }
    await dbManager.withTransaction((db) => {
      loadLabSidecarsIntoCache(db, labSidecarCache);
    });
    return s;
  }

  async function loadFromDisk() {
    let s;
    if (useDb()) {
      assertDbUnlocked(dbManager);
      if (resolvePersistMode() === 'sql-v3') {
        s = await loadSqlV3HostState();
        const aligned = alignTeamCodeHash(s, teamCodeHash);
        s = normalizeLoadedState(s);
        if (aligned) {
          markDirty(null);
          await flushCacheNow({ serialized: true });
        }
        cache.replace(s);
        return s;
      }
      s = await dbManager.withTransaction((db) => readHostState(db));
    } else {
      s = await loadJsonHostState();
      const aligned = alignTeamCodeHash(s, teamCodeHash);
      if (aligned) {
        markDirty(null);
        await flushCacheNow({ serialized: true });
      }
      return s;
    }
    if (!s) {
      s = defaultState(teamCodeHash);
      await persistSnapshot(s);
      cache.replace(s);
      return s;
    }
    const aligned = alignTeamCodeHash(s, teamCodeHash);
    const prevVersion = Number(s.version);
    s = normalizeLoadedState(s);
    if (Number(s.version) !== 2) {
      s.version = 2;
      await persistSnapshot(s);
    } else if ((aligned || prevVersion !== 2) && useDb()) {
      await persistSnapshot(s);
    } else if (aligned) {
      await persistSnapshot(s);
    }
    cache.replace(s);
    return s;
  }

  function ensureLoadedSync() {
    if (cache.isLoaded()) return cache.get();
    let s;
    if (useDb()) {
      assertDbUnlocked(dbManager);
      if (resolvePersistMode() === 'sql-v3') {
        if (isShardedLayout(stateDir) && sqlMetaNeedsImport(dbManager.getDb())) {
          void loadFromDisk();
          if (cache.isLoaded()) return cache.get();
        }
        s = loadCacheFromSql(dbManager.getDb(), teamCodeHash);
        if (!s) {
          const fresh = defaultState(teamCodeHash);
          cache.replace(fresh);
          markDirty(null);
          queue.enqueue(() => flushCacheToDisk()).catch(() => {});
          return fresh;
        }
        loadLabSidecarsIntoCache(dbManager.getDb(), labSidecarCache);
      } else {
        s = readHostState(dbManager.getDb());
      }
    } else if (isShardedLayout(stateDir)) {
      s = loadShardedStateSync(stateDir, teamCodeHash);
    } else if (fs.existsSync(filePath)) {
      s = readStateSync(filePath);
    } else {
      s = null;
    }
    if (!s) {
      const fresh = defaultState(teamCodeHash);
      if (useDb()) {
        cache.replace(fresh);
        queue.enqueue(() => persistCacheToDb()).catch(() => {});
        return fresh;
      }
      if (isShardedLayout(stateDir) || !fs.existsSync(filePath)) {
        initEmptyShardedStateSync(stateDir, teamCodeHash);
      } else {
        atomicWriteJson(filePath, fresh);
      }
      cache.replace(fresh);
      return fresh;
    }
    const aligned = alignTeamCodeHash(s, teamCodeHash);
    const prevVersion = Number(s.version);
    const migrated = normalizeLoadedState(s);
    cache.replace(migrated);
    if (aligned) {
      if (!useDb() && isShardedLayout(stateDir)) {
        markDirty(null);
        queue.enqueue(() => flushCacheToDisk()).catch(() => {});
      } else {
        persistAlignedTeamCodeHash({
          aligned,
          migrated,
          useDb,
          persistCacheToDb,
          flushCacheToDiskFn: flushCacheToDisk,
          resolvePersistModeFn: resolvePersistMode,
          filePath,
          stateDir,
          queue,
          markDirtyFn: markDirty,
        });
      }
    } else if (Number(migrated.version) === 2 && prevVersion !== 2) {
      if (useDb()) {
        if (resolvePersistMode() === 'sql-v3') {
          markDirty(null);
          queue.enqueue(() => flushCacheToDisk()).catch(() => {});
        } else {
          queue.enqueue(() => persistCacheToDb()).catch(() => {});
        }
      } else {
        queue.enqueue(() => writeJsonAtomic(filePath, migrated)).catch(() => {});
      }
    }
    return migrated;
  }

  function ready() {
    if (!initPromise) initPromise = loadFromDisk().catch((e) => {
      initPromise = null;
      throw e;
    });
    return initPromise;
  }

  function flush() {
    return flushCacheNow();
  }

  function getState() {
    return ensureLoadedSync();
  }

  function upsertPatient(patient, expectedVersion) {
    const state = ensureLoadedSync();
    const idx = state.patients.findIndex((p) => p.id === patient.id);
    const t = nowIso();
    if (idx === -1) {
      const p = { ...patient, version: 1, updatedAt: t, audit_log: [] };
      appendAudit(
        { at: t, clientId: 'host', action: 'patient.create', detail: { id: p.id } },
        p.audit_log
      );
      state.patients.push(p);
      markDirty(null);
      void schedulePersist();
      return p;
    }
    const cur = state.patients[idx];
    if (expectedVersion == null) {
      const err = new Error('expectedVersion required');
      err.code = 'CONFLICT';
      err.serverPatient = cur;
      throw err;
    }
    if (Number(cur.version) !== Number(expectedVersion)) {
      const err = new Error('conflict');
      err.code = 'CONFLICT';
      err.serverPatient = cur;
      throw err;
    }
    if (!Array.isArray(cur.audit_log)) cur.audit_log = [];
    const next = { ...cur, ...patient, version: Number(cur.version || 1) + 1, updatedAt: t };
    appendAudit(
      { at: t, clientId: 'host', action: 'patient.update', detail: { id: next.id } },
      next.audit_log
    );
    state.patients[idx] = next;
    markDirty(null);
    void schedulePersist();
    return next;
  }

  function listRooms() {
    return ensureLoadedSync().rooms.slice();
  }

  function createRoom(displayName) {
    const state = ensureLoadedSync();
    const t = nowIso();
    const r = {
      id: newId('room'),
      displayName: String(displayName || 'Sala'),
      createdAt: t,
      version: 1,
      audit_log: [],
    };
    appendAudit(
      { at: t, clientId: 'host', action: 'room.create', detail: { id: r.id } },
      r.audit_log
    );
    state.rooms.push(r);
    markDirty(null);
    void schedulePersist();
    return r;
  }

  function renameRoom(id, displayName) {
    const state = ensureLoadedSync();
    const r = state.rooms.find((x) => x.id === id);
    if (!r) throw new Error('room not found');
    r.displayName = String(displayName || r.displayName);
    r.version = Number(r.version || 1) + 1;
    if (!Array.isArray(r.audit_log)) r.audit_log = [];
    appendAudit(
      { at: nowIso(), clientId: 'host', action: 'room.rename', detail: { id: r.id } },
      r.audit_log
    );
    markDirty(null);
    void schedulePersist();
    return r;
  }

  function deleteRoom(id) {
    const state = ensureLoadedSync();
    const rid = String(id || '');
    state.rooms = state.rooms.filter((x) => x.id !== rid);
    if (state.roomSyncBundles && state.roomSyncBundles[rid]) {
      delete state.roomSyncBundles[rid];
      markDirty(rid);
    }
    markDirty(null);
    void schedulePersist();
  }

  function getRoomSyncBundle(roomId) {
    const state = ensureLoadedSync();
    const rid = String(roomId || '');
    const b = state.roomSyncBundles && state.roomSyncBundles[rid];
    if (!b || typeof b !== 'object') return null;
    refreshBundleClinicalOpsCacheIfStale(b);
    return b;
  }

  function assembleBundleLabsForApi(bundle, roomId) {
    if (!bundle || typeof bundle !== 'object') return bundle;
    const rid = String(roomId || '');
    const out = { ...bundle, entries: (bundle.entries || []).map((entry) => {
      if (!entry) return entry;
      const patientId = entryPatientId(entry);
      const cloned = { ...entry };
      if (patientId) {
        const sidecar = getLabSidecar(rid, patientId);
        if (cloned.labMeta || (sidecar.orderedIds && sidecar.orderedIds.length)) {
          cloned.labHistory = assembleLabHistory(sidecar);
        } else if (!Array.isArray(cloned.labHistory)) {
          cloned.labHistory = [];
        }
      }
      return cloned;
    }) };
    return out;
  }

  function getRoomSyncBundleForApi(roomId) {
    const bundle = getRoomSyncBundle(roomId);
    if (!bundle) return null;
    return assembleBundleLabsForApi(bundle, roomId);
  }

  function ensureRoomRecord(state, roomId, displayName) {
    const rid = String(roomId || '');
    if (!rid) return;
    const rooms = Array.isArray(state.rooms) ? state.rooms : [];
    if (rooms.some((x) => x && x.id === rid)) return;
    rooms.push({
      id: rid,
      displayName: String(displayName || 'Sala en vivo').trim() || 'Sala en vivo',
      createdAt: nowIso(),
      version: 1,
      audit_log: [],
    });
    state.rooms = rooms;
  }

  function findRoomForPatient(state, patientId) {
    if (!state.roomSyncBundles) return null;
    const pid = String(patientId || '').trim();
    if (!pid) return null;
    for (const [roomId, bundle] of Object.entries(state.roomSyncBundles)) {
      if (!bundle || !Array.isArray(bundle.entries)) continue;
      const found = bundle.entries.some((e) => {
        if (!e) return false;
        if (e.id === pid) return true;
        if (e.patient && e.patient.id === pid) return true;
        return false;
      });
      if (found) return roomId;
    }
    return null;
  }

  function findBundleEntry(bundle, patientId) {
    const pid = String(patientId || '').trim();
    return (bundle?.entries || []).find((e) => {
      if (!e) return false;
      if (e.id === pid) return true;
      if (e.patient && e.patient.id === pid) return true;
      return false;
    });
  }

  function upsertPatientLabHistorySet(patientId, set, clientTimestamp, clientId) {
    const state = ensureLoadedSync();
    const roomId = findRoomForPatient(state, patientId);
    if (!roomId) return { ok: false, error: 'patient not found' };
    const bundle = state.roomSyncBundles[roomId];
    if (!bundle) return { ok: false, error: 'no bundle' };
    const entry = findBundleEntry(bundle, patientId);
    if (!entry) return { ok: false, error: 'entry not found' };

    const pid = String(patientId || '').trim();
    const sidecar = getLabSidecar(roomId, pid);
    const existing = sidecar.setsById && set && set.id ? sidecar.setsById[set.id] : null;
    if (existing) {
      const prevTs = Number(existing._clientTimestamp || 0);
      if (clientTimestamp < prevTs) {
        return {
          ok: true,
          revision: Number(bundle.revision || 0),
          roomId,
          deltaSeq: Number(bundle.deltaSeq || 0),
        };
      }
    }

    const nextSidecar = upsertLabSidecar(sidecar, set, clientTimestamp);
    setLabSidecar(roomId, pid, nextSidecar);
    entry.labMeta = labMetaFromSidecar(
      nextSidecar,
      entry.labMeta && entry.labMeta.labHistoryVersion
    );
    delete entry.labHistory;

    const nextSeq = Number(bundle.deltaSeq || 0) + 1;
    const committedAt = nowIso();
    bundle.revision = Number(bundle.revision || 0) + 1;
    bundle.deltaSeq = nextSeq;
    bundle.committedAt = committedAt;
    if (!Array.isArray(bundle.deltaLog)) bundle.deltaLog = [];
    bundle.deltaLog.push({
      type: 'lab_upsert',
      roomId,
      patientId: pid,
      setId: String(set && set.id || ''),
      set,
      labHistoryVersion:
        entry.labMeta && entry.labMeta.labHistoryVersion != null
          ? entry.labMeta.labHistoryVersion
          : null,
      originClientId: String(clientId || ''),
      clientTimestamp: Number(clientTimestamp || 0),
      deltaSeq: nextSeq,
      revision: bundle.revision,
      committedAt,
    });
    while (bundle.deltaLog.length > 200) bundle.deltaLog.shift();

    markDirty(roomId);
    void schedulePersist();
    return { ok: true, revision: bundle.revision, roomId, deltaSeq: nextSeq };
  }

  function replacePatientNota(patientId, data, expectedVersion, clientTimestamp) {
    const state = ensureLoadedSync();
    const roomId = findRoomForPatient(state, patientId);
    if (!roomId) return { ok: false, error: 'patient not found' };
    const bundle = state.roomSyncBundles[roomId];
    const entry = findBundleEntry(bundle, patientId);
    if (!entry) return { ok: false, error: 'entry not found' };
    const currentVersion = Number(entry._notaVersion || 0);
    let lwwApplied = false;
    if (expectedVersion !== currentVersion) {
      const storedTs = Number(entry._notaClientTimestamp || 0);
      if (clientTimestamp > storedTs) {
        lwwApplied = true;
      } else {
        return {
          ok: true,
          lwwApplied: false,
          version: currentVersion,
          revision: Number(bundle.revision || 0),
          roomId,
          data: entry.note,
        };
      }
    }
    entry.note = data;
    entry._notaVersion = currentVersion + 1;
    entry._notaClientTimestamp = clientTimestamp;
    bundle.revision = Number(bundle.revision || 0) + 1;
    markDirty(roomId);
    void schedulePersist();
    return {
      ok: true,
      lwwApplied,
      version: entry._notaVersion,
      revision: bundle.revision,
      roomId,
      data: entry.note,
    };
  }

  function replacePatientIndicaciones(patientId, data, expectedVersion, clientTimestamp) {
    const state = ensureLoadedSync();
    const roomId = findRoomForPatient(state, patientId);
    if (!roomId) return { ok: false, error: 'patient not found' };
    const bundle = state.roomSyncBundles[roomId];
    const entry = findBundleEntry(bundle, patientId);
    if (!entry) return { ok: false, error: 'entry not found' };
    const currentVersion = Number(entry._indicacionesVersion || 0);
    let lwwApplied = false;
    if (expectedVersion !== currentVersion) {
      const storedTs = Number(entry._indicacionesClientTimestamp || 0);
      if (clientTimestamp > storedTs) {
        lwwApplied = true;
      } else {
        return {
          ok: true,
          lwwApplied: false,
          version: currentVersion,
          revision: Number(bundle.revision || 0),
          roomId,
          data: entry.indicaciones,
        };
      }
    }
    entry.indicaciones = data;
    entry._indicacionesVersion = currentVersion + 1;
    entry._indicacionesClientTimestamp = clientTimestamp;
    bundle.revision = Number(bundle.revision || 0) + 1;
    markDirty(roomId);
    void schedulePersist();
    return {
      ok: true,
      lwwApplied,
      version: entry._indicacionesVersion,
      revision: bundle.revision,
      roomId,
      data: entry.indicaciones,
    };
  }

  function putRoomSyncBundle(roomId, bundle) {
    const state = ensureLoadedSync();
    const rid = String(roomId || '');
    if (!rid) throw new Error('room id required');
    const incoming = bundle && typeof bundle === 'object' ? bundle : {};
    ensureRoomRecord(state, rid, incoming.roomDisplayName);
    if (!state.roomSyncBundles) state.roomSyncBundles = {};
    const cur = state.roomSyncBundles[rid];

    const usesLegacyClock =
      incoming.baseRevision == null &&
      incoming.baseEntityVersions == null &&
      incoming.updatedAt != null;

    if (usesLegacyClock && cur && Number(cur.revision || 0) > 0) {
      const err = new Error('conflict');
      err.code = 'CONFLICT';
      err.serverBundle = cur;
      err.conflicts = [
        {
          key: '*',
          kind: 'bundle',
          local: { updatedAt: incoming.updatedAt },
          server: { revision: cur.revision },
        },
      ];
      throw err;
    }

    const mergeInput = usesLegacyClock
      ? {
          baseRevision: Number(cur && cur.revision ? cur.revision : 0),
          baseEntityVersions:
            cur && cur.entityVersions && typeof cur.entityVersions === 'object'
              ? { ...cur.entityVersions }
              : {},
          agenda: Array.isArray(incoming.agenda) ? incoming.agenda : [],
          todos: incoming.todos && typeof incoming.todos === 'object' ? incoming.todos : {},
          entries: Array.isArray(incoming.entries) ? incoming.entries : [],
          manejo: incoming.manejo,
          clinicalOps:
            incoming.clinicalOps && typeof incoming.clinicalOps === 'object'
              ? incoming.clinicalOps
              : null,
          clientId: incoming.uploadedByClientId || incoming.clientId || '',
        }
      : { ...incoming, clientId: incoming.uploadedByClientId || incoming.clientId || '' };

    const result = mergeBundlePut(cur, mergeInput, {
      clientId: mergeInput.clientId,
      nowIso,
    });

    if (!result.ok) {
      const err = new Error('conflict');
      err.code = 'CONFLICT';
      err.serverBundle = result.bundle;
      err.conflicts = result.conflicts;
      throw err;
    }

    state.roomSyncBundles[rid] = result.bundle;
    if (stripRoomBundleLabsToSidecars(rid, result.bundle)) {
      markDirty(rid);
    }
    markDirty(rid);
    void schedulePersist();
    const out = {
      bundle: result.bundle,
      lwwAppliedKeys: Array.isArray(result.lwwAppliedKeys) ? result.lwwAppliedKeys : [],
    };
    return out;
  }

  /**
   * After sync-bundle PUT, fold room clinicalOps into host SQLCipher when unlocked
   * (same authoritative export as PUT /clinical-ops).
   * @param {string} roomId
   */
  async function persistRoomBundleClinicalOpsToHostDb(roomId) {
    const state = ensureLoadedSync();
    const rid = String(roomId || '');
    if (!rid || !state.roomSyncBundles) return null;
    const bundle = state.roomSyncBundles[rid];
    if (!bundle || !bundle.clinicalOps || typeof bundle.clinicalOps !== 'object') return null;
    const authoritative = await mergeBundleClinicalOpsIntoHostDb(bundle.clinicalOps, {
      roomId: rid,
      revision: bundle.revision,
    });
    if (authoritative) {
      bundle.clinicalOps = authoritative;
      markDirty(rid);
      void schedulePersist();
    }
    return authoritative;
  }

  async function putRoomClinicalOps(roomId, body) {
    const state = ensureLoadedSync();
    const rid = String(roomId || '');
    if (!rid) throw new Error('room id required');
    const incoming = body && typeof body === 'object' ? body : {};
    ensureRoomRecord(state, rid, incoming.roomDisplayName);
    const bundle = ensureRoomBundle(state, rid);
    const clientId = String(incoming.clientId || incoming.uploadedByClientId || '');
    const baseRevision = Number(incoming.baseRevision != null ? incoming.baseRevision : 0);
    const serverRevision = Number(bundle.revision || 0);
    const lwwAppliedKeys = [];
    const revisionSkew = serverRevision > 0 && baseRevision !== serverRevision;

    if (revisionSkew) {
      refreshBundleClinicalOpsCacheIfStale(bundle);
      lwwAppliedKeys.push('clinicalOps');
    }

    const incomingSnapshot =
      incoming.snapshot && typeof incoming.snapshot === 'object' ? incoming.snapshot : null;
    const serverOps =
      bundle.clinicalOps && typeof bundle.clinicalOps === 'object' ? bundle.clinicalOps : null;

    // Never delete the cumulative roster on a missing/null snapshot; only union when present.
    if (incomingSnapshot) {
      bundle.clinicalOps = serverOps
        ? mergeClinicalOpsSnapshotsData(serverOps, incomingSnapshot)
        : incomingSnapshot;
    }

    if (!bundle.entityVersions || typeof bundle.entityVersions !== 'object') {
      bundle.entityVersions = {};
    }
    bundle.entityVersions.clinicalOps = Number(bundle.entityVersions.clinicalOps || 0) + 1;
    bundle.revision = serverRevision + 1;
    bundle.committedAt = nowIso();
    bundle.uploadedByClientId = clientId;
    if (!Array.isArray(bundle.audit_log)) bundle.audit_log = [];
    appendAudit(
      {
        at: bundle.committedAt,
        clientId: clientId || 'host',
        action: 'clinical_ops.put',
        detail: { revision: bundle.revision },
      },
      bundle.audit_log
    );

    if (bundle.clinicalOps && typeof bundle.clinicalOps === 'object') {
      const authoritative = await mergeBundleClinicalOpsIntoHostDb(bundle.clinicalOps, {
        roomId: rid,
        revision: bundle.revision,
      });
      if (authoritative) bundle.clinicalOps = authoritative;
    }

    state.roomSyncBundles[rid] = bundle;
    markDirty(rid);
    void schedulePersist();
    const out = {
      snapshot: bundle.clinicalOps,
      revision: bundle.revision,
    };
    if (lwwAppliedKeys.length) out.lwwAppliedKeys = lwwAppliedKeys;
    return out;
  }

  function ensureRoomBundle(state, roomId) {
    const rid = String(roomId || '');
    if (!rid) throw new Error('room id required');
    if (!state.roomSyncBundles) state.roomSyncBundles = {};
    let b = state.roomSyncBundles[rid];
    if (!b || typeof b !== 'object') {
      b = {
        revision: 0,
        entityVersions: {},
        deltaSeq: 0,
        deltaLog: [],
        committedAt: nowIso(),
        uploadedByClientId: '',
        entities: {},
        agenda: [],
        todos: {},
        entries: [],
        manejo: null,
        clinicalOps: null,
        audit_log: [],
      };
      state.roomSyncBundles[rid] = b;
    }
    if (!b.entities || typeof b.entities !== 'object') b.entities = {};
    if (!b.entityVersions || typeof b.entityVersions !== 'object') b.entityVersions = {};
    if (!Array.isArray(b.deltaLog)) b.deltaLog = [];
    if (!Number.isFinite(Number(b.deltaSeq))) b.deltaSeq = 0;
    return b;
  }

  function getEntity({ entityType, entityId, roomId, patientId }) {
    const type = String(entityType || '');
    const id = String(entityId || '');
    if (type === 'patient') {
      const state = ensureLoadedSync();
      const row = state.patients.find((p) => p.id === id);
      if (!row || row._deleted) return null;
      return { version: Number(row.version || 1), data: row };
    }
    if (type === 'agenda' || type === 'todo') {
      const bundle = getRoomSyncBundle(roomId);
      if (!bundle || !bundle.entities) return null;
      const key = type === 'agenda' ? agendaEntityKey(id) : todoEntityKey(patientId, id);
      const rec = bundle.entities[key];
      if (!rec || rec.deleted) return null;
      return {
        version: Number(rec.version || 1),
        data: rec.data,
        fieldMeta: rec.fieldMeta && typeof rec.fieldMeta === 'object' ? rec.fieldMeta : {},
      };
    }
    if (type === 'historiaClinica') {
      const bundle = getRoomSyncBundle(roomId);
      if (!bundle) return null;
      const pid = String(patientId || id || '').trim();
      const key = historiaClinicaEntityKey(pid);
      if (bundle.entities) {
        const rec = bundle.entities[key];
        if (rec && !rec.deleted) {
          return {
            version: Number(rec.version || 1),
            data: rec.data,
            fieldMeta: rec.fieldMeta && typeof rec.fieldMeta === 'object' ? rec.fieldMeta : {},
          };
        }
      }
      const entries = Array.isArray(bundle.entries) ? bundle.entries : [];
      for (const ent of entries) {
        const p = ent && ent.patient;
        if (!p || String(p.id || '').trim() !== pid) continue;
        const hc = p.historiaClinica;
        if (!hc || typeof hc !== 'object') return null;
        const data = hc.data && typeof hc.data === 'object' ? hc.data : hc;
        return {
          version: Number(hc.version || 1),
          data,
          fieldMeta: hc.fieldMeta && typeof hc.fieldMeta === 'object' ? hc.fieldMeta : {},
        };
      }
      return null;
    }
    return null;
  }

  function purgePatientFromAllRoomBundles(state, patientId, registro, opts) {
    const pid = String(patientId || '').trim();
    const reg = String(registro || '').trim();
    if (!pid && !reg) return false;
    const deferPersist = !!(opts && opts.deferPersist);
    if (!state.roomSyncBundles || typeof state.roomSyncBundles !== 'object') return false;
    let changed = false;
    for (const rid of Object.keys(state.roomSyncBundles)) {
      const bundle = state.roomSyncBundles[rid];
      if (!bundle || !Array.isArray(bundle.entries)) continue;
      const before = bundle.entries.length;
      bundle.entries = bundle.entries.filter((ent) => {
        const p = ent && ent.patient;
        if (!p) return false;
        const id = String(p.id || '').trim();
        const r = String(p.registro || '').trim();
        if (pid && id === pid) return false;
        if (reg && r === reg) return false;
        return true;
      });
      if (bundle.entries.length !== before) {
        bundle.revision = Number(bundle.revision || 0) + 1;
        bundle.committedAt = nowIso();
        markDirty(rid);
        changed = true;
      }
    }
    if (changed && !deferPersist) {
      markDirty(null);
      void schedulePersist();
    }
    return changed;
  }

  function materializeRoomViews(roomId, opts) {
    const deferPersist = !!(opts && opts.deferPersist);
    const state = ensureLoadedSync();
    const bundle = ensureRoomBundle(state, roomId);
    const entities = bundle.entities || {};
    const agenda = [];
    const todos = {};
    for (const [key, rec] of Object.entries(entities)) {
      if (!rec || rec.deleted) continue;
      if (key.startsWith('a:')) {
        if (rec.data && typeof rec.data === 'object') agenda.push(rec.data);
        continue;
      }
      if (key.startsWith('t:')) {
        const rest = key.slice(2);
        const colon = rest.indexOf(':');
        const pid = colon >= 0 ? rest.slice(0, colon) : rest;
        if (!pid || !rec.data || typeof rec.data !== 'object') continue;
        if (!todos[pid]) todos[pid] = [];
        todos[pid].push(rec.data);
      }
    }
    agenda.sort((a, b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')));
    for (const pid of Object.keys(todos)) {
      todos[pid].sort((a, b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')));
    }
    bundle.agenda = agenda;
    bundle.todos = todos;
    bundle.committedAt = nowIso();
    if (!deferPersist) {
      markDirty(roomId);
      void schedulePersist();
    }
    return bundle;
  }

  function setEntity({ roomId, entityType, entityId, patientId, version, data, deleted }, opts) {
    const deferPersist = !!(opts && opts.deferPersist);
    const type = String(entityType || '');
    const id = String(entityId || '');
    const state = ensureLoadedSync();
    const t = nowIso();

    if (type === 'patient') {
      const idx = state.patients.findIndex((p) => p.id === id);
      const nextData = data && typeof data === 'object' ? { ...data, id } : { id };
      const nextVersion = Number(version || 1);
      if (idx === -1) {
        if (deleted) {
          purgePatientFromAllRoomBundles(state, id, String(nextData.registro || '').trim(), opts);
          if (!deferPersist) {
            markDirty(null);
            void schedulePersist();
          }
          return null;
        }
        const row = { ...nextData, version: nextVersion, updatedAt: t, audit_log: [] };
        state.patients.push(row);
        if (!deferPersist) {
          markDirty(null);
          void schedulePersist();
        }
        return row;
      }
      const row = { ...state.patients[idx], ...nextData, version: nextVersion, updatedAt: t };
      if (deleted) row._deleted = true;
      state.patients[idx] = row;
      if (deleted) {
        purgePatientFromAllRoomBundles(state, id, row.registro, opts);
      }
      if (!deferPersist) {
        markDirty(null);
        void schedulePersist();
      }
      return row;
    }

    if (type === 'agenda' || type === 'todo') {
      const bundle = ensureRoomBundle(state, roomId);
      const key =
        type === 'agenda' ? agendaEntityKey(id) : todoEntityKey(patientId, id);
      bundle.entities[key] = {
        version: Number(version || 1),
        data: data && typeof data === 'object' ? data : {},
        updatedAt: t,
        deleted: !!deleted,
      };
      bundle.entityVersions[key] = Number(version || 1);
      bundle.revision = Number(bundle.revision || 0) + 1;
      if (!deferPersist) {
        markDirty(roomId);
        void schedulePersist();
      }
      materializeRoomViews(roomId, opts);
      return bundle.entities[key];
    }

    if (type === 'historiaClinica') {
      const bundle = ensureRoomBundle(state, roomId);
      const key = historiaClinicaEntityKey(patientId || id);
      const prev = bundle.entities[key];
      const prevData =
        prev && prev.data && typeof prev.data === 'object' ? { ...prev.data } : {};
      const patch = data && typeof data === 'object' ? data : {};
      const nextData = { ...prevData, ...patch, patientId: String(patientId || id), updatedAt: t };
      bundle.entities[key] = {
        version: Number(version || 1),
        data: nextData,
        updatedAt: t,
        deleted: !!deleted,
      };
      bundle.entityVersions[key] = Number(version || 1);
      bundle.revision = Number(bundle.revision || 0) + 1;
      if (!Array.isArray(bundle.audit_log)) bundle.audit_log = [];
      if (!deferPersist) {
        markDirty(roomId);
        void schedulePersist();
      }
      return bundle.entities[key];
    }

    throw new Error('unsupported entity type');
  }

  function ensureDeltaEntity({ roomId, entityType, entityId, patientId }) {
    const state = ensureLoadedSync();
    const bundle = ensureRoomBundle(state, roomId);
    const type = String(entityType || '');
    const id = String(entityId || '');
    let key = '';
    if (type === 'agenda') key = agendaEntityKey(id);
    else if (type === 'todo') key = todoEntityKey(patientId, id);
    else if (type === 'historiaClinica') key = historiaClinicaEntityKey(patientId || id);
    else throw new Error('unsupported_delta_entity');

    if (!bundle.entities[key] || typeof bundle.entities[key] !== 'object') {
      bundle.entities[key] = {
        version: 0,
        data: {},
        fieldMeta: {},
        updatedAt: nowIso(),
        deleted: false,
      };
    }
    if (!bundle.entities[key].fieldMeta || typeof bundle.entities[key].fieldMeta !== 'object') {
      bundle.entities[key].fieldMeta = {};
    }
    if (!bundle.entities[key].data || typeof bundle.entities[key].data !== 'object') {
      bundle.entities[key].data = {};
    }
    return { bundle, key, rec: bundle.entities[key] };
  }

  function commandEntityKey(command) {
    const domain = String(command && command.domain || '').trim();
    const entityId = String(command && command.entityId || '').trim();
    const patientId = String(command && command.patientId || '').trim();
    if (domain === 'estadoActual') return `cmd:estadoActual:${entityId || patientId}`;
    if (domain === 'eventualidades') return `cmd:eventualidades:${entityId || patientId}`;
    if (domain === 'pendientes') return `cmd:pendientes:${entityId || patientId}`;
    throw new Error('unsupported_command_domain');
  }

  function commitDeltaEntity({
    roomId,
    entityType,
    entityId,
    patientId,
    data,
    fieldMeta,
    clientId,
    txId,
    acceptedPaths,
    buildFieldMeta,
  }) {
    const { bundle, key, rec } = ensureDeltaEntity({ roomId, entityType, entityId, patientId });
    const nextVersion = Number(rec.version || 0) + 1;
    const nextSeq = Number(bundle.deltaSeq || 0) + 1;
    const committedAt = nowIso();
    const nextFieldMeta =
      typeof buildFieldMeta === 'function'
        ? buildFieldMeta({ deltaSeq: nextSeq, committedAt, previousFieldMeta: fieldMeta || {} })
        : fieldMeta;
    rec.version = nextVersion;
    rec.data = data && typeof data === 'object' ? data : {};
    rec.fieldMeta = nextFieldMeta && typeof nextFieldMeta === 'object' ? nextFieldMeta : {};
    rec.updatedAt = committedAt;
    rec.deleted = false;
    bundle.entityVersions[key] = nextVersion;
    bundle.revision = Number(bundle.revision || 0) + 1;
    bundle.deltaSeq = nextSeq;
    bundle.committedAt = committedAt;
    if (!Array.isArray(bundle.deltaLog)) bundle.deltaLog = [];
    return { bundle, key, rec, version: nextVersion, deltaSeq: nextSeq, committedAt };
  }

  function appendDeltaLog(roomId, entry) {
    const state = ensureLoadedSync();
    const bundle = ensureRoomBundle(state, roomId);
    if (!Array.isArray(bundle.deltaLog)) bundle.deltaLog = [];
    bundle.deltaLog.push(entry);
    while (bundle.deltaLog.length > 200) bundle.deltaLog.shift();
    markDirty(roomId);
    void schedulePersist();
  }

  function getRoomDeltaLog(roomId, afterSeq) {
    const bundle = getRoomSyncBundle(roomId);
    if (!bundle) return { ok: false, error: 'no_bundle', deltas: [] };
    const seq = Number(afterSeq || 0);
    const log = Array.isArray(bundle.deltaLog) ? bundle.deltaLog : [];
    const deltas = log.filter((entry) => Number(entry.deltaSeq || 0) > seq);
    if (deltas.length && Number(deltas[0].deltaSeq) !== seq + 1) {
      return { ok: false, error: 'delta_gap', deltas: [] };
    }
    return { ok: true, deltas, latestDeltaSeq: Number(bundle.deltaSeq || 0) };
  }

  function ensureRoomBundleForTest(roomId) {
    return ensureRoomBundle(ensureLoadedSync(), roomId);
  }

  function getAppliedCommand(roomId, commandId) {
    const bundle = getRoomSyncBundle(roomId);
    const id = String(commandId || '').trim();
    if (!bundle || !id || !Array.isArray(bundle.deltaLog)) return null;
    return bundle.deltaLog.find((entry) => entry && entry.type === 'command' && entry.commandId === id) || null;
  }

  function getCommandEntityState(roomId, command) {
    const bundle = ensureRoomBundle(ensureLoadedSync(), roomId);
    const key = commandEntityKey(command);
    const rec = bundle.entities[key];
    return {
      key,
      version: Number(rec && rec.version || 0),
      data: rec && rec.data && typeof rec.data === 'object' ? rec.data : {},
      meta: rec && rec.commandMeta && typeof rec.commandMeta === 'object' ? rec.commandMeta : {},
    };
  }

  function commitCommandEntity({ roomId, command, data, meta, status, nowIsoOverride }) {
    const state = ensureLoadedSync();
    const bundle = ensureRoomBundle(state, roomId);
    const key = commandEntityKey(command);
    const rec = bundle.entities[key] && typeof bundle.entities[key] === 'object'
      ? bundle.entities[key]
      : { version: 0, data: {}, commandMeta: {}, deleted: false };
    const nextSeq = Number(bundle.deltaSeq || 0) + 1;
    const committedAt = nowIsoOverride || nowIso();
    rec.version = Number(rec.version || 0) + 1;
    rec.data = data && typeof data === 'object' ? data : {};
    rec.commandMeta = meta && typeof meta === 'object' ? meta : {};
    rec.updatedAt = committedAt;
    rec.deleted = false;
    bundle.entities[key] = rec;
    bundle.entityVersions[key] = rec.version;
    bundle.revision = Number(bundle.revision || 0) + 1;
    bundle.deltaSeq = nextSeq;
    bundle.committedAt = committedAt;
    if (!Array.isArray(bundle.deltaLog)) bundle.deltaLog = [];
    const entry = {
      type: 'command',
      status: status || 'accepted',
      commandId: String(command.commandId || ''),
      domain: String(command.domain || ''),
      op: String(command.op || ''),
      roomId,
      patientId: command.patientId || null,
      entityId: command.entityId || null,
      originClientId: String(command.clientId || ''),
      clientCreatedAt: Number(command.clientCreatedAt || 0),
      deltaSeq: nextSeq,
      revision: bundle.revision,
      committedAt,
      payload: command.payload || {},
    };
    bundle.deltaLog.push(entry);
    while (bundle.deltaLog.length > 200) bundle.deltaLog.shift();
    markDirty(roomId);
    void schedulePersist();
    return { bundle, key, rec, entry, version: rec.version, deltaSeq: nextSeq, revision: bundle.revision, committedAt };
  }

  function appendRoomBundleAuditInMemory(roomId, entry) {
    const state = ensureLoadedSync();
    const bundle = ensureRoomBundle(state, roomId);
    if (!Array.isArray(bundle.audit_log)) bundle.audit_log = [];
    appendAudit(entry, bundle.audit_log);
    return bundle.audit_log;
  }

  function appendRoomBundleAudit(roomId, entry) {
    appendRoomBundleAuditInMemory(roomId, entry);
    markDirty(roomId);
    void schedulePersist();
    return ensureRoomBundle(ensureLoadedSync(), roomId).audit_log;
  }

  /**
   * Apply historia mutation + optional audit in one write-queue transaction.
   * @param {{ applyMutation: Function }} resolver
   * @param {object} mutation
   * @param {object|null} auditEntry
   */
  function putHistoriaClinicaQueued(resolver, mutation, auditTemplate) {
    return queue.enqueue(async () => {
      ensureLoadedSync();
      const out = resolver.applyMutation(mutation, { deferPersist: true });
      if (auditTemplate) {
        const entry = {
          at: auditTemplate.at || nowIso(),
          clientId: auditTemplate.clientId || 'unknown',
          action: auditTemplate.action || 'historia_clinica.save',
          detail: {
            ...(auditTemplate.detail || {}),
            entityVersion: out.version,
            autoMerged: !!out.autoMerged,
          },
        };
        appendRoomBundleAuditInMemory(mutation.roomId, entry);
      }
      markDirty(mutation.roomId);
      await flushCacheNow({ serialized: true });
      return out;
    });
  }

  function archiveHistoriaClinicaForPatient(patientId, { storageRoot } = {}) {
    const pid = String(patientId || '').trim();
    if (!pid) return { archived: false, reason: 'no_patient_id' };
    const state = ensureLoadedSync();
    let found = false;
    for (const rid of Object.keys(state.roomSyncBundles || {})) {
      const bundle = state.roomSyncBundles[rid];
      if (!bundle || !bundle.entities) continue;
      const key = historiaClinicaEntityKey(pid);
      const rec = bundle.entities[key];
      if (!rec || rec.deleted) continue;
      writeHistoriaClinicaArchive({
        storageRoot: storageRoot || resolveStorageRoot(),
        patientId: pid,
        payload: {
          version: rec.version,
          data: rec.data,
          roomId: rid,
        },
      });
      delete bundle.entities[key];
      if (bundle.entityVersions && bundle.entityVersions[key] != null) {
        delete bundle.entityVersions[key];
      }
      bundle.revision = Number(bundle.revision || 0) + 1;
      markDirty(rid);
      found = true;
    }
    if (found) {
      markDirty(null);
      void schedulePersist();
    }
    return { archived: found, patientId: pid };
  }

  function getRepairedRoomCount() {
    return repairedRoomCount;
  }

  if (!useDb() && !isShardedLayout(stateDir) && !fs.existsSync(filePath)) {
    initEmptyShardedStateSync(stateDir, teamCodeHash);
  }

  return {
    ready,
    flush,
    awaitDurableCommit,
    getLastCommitAudit,
    getRepairedRoomCount,
    getHostStateDir: () => stateDir,
    getState,
    upsertPatient,
    listRooms,
    createRoom,
    renameRoom,
    deleteRoom,
    getRoomSyncBundle,
    getRoomSyncBundleForApi,
    putRoomSyncBundle,
    upsertPatientLabHistorySet,
    replacePatientNota,
    replacePatientIndicaciones,
    findRoomForPatient: (patientId) => findRoomForPatient(ensureLoadedSync(), patientId),
    persistRoomBundleClinicalOpsToHostDb,
    putRoomClinicalOps,
    getEntity,
    setEntity,
    ensureDeltaEntity,
    commitDeltaEntity,
    appendDeltaLog,
    getRoomDeltaLog,
    ensureRoomBundleForTest,
    getAppliedCommand,
    getCommandEntityState,
    commitCommandEntity,
    materializeRoomViews,
    archiveHistoriaClinicaForPatient,
    appendRoomBundleAudit,
    appendRoomBundleAuditInMemory,
    putHistoriaClinicaQueued,
  };
}

module.exports = { createHostStore, atomicWriteJson, readPersistModeOverride };
