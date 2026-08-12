import { loadClinicalBlobValues, loadPatientsBlob } from '../adapters/sqlcipher.mjs';
import {
  listUnsyncedClinicalChanges,
  markClinicalChangesSynced,
} from '../change-log.mjs';
import { encodeClinicalChangeOps } from './op-encoder.mjs';
import { parseBlobKeysAndRegistro } from '../change-log.mjs';

/**
 * @param {object} row
 * @param {{
 *   patients: object[],
 *   loadBlobs: (keys: string[]) => Record<string, unknown>,
 *   actorFallback: string,
 *   nowIso: string,
 * }} ctx
 * @returns {{ kind: 'mutation', item: { clientMutationId: string, ops: unknown[] } } | { kind: 'skip', changeId: string }}
 */
function projectOneChange(row, ctx) {
  const changeId = String(row.change_id || '');
  const origin = String(row.origin || 'ui').trim() || 'ui';
  if (origin === 'sync-apply') {
    return { kind: 'skip', changeId };
  }

  const commandType = String(row.command_type || '');
  const { blobKeys, registro } = parseBlobKeysAndRegistro(row.blob_keys);
  /** @type {Record<string, unknown>} */
  let blobs = {};
  if (commandType === 'clinical.persistSnapshot' && blobKeys.length) {
    blobs = ctx.loadBlobs(blobKeys);
  }

  const ops = encodeClinicalChangeOps({
    commandType,
    patientId: row.patient_id,
    patients: ctx.patients,
    blobKeys,
    blobs,
    actorId: row.actor_id || ctx.actorFallback,
    fallbackUpdatedAt: String(row.created_at || ctx.nowIso),
    registro: registro || null,
  });
  if (!ops.length) {
    return { kind: 'skip', changeId };
  }
  return {
    kind: 'mutation',
    item: { clientMutationId: changeId, ops },
  };
}

/**
 * Build outbox mutations from unsynced change_log rows (does not mark synced).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   actorId?: string,
 *   nowIso?: string,
 *   limit?: number,
 * }} [deps]
 */
export function collectUnsyncedClinicalProjections(db, deps = {}) {
  const nowIso = String(deps?.nowIso || new Date().toISOString());
  const actorFallback = String(deps?.actorId || '').trim() || 'local';
  const rows = listUnsyncedClinicalChanges(db, deps?.limit);
  /** @type {{ clientMutationId: string, ops: unknown[] }[]} */
  const mutations = [];
  /** @type {string[]} */
  const skipIds = [];

  if (!rows.length) {
    return { ok: true, mutations, skipIds };
  }

  const patients = loadPatientsBlob(db);
  const loadBlobs = (keys) => loadClinicalBlobValues(db, keys);
  for (const row of rows) {
    const result = projectOneChange(row, {
      patients,
      loadBlobs,
      actorFallback,
      nowIso,
    });
    if (result.kind === 'skip') skipIds.push(result.changeId);
    else mutations.push(result.item);
  }

  return { ok: true, mutations, skipIds };
}

/**
 * Drain unsynced clinical_change_log rows → outbox enqueue callback.
 * Idempotent per change_id (clientMutationId === change_id).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   enqueue: (item: { clientMutationId: string, ops: unknown[] }) => void,
 *   actorId?: string,
 *   nowIso?: string,
 *   limit?: number,
 *   markSynced?: boolean,
 * }} deps
 */
export function projectUnsyncedClinicalChanges(db, deps) {
  const nowIso = String(deps?.nowIso || new Date().toISOString());
  const collected = collectUnsyncedClinicalProjections(db, {
    actorId: deps?.actorId,
    nowIso,
    limit: deps?.limit,
  });

  for (const item of collected.mutations) {
    deps.enqueue(item);
  }

  const toMark = [
    ...collected.mutations.map((m) => m.clientMutationId),
    ...collected.skipIds,
  ];
  if (deps?.markSynced !== false && toMark.length) {
    markClinicalChangesSynced(db, toMark, nowIso);
  }

  return {
    ok: true,
    projected: collected.mutations.length,
    skipped: collected.skipIds.length,
    mutations: collected.mutations,
    skipIds: collected.skipIds,
  };
}
