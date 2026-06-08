'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const {
  loadShardedStateSync,
  entryPatientId,
} = require('./sharded-host-persistence.js');
const { metaPath } = require('./json-meta-repository.js');
const {
  HOST_LAB_SET_CAP,
  upsertLabSidecar,
  emptySidecar,
  readLabSidecarSync,
  sidecarFromLabHistory,
  labMetaFromSidecar,
} = require('./lab-sidecar.js');

const V15_TABLES = [
  'lan_host_meta',
  'lan_room_bundles',
  'lan_bundle_entries',
  'lan_lab_sets',
  'lan_lab_set_order',
];

function dbHasLanHostV15(db) {
  if (!db) return false;
  for (const name of V15_TABLES) {
    const row = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(name);
    if (!row) return false;
  }
  return true;
}

function sqlMetaNeedsImport(db) {
  if (!dbHasLanHostV15(db)) return false;
  const row = db.prepare('SELECT migration_generation FROM lan_host_meta WHERE id = 1').get();
  return !row || Number(row.migration_generation) !== 3;
}

function parseLabSidecarKey(key) {
  const raw = String(key || '');
  const sep = raw.indexOf(':');
  if (sep <= 0) return null;
  return { roomId: raw.slice(0, sep), patientId: raw.slice(sep + 1) };
}

function entryJsonForSql(entry) {
  const copy = { ...entry };
  delete copy.labHistory;
  return JSON.stringify(copy);
}

function loadSidecarFromSql(db, roomId, patientId) {
  const rows = db
    .prepare(
      `SELECT o.set_id, o.pos, s.set_json
       FROM lan_lab_set_order o
       JOIN lan_lab_sets s
         ON s.room_id = o.room_id AND s.patient_id = o.patient_id AND s.set_id = o.set_id
       WHERE o.room_id = ? AND o.patient_id = ?
       ORDER BY o.pos ASC`
    )
    .all(roomId, patientId);
  if (!rows.length) return emptySidecar();
  const setsById = {};
  const orderedIds = [];
  for (const row of rows) {
    orderedIds.push(row.set_id);
    try {
      setsById[row.set_id] = JSON.parse(row.set_json);
    } catch (_e) {
      setsById[row.set_id] = { id: row.set_id };
    }
  }
  return { setsById, orderedIds, updatedAt: new Date().toISOString() };
}

function writeSidecarToSql(db, roomId, patientId, sidecar) {
  db.prepare('DELETE FROM lan_lab_sets WHERE room_id = ? AND patient_id = ?').run(
    roomId,
    patientId
  );
  db.prepare('DELETE FROM lan_lab_set_order WHERE room_id = ? AND patient_id = ?').run(
    roomId,
    patientId
  );
  const orderedIds = Array.isArray(sidecar.orderedIds) ? sidecar.orderedIds : [];
  const insertSet = db.prepare(
    `INSERT INTO lan_lab_sets (room_id, patient_id, set_id, set_json, sort_date, client_timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertOrder = db.prepare(
    `INSERT INTO lan_lab_set_order (room_id, patient_id, pos, set_id) VALUES (?, ?, ?, ?)`
  );
  for (let pos = 0; pos < orderedIds.length; pos += 1) {
    const setId = orderedIds[pos];
    const set = sidecar.setsById && sidecar.setsById[setId];
    if (!set) continue;
    const sortDate = String(set.date || '1970-01-01');
    const clientTs = Number(set._clientTimestamp || 0);
    insertSet.run(roomId, patientId, setId, JSON.stringify(set), sortDate, clientTs);
    insertOrder.run(roomId, patientId, pos, setId);
  }
}

function upsertRoomBundleRow(db, roomId, bundle) {
  db.prepare(
    `INSERT INTO lan_room_bundles (
      room_id, revision, entity_versions_json, agenda_json, todos_json, manejo_json,
      clinical_ops_json, delta_log_json, committed_at, audit_log_json,
      uploaded_by_client_id, entities_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_id) DO UPDATE SET
      revision = excluded.revision,
      entity_versions_json = excluded.entity_versions_json,
      agenda_json = excluded.agenda_json,
      todos_json = excluded.todos_json,
      manejo_json = excluded.manejo_json,
      clinical_ops_json = excluded.clinical_ops_json,
      delta_log_json = excluded.delta_log_json,
      committed_at = excluded.committed_at,
      audit_log_json = excluded.audit_log_json,
      uploaded_by_client_id = excluded.uploaded_by_client_id,
      entities_json = excluded.entities_json`
  ).run(
    roomId,
    Number(bundle.revision || 0),
    JSON.stringify(bundle.entityVersions || {}),
    JSON.stringify(bundle.agenda || []),
    JSON.stringify(bundle.todos || {}),
    bundle.manejo != null ? JSON.stringify(bundle.manejo) : null,
    bundle.clinicalOps != null ? JSON.stringify(bundle.clinicalOps) : null,
    bundle.deltaLog != null ? JSON.stringify(bundle.deltaLog) : null,
    bundle.committedAt || null,
    JSON.stringify(bundle.audit_log || []),
    bundle.uploadedByClientId || null,
    JSON.stringify(bundle.entities || {})
  );
}

function upsertBundleEntryRow(db, roomId, patientId, entry) {
  const labMeta = entry.labMeta && typeof entry.labMeta === 'object' ? entry.labMeta : null;
  db.prepare(
    `INSERT INTO lan_bundle_entries (
      room_id, patient_id, entry_json, nota_version, indicaciones_version, lab_meta_json
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_id, patient_id) DO UPDATE SET
      entry_json = excluded.entry_json,
      nota_version = excluded.nota_version,
      indicaciones_version = excluded.indicaciones_version,
      lab_meta_json = excluded.lab_meta_json`
  ).run(
    roomId,
    patientId,
    entryJsonForSql(entry),
    entry._notaVersion != null ? Number(entry._notaVersion) : null,
    entry._indicacionesVersion != null ? Number(entry._indicacionesVersion) : null,
    labMeta ? JSON.stringify(labMeta) : null
  );
}

function commitRoomBundleSql(db, roomId, bundle) {
  upsertRoomBundleRow(db, roomId, bundle);
  const entries = Array.isArray(bundle.entries) ? bundle.entries : [];
  const seen = new Set();
  for (const entry of entries) {
    const patientId = entryPatientId(entry);
    if (!patientId) continue;
    seen.add(patientId);
    upsertBundleEntryRow(db, roomId, patientId, entry);
  }
  const existing = db
    .prepare('SELECT patient_id FROM lan_bundle_entries WHERE room_id = ?')
    .all(roomId)
    .map((r) => r.patient_id);
  for (const pid of existing) {
    if (!seen.has(pid)) {
      db.prepare(
        'DELETE FROM lan_bundle_entries WHERE room_id = ? AND patient_id = ?'
      ).run(roomId, pid);
      db.prepare('DELETE FROM lan_lab_sets WHERE room_id = ? AND patient_id = ?').run(
        roomId,
        pid
      );
      db.prepare('DELETE FROM lan_lab_set_order WHERE room_id = ? AND patient_id = ?').run(
        roomId,
        pid
      );
    }
  }
}

function commitMetaSql(db, state, roomRevisions) {
  const now = new Date().toISOString();
  const revs = roomRevisions || {};
  db.prepare(
    `INSERT INTO lan_host_meta (
      id, version, team_code_hash, patients_json, rooms_json, room_revisions_json,
      migration_generation, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, 3, ?)
    ON CONFLICT(id) DO UPDATE SET
      version = excluded.version,
      team_code_hash = excluded.team_code_hash,
      patients_json = excluded.patients_json,
      rooms_json = excluded.rooms_json,
      room_revisions_json = excluded.room_revisions_json,
      migration_generation = excluded.migration_generation,
      updated_at = excluded.updated_at`
  ).run(
    Number(state.version || 2),
    state.teamCodeHash,
    JSON.stringify(state.patients || []),
    JSON.stringify(state.rooms || []),
    JSON.stringify(revs),
    now
  );
}

function loadCacheFromSql(db, teamCodeHash) {
  const meta = db.prepare('SELECT * FROM lan_host_meta WHERE id = 1').get();
  if (!meta) return null;

  const roomSyncBundles = {};
  const rooms = JSON.parse(meta.rooms_json || '[]');
  const roomRows = db.prepare('SELECT room_id FROM lan_room_bundles').all();
  const roomIds = new Set([
    ...rooms.map((r) => r && r.id).filter(Boolean),
    ...roomRows.map((r) => r.room_id),
  ]);

  for (const roomId of roomIds) {
    const row = db.prepare('SELECT * FROM lan_room_bundles WHERE room_id = ?').get(roomId);
    if (!row) continue;
    const bundle = {
      revision: Number(row.revision || 0),
      entityVersions: row.entity_versions_json ? JSON.parse(row.entity_versions_json) : {},
      agenda: row.agenda_json ? JSON.parse(row.agenda_json) : [],
      todos: row.todos_json ? JSON.parse(row.todos_json) : {},
      manejo: row.manejo_json ? JSON.parse(row.manejo_json) : null,
      clinicalOps: row.clinical_ops_json ? JSON.parse(row.clinical_ops_json) : null,
      deltaLog: row.delta_log_json ? JSON.parse(row.delta_log_json) : null,
      committedAt: row.committed_at || null,
      audit_log: row.audit_log_json ? JSON.parse(row.audit_log_json) : [],
      uploadedByClientId: row.uploaded_by_client_id || '',
      entities: row.entities_json ? JSON.parse(row.entities_json) : {},
      entries: [],
    };
    const entryRows = db
      .prepare('SELECT * FROM lan_bundle_entries WHERE room_id = ?')
      .all(roomId);
    for (const er of entryRows) {
      let entry;
      try {
        entry = JSON.parse(er.entry_json);
      } catch (_e) {
        entry = { id: er.patient_id };
      }
      if (er.lab_meta_json) {
        try {
          entry.labMeta = JSON.parse(er.lab_meta_json);
        } catch (_e2) {
          entry.labMeta = null;
        }
      }
      if (er.nota_version != null) entry._notaVersion = er.nota_version;
      if (er.indicaciones_version != null) entry._indicacionesVersion = er.indicaciones_version;
      bundle.entries.push(entry);
    }
    roomSyncBundles[roomId] = bundle;
  }

  return {
    version: Number(meta.version || 2),
    teamCodeHash: meta.team_code_hash || teamCodeHash,
    patients: JSON.parse(meta.patients_json || '[]'),
    rooms,
    roomSyncBundles,
  };
}

function loadLabSidecarsIntoCache(db, labSidecarCache) {
  const patients = db
    .prepare('SELECT DISTINCT room_id, patient_id FROM lan_lab_set_order')
    .all();
  for (const row of patients) {
    const sidecar = loadSidecarFromSql(db, row.room_id, row.patient_id);
    labSidecarCache.set(`${row.room_id}:${row.patient_id}`, sidecar);
  }
}

function commitLabUpsertTransaction(
  db,
  { roomId, patientId, set, clientTimestamp, labMeta, revision, entry }
) {
  const sidecar = loadSidecarFromSql(db, roomId, patientId);
  const nextSidecar = upsertLabSidecar(sidecar, set, clientTimestamp);
  const txn = db.transaction(() => {
    writeSidecarToSql(db, roomId, patientId, nextSidecar);
    if (entry) {
      upsertBundleEntryRow(db, roomId, patientId, entry);
    } else {
      db.prepare(
        'UPDATE lan_bundle_entries SET lab_meta_json = ? WHERE room_id = ? AND patient_id = ?'
      ).run(JSON.stringify(labMeta), roomId, patientId);
    }
    db.prepare('UPDATE lan_room_bundles SET revision = ? WHERE room_id = ?').run(
      Number(revision || 0),
      roomId
    );
  });
  txn();
  return nextSidecar;
}

function commitDirtyShardsSql(
  db,
  { cache, dirtyMeta, dirtyRooms, dirtyLabSidecars, labSidecarPayloads }
) {
  const state = typeof cache.get === 'function' ? cache.get() : cache;
  const shards = [];
  let byteLength = 0;

  const labKeys =
    dirtyLabSidecars instanceof Set
      ? [...dirtyLabSidecars]
      : dirtyLabSidecars
        ? [...dirtyLabSidecars]
        : [];
  const payloads =
    labSidecarPayloads && typeof labSidecarPayloads.get === 'function'
      ? labSidecarPayloads
      : null;

  const txn = db.transaction(() => {
    for (const key of labKeys) {
      const parsed = parseLabSidecarKey(key);
      if (!parsed) continue;
      const sidecar = payloads ? payloads.get(key) : null;
      if (!sidecar) continue;
      const bundle = state.roomSyncBundles && state.roomSyncBundles[parsed.roomId];
      if (!bundle) continue;
      const entry = (bundle.entries || []).find(
        (e) => entryPatientId(e) === parsed.patientId
      );
      writeSidecarToSql(db, parsed.roomId, parsed.patientId, sidecar);
      if (entry) {
        upsertBundleEntryRow(db, parsed.roomId, parsed.patientId, entry);
      }
      upsertRoomBundleRow(db, parsed.roomId, bundle);
      byteLength += Buffer.byteLength(JSON.stringify(sidecar), 'utf8');
      shards.push(`labs:${parsed.roomId}:${parsed.patientId}`);
    }

    const roomsToWrite = new Set(dirtyRooms || []);
    for (const roomId of roomsToWrite) {
      const bundle = state.roomSyncBundles && state.roomSyncBundles[roomId];
      if (!bundle) continue;
      commitRoomBundleSql(db, roomId, bundle);
      byteLength += Buffer.byteLength(JSON.stringify(bundle), 'utf8');
      if (!shards.includes(`bundle:${roomId}`)) shards.push(`bundle:${roomId}`);
    }

    if (dirtyMeta) {
      const roomRevisions = {};
      for (const [roomId, bundle] of Object.entries(state.roomSyncBundles || {})) {
        if (bundle) roomRevisions[roomId] = Number(bundle.revision || 0);
      }
      commitMetaSql(db, state, roomRevisions);
      byteLength += Buffer.byteLength(JSON.stringify(state.patients || []), 'utf8');
      byteLength += Buffer.byteLength(JSON.stringify(state.rooms || []), 'utf8');
      shards.push('meta');
    }
  });
  txn();

  return { shards, byteLength };
}

function persistFullCacheSql(db, state, labSidecarCache) {
  const roomRevisions = {};
  const txn = db.transaction(() => {
    for (const [roomId, bundle] of Object.entries(state.roomSyncBundles || {})) {
      if (!bundle) continue;
      commitRoomBundleSql(db, roomId, bundle);
      roomRevisions[roomId] = Number(bundle.revision || 0);
      if (!labSidecarCache) continue;
      for (const entry of bundle.entries || []) {
        const patientId = entryPatientId(entry);
        if (!patientId) continue;
        const key = `${roomId}:${patientId}`;
        const sidecar = labSidecarCache.get(key);
        if (sidecar) writeSidecarToSql(db, roomId, patientId, sidecar);
      }
    }
    commitMetaSql(db, state, roomRevisions);
  });
  txn();
}

async function backupJsonShardsForSqlImport(hostStateDir) {
  const backupRoot = path.join(hostStateDir, '.p3-sqlite-backup');
  if (fs.existsSync(backupRoot)) return backupRoot;
  await fsp.mkdir(backupRoot, { recursive: true });
  const copyDir = async (rel) => {
    const src = path.join(hostStateDir, rel);
    const dest = path.join(backupRoot, rel);
    if (!fs.existsSync(src)) return;
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    if (fs.statSync(src).isDirectory()) {
      await fsp.cp(src, dest, { recursive: true });
    } else {
      await fsp.copyFile(src, dest);
    }
  };
  if (fs.existsSync(metaPath(hostStateDir))) {
    await copyDir('meta.json');
  }
  await copyDir('bundles');
  await copyDir('labs');
  return backupRoot;
}

function importFromJsonShards(db, hostStateDir, teamCodeHash) {
  const state = loadShardedStateSync(hostStateDir, teamCodeHash);
  if (!state) throw new Error('sharded state missing');

  const labSidecarCache = new Map();
  for (const [roomId, bundle] of Object.entries(state.roomSyncBundles || {})) {
    if (!bundle || !Array.isArray(bundle.entries)) continue;
    for (const entry of bundle.entries) {
      const patientId = entryPatientId(entry);
      if (!patientId) continue;
      const sc =
        readLabSidecarSync(hostStateDir, roomId, patientId) ||
        (Array.isArray(entry.labHistory) && entry.labHistory.length
          ? sidecarFromLabHistory(entry.labHistory)
          : null);
      if (sc) labSidecarCache.set(`${roomId}:${patientId}`, sc);
      if (sc && entry.labMeta == null) {
        entry.labMeta = labMetaFromSidecar(sc, 0);
      }
      delete entry.labHistory;
    }
  }

  const txn = db.transaction(() => {
    persistFullCacheSql(db, state, labSidecarCache);
  });
  txn();
  return state;
}

function lanLabSetsSecondaryIndexCount(db) {
  return db
    .prepare(
      `SELECT COUNT(*) AS c FROM sqlite_master
       WHERE type = 'index' AND tbl_name = 'lan_lab_sets'
         AND name NOT LIKE 'sqlite_autoindex_%'`
    )
    .get().c;
}

module.exports = {
  HOST_LAB_SET_CAP,
  dbHasLanHostV15,
  sqlMetaNeedsImport,
  loadCacheFromSql,
  loadLabSidecarsIntoCache,
  loadSidecarFromSql,
  importFromJsonShards,
  backupJsonShardsForSqlImport,
  commitLabUpsertTransaction,
  commitDirtyShardsSql,
  commitMetaSql,
  commitRoomBundleSql,
  persistFullCacheSql,
  lanLabSetsSecondaryIndexCount,
};
