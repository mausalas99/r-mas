import { SyncError } from './errors.js';

/**
 * Per-patient split of the room core (schema 013). Pure functions, no D1.
 *
 * Shard (one per patient id): `{ entry?, tombstone?, versions }` where
 * `versions` holds every `entityVersions` key scoped to that patient:
 * `entries/{id}`, `entries/{id}/…`, `labSidecars/{id}/…`, `tombstones/{id}`.
 * Core keeps everything else (todos, agenda, clinicalOps, room-level versions,
 * unknown keys) plus `entryOrder` and the `patientsSharded` marker.
 * `labSidecars` is not handled here — it already has its own shard tables.
 */

const PATIENT_VERSION_KEY = /^(?:entries|labSidecars|tombstones)\/([^/]+)(?:\/|$)/;

/** @param {Map<string, {entry?: object, tombstone?: object, versions: Record<string, unknown>}>} shards @param {string} pid */
function shardFor(shards, pid) {
  let shard = shards.get(pid);
  if (!shard) {
    shard = { versions: {} };
    shards.set(pid, shard);
  }
  return shard;
}

/**
 * @param {import('./lww.js').RoomSyncState} state
 * @returns {{ core: object, shards: Map<string, {entry?: object, tombstone?: object, versions: Record<string, unknown>}> }}
 */
export function splitCoreState(state) {
  // eslint-disable-next-line no-unused-vars
  const { entries, tombstones, entityVersions, labSidecars: _labs, ...rest } = state;
  const shards = new Map();
  const entryOrder = [];
  const looseEntries = [];

  for (const entry of entries || []) {
    const id = entry && entry.id;
    if (!id || shards.get(id)?.entry) {
      // No id, or a duplicate id: keep it whole in core so nothing is dropped.
      looseEntries.push(entry);
      continue;
    }
    shardFor(shards, id).entry = entry;
    entryOrder.push(id);
  }
  for (const [pid, meta] of Object.entries(tombstones || {})) {
    shardFor(shards, pid).tombstone = meta;
  }

  const coreVersions = {};
  for (const [key, ver] of Object.entries(entityVersions || {})) {
    const m = PATIENT_VERSION_KEY.exec(key);
    if (m) shardFor(shards, m[1]).versions[key] = ver;
    else coreVersions[key] = ver;
  }

  const core = { ...rest, entityVersions: coreVersions, entryOrder, patientsSharded: 1 };
  if (looseEntries.length) core.looseEntries = looseEntries;
  return { core, shards };
}

/**
 * Which rows a commit must write. Compares whole-shard JSON with what was
 * stored at load time instead of reading op paths: one op can change more than
 * its own patient (`applyTombstone` also touches `todos`/`agenda`), and a
 * path-derived write set would miss that.
 * No baseline (legacy fat core, or a caller that did not pass one) means a full
 * split: every shard is written and stale rows for the room are cleared first.
 * @param {import('./lww.js').RoomSyncState} nextState
 * @param {{ coreJson: string, shardJson: Map<string, string> } | null | undefined} baseline
 * @returns {{ core: object, shards: Map<string, object>, changed: Map<string, object>, removed: string[], coreChanged: boolean, firstSplit: boolean }}
 */
export function planShardWrites(nextState, baseline) {
  const { core, shards } = splitCoreState(nextState);
  if (!baseline) {
    return { core, shards, changed: new Map(shards), removed: [], coreChanged: true, firstSplit: true };
  }
  const changed = new Map();
  for (const [pid, shard] of shards) {
    if (baseline.shardJson.get(pid) !== JSON.stringify(shard)) changed.set(pid, shard);
  }
  const removed = [...baseline.shardJson.keys()].filter((pid) => !shards.has(pid));
  const coreChanged = JSON.stringify(core) !== baseline.coreJson;
  return { core, shards, changed, removed, coreChanged, firstSplit: false };
}

/**
 * Inverse of `splitCoreState`. Fails loudly if a listed patient has no shard
 * row or no entry: silently returning fewer patients would read as "the
 * others were deleted" to every client (same class as the 2026-09-17 note wipe).
 * @param {object} core @param {Map<string, {entry?: object, tombstone?: object, versions?: Record<string, unknown>}>} shards
 * @returns {import('./lww.js').RoomSyncState}
 */
export function joinCoreState(core, shards) {
  // eslint-disable-next-line no-unused-vars
  const { entryOrder, patientsSharded: _marker, looseEntries, entityVersions, ...rest } = core;
  const entries = [];
  for (const pid of entryOrder || []) {
    const entry = shards.get(pid)?.entry;
    if (!entry) {
      throw new SyncError('error', `Falta el paciente ${pid} en el estado de la sala.`);
    }
    entries.push(entry);
  }
  for (const entry of looseEntries || []) entries.push(entry);

  const tombstones = {};
  const versions = { ...(entityVersions || {}) };
  for (const [pid, shard] of shards) {
    if (shard.tombstone) tombstones[pid] = shard.tombstone;
    Object.assign(versions, shard.versions || {});
  }
  return { ...rest, entries, entityVersions: versions, tombstones };
}
