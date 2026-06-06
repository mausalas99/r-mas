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

function getGlobalClinicalDbManager() {
  const mgr =
    typeof globalThis !== 'undefined' && globalThis.__rplusDbManager
      ? globalThis.__rplusDbManager
      : null;
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

function assertTeamCodeHash(s, teamCodeHash) {
  if (s.teamCodeHash !== teamCodeHash) {
    const err = new Error(
      'LAN host state teamCodeHash does not match lan-team-code.txt. Run bootstrap or rehashLanHostState.'
    );
    err.code = 'LAN_HOST_STATE_HASH_MISMATCH';
    throw err;
  }
}

function createHostStore({ filePath, teamCodePlain, dbManager = null, getClientId = () => 'host' }) {
  const teamCodeHash = hashTeamCode(teamCodePlain);
  const cache = createHostStateCache();
  const queue = createWriteQueue();
  let initPromise = null;
  const useDb = () => dbManager != null;

  async function persistCacheToDb() {
    assertDbUnlocked(dbManager);
    const snapshot = cache.get();
    await dbManager.withTransaction((db, { audit }) => {
      writeHostState(db, snapshot);
      audit(getClientId(), 'lan.host.commit', {
        action: 'host.commit',
        byteLength: JSON.stringify(snapshot).length,
      });
    });
  }

  async function persistSnapshot(snapshot) {
    if (useDb()) {
      cache.replace(snapshot);
      await persistCacheToDb();
      return;
    }
    await writeJsonAtomic(filePath, snapshot);
  }

  async function loadFromDisk() {
    let s;
    if (useDb()) {
      assertDbUnlocked(dbManager);
      s = await dbManager.withTransaction((db) => readHostState(db));
    } else {
      s = await readJson(filePath);
    }
    if (!s) {
      s = defaultState(teamCodeHash);
      await persistSnapshot(s);
      cache.replace(s);
      return s;
    }
    assertTeamCodeHash(s, teamCodeHash);
    const prevVersion = Number(s.version);
    s = normalizeLoadedState(s);
    if (Number(s.version) !== 2) {
      s.version = 2;
      await persistSnapshot(s);
    } else if (prevVersion !== 2 && useDb()) {
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
      s = readHostState(dbManager.getDb());
    } else {
      s = readStateSync(filePath);
    }
    if (!s) {
      const fresh = defaultState(teamCodeHash);
      if (useDb()) {
        cache.replace(fresh);
        queue.enqueue(() => persistCacheToDb()).catch(() => {});
        return fresh;
      }
      atomicWriteJson(filePath, fresh);
      cache.replace(fresh);
      return fresh;
    }
    assertTeamCodeHash(s, teamCodeHash);
    const prevVersion = Number(s.version);
    const migrated = normalizeLoadedState(s);
    cache.replace(migrated);
    if (Number(migrated.version) === 2 && prevVersion !== 2) {
      if (useDb()) {
        queue.enqueue(() => persistCacheToDb()).catch(() => {});
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

  async function writeCacheSnapshotToDisk(snapshot) {
    try {
      await writeJsonAtomic(filePath, snapshot);
    } catch (_e) {
      await loadFromDisk();
    }
  }

  function persistState() {
    if (useDb()) {
      return queue.enqueue(() => persistCacheToDb());
    }
    const snapshot = cache.get();
    try {
      atomicWriteJson(filePath, snapshot);
    } catch (e) {
      throw e;
    }
    return queue.enqueue(() => writeCacheSnapshotToDisk(snapshot));
  }

  /** Single serialized commit after in-memory mutation + audit (avoids stale queue snapshots). */
  function commitCacheNow() {
    if (useDb()) {
      return persistCacheToDb();
    }
    const snapshot = cache.get();
    try {
      atomicWriteJson(filePath, snapshot);
    } catch (e) {
      throw e;
    }
    return writeCacheSnapshotToDisk(snapshot);
  }

  function flush() {
    return queue.enqueue(async () => {});
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
      persistState();
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
    persistState();
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
    persistState();
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
    persistState();
    return r;
  }

  function deleteRoom(id) {
    const state = ensureLoadedSync();
    const rid = String(id || '');
    state.rooms = state.rooms.filter((x) => x.id !== rid);
    if (state.roomSyncBundles && state.roomSyncBundles[rid]) {
      delete state.roomSyncBundles[rid];
    }
    persistState();
  }

  function getRoomSyncBundle(roomId) {
    const state = ensureLoadedSync();
    const rid = String(roomId || '');
    const b = state.roomSyncBundles && state.roomSyncBundles[rid];
    if (!b || typeof b !== 'object') return null;
    refreshBundleClinicalOpsCacheIfStale(b);
    return b;
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
    persistState();
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
      persistState();
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
    persistState();
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
      if (!row) return null;
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
    if (!deferPersist) persistState();
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
        const row = { ...nextData, version: nextVersion, updatedAt: t, audit_log: [] };
        state.patients.push(row);
        if (!deferPersist) persistState();
        return row;
      }
      const row = { ...state.patients[idx], ...nextData, version: nextVersion, updatedAt: t };
      if (deleted) row._deleted = true;
      state.patients[idx] = row;
      if (!deferPersist) persistState();
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
      if (!deferPersist) persistState();
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
      if (!deferPersist) persistState();
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
    persistState();
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
    persistState();
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
    persistState();
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
      await commitCacheNow();
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
      found = true;
    }
    if (found) persistState();
    return { archived: found, patientId: pid };
  }

  if (!useDb() && !fs.existsSync(filePath)) {
    atomicWriteJson(filePath, defaultState(teamCodeHash));
  }

  return {
    ready,
    flush,
    getState,
    upsertPatient,
    listRooms,
    createRoom,
    renameRoom,
    deleteRoom,
    getRoomSyncBundle,
    putRoomSyncBundle,
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

module.exports = { createHostStore, atomicWriteJson };
