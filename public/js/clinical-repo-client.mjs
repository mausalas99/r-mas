/**
 * Renderer client for clinical-repo IPC commands.
 */

import { _applyRepoSnapshot } from './clinical-read-model.mjs';

/** Snapshot fields echoed from clinical-repo command success for read-model apply. */
const SNAPSHOT_KEYS = [
  'patients',
  'notes',
  'indicaciones',
  'labHistory',
  'medRecetaByPatient',
  'medPharmProfileByPatient',
  'recetaHuByPatient',
  'listadoProblemas',
  'vpoByPatient',
];

/**
 * @returns {boolean}
 */
export function canExecuteClinicalCommand() {
  return !!(
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.dbClinicalCommand === 'function'
  );
}

/**
 * @returns {boolean}
 */
export function canProjectClinicalChanges() {
  return !!(
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.dbClinicalProjectUnsynced === 'function' &&
    typeof window.electronAPI.dbClinicalMarkSynced === 'function'
  );
}

/**
 * @param {Record<string, unknown>} res
 * @returns {Record<string, unknown>}
 */
function pickSnapshotFields(res) {
  /** @type {Record<string, unknown>} */
  const snapshot = {};
  for (const key of SNAPSHOT_KEYS) {
    if (res[key] === undefined) continue;
    snapshot[key] = res[key];
  }
  return snapshot;
}

/**
 * @param {{ type: string } & Record<string, unknown>} command
 * @param {{ actorId?: string, source?: string, echoSnapshot?: boolean }} [meta]
 * @returns {Promise<{ ok: boolean, error?: string, changedKeys?: string[], changeId?: string|null } & Record<string, unknown>>}
 */
export async function executeClinicalCommand(command, meta = {}) {
  if (!canExecuteClinicalCommand()) {
    return { ok: false, error: 'ipc_unavailable' };
  }
  const res = await window.electronAPI.dbClinicalCommand({
    command,
    meta: {
      actorId: meta.actorId,
      source: meta.source || 'ui',
      echoSnapshot: meta.echoSnapshot,
    },
  });
  if (!res || typeof res !== 'object') {
    return { ok: false, error: 'command_failed' };
  }
  if (res.ok === false) {
    return { ok: false, error: String(res.error || res.code || 'command_failed') };
  }
  const out = {
    ok: true,
    changedKeys: Array.isArray(res.changedKeys) ? res.changedKeys : [],
    changeId: res.changeId != null ? String(res.changeId) : null,
  };
  if (meta.echoSnapshot !== false) {
    const snapshot = pickSnapshotFields(res);
    if (Object.keys(snapshot).length) {
      _applyRepoSnapshot(snapshot, { source: 'clinical-command' });
      Object.assign(out, snapshot);
    }
  }
  return out;
}

/**
 * @param {{ actorId?: string, limit?: number, changeIds?: string[] }} [opts]
 * @returns {Promise<{ ok: boolean, error?: string, mutations?: { clientMutationId: string, ops: unknown[] }[], skipIds?: string[] }>}
 */
export async function projectUnsyncedClinicalChanges(opts = {}) {
  if (!canProjectClinicalChanges()) {
    return { ok: false, error: 'ipc_unavailable' };
  }
  const res = await window.electronAPI.dbClinicalProjectUnsynced({
    actorId: opts.actorId,
    limit: opts.limit,
    changeIds: Array.isArray(opts.changeIds) ? opts.changeIds : undefined,
  });
  if (!res || typeof res !== 'object' || res.ok === false) {
    return { ok: false, error: String(res?.error || 'project_failed') };
  }
  return {
    ok: true,
    mutations: Array.isArray(res.mutations) ? res.mutations : [],
    skipIds: Array.isArray(res.skipIds) ? res.skipIds : [],
  };
}

/**
 * @param {{ changeIds: string[], syncedAt?: string }} payload
 */
export async function markClinicalChangesSynced(payload) {
  if (!canProjectClinicalChanges()) {
    return { ok: false, error: 'ipc_unavailable' };
  }
  const res = await window.electronAPI.dbClinicalMarkSynced({
    changeIds: Array.isArray(payload?.changeIds) ? payload.changeIds : [],
    syncedAt: payload?.syncedAt,
  });
  if (!res || typeof res !== 'object' || res.ok === false) {
    return { ok: false, error: String(res?.error || 'mark_failed') };
  }
  return { ok: true, marked: Number(res.marked) || 0 };
}
