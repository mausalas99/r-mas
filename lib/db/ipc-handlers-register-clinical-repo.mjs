import { bindIpcHandler } from './ipc-handlers-bind.mjs';
import { executeClinicalCommand } from '../clinical-repo/index.mjs';
import { collectUnsyncedClinicalProjections } from '../clinical-repo/sync/projector.mjs';
import { markClinicalChangesSynced } from '../clinical-repo/change-log.mjs';
import { CLINICAL_PERSIST_BLOB_KEYS } from '../clinical-repo/transforms/persist-snapshot.mjs';

/**
 * @param {Record<string, unknown>} result
 * @returns {Record<string, unknown>}
 */
function snapshotFieldsFromResult(result) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of CLINICAL_PERSIST_BLOB_KEYS) {
    if (result[key] === undefined) continue;
    out[key] = result[key];
  }
  return out;
}

/**
 * @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx
 */
export function registerDbClinicalRepoHandlers(ctx) {
  const { ipcMain, dbManager, getClientId } = ctx;

  bindIpcHandler(ipcMain, 'db:clinical-command', async (payload) => {
    const command = payload?.command && typeof payload.command === 'object' ? payload.command : null;
    if (!command) {
      return { ok: false, error: 'invalid_command' };
    }
    const meta =
      payload?.meta && typeof payload.meta === 'object'
        ? /** @type {{ actorId?: string, source?: string }} */ (payload.meta)
        : {};
    const result = await dbManager.withTransaction((db, { audit }) => {
      const out = executeClinicalCommand(db, command, meta);
      if (out && out.ok) {
        audit(getClientId(), 'clinical.command', {
          commandType: String(command.type || ''),
          changeId: out.changeId || null,
          changedKeys: out.changedKeys || [],
          source: meta.source || 'ui',
          patientId: command.patientId != null ? String(command.patientId) : null,
        });
      }
      return out;
    });
    if (!result || typeof result !== 'object') {
      return { ok: false, error: 'command_failed' };
    }
    if (!result.ok) {
      return { ok: false, error: result.error || 'command_failed' };
    }
    return {
      ok: true,
      changedKeys: result.changedKeys || [],
      changeId: result.changeId || null,
      ...snapshotFieldsFromResult(result),
    };
  });

  bindIpcHandler(ipcMain, 'db:clinical-project-unsynced', async (payload) => {
    const actorId =
      payload && typeof payload === 'object' && payload.actorId != null
        ? String(payload.actorId)
        : undefined;
    const limit =
      payload && typeof payload === 'object' && payload.limit != null
        ? Number(payload.limit)
        : undefined;
    const result = await dbManager.withTransaction((db) => {
      return collectUnsyncedClinicalProjections(db, { actorId, limit });
    });
    return {
      ok: true,
      mutations: Array.isArray(result?.mutations) ? result.mutations : [],
      skipIds: Array.isArray(result?.skipIds) ? result.skipIds : [],
    };
  });

  bindIpcHandler(ipcMain, 'db:clinical-mark-synced', async (payload) => {
    const changeIds = Array.isArray(payload?.changeIds) ? payload.changeIds : [];
    const syncedAt =
      payload?.syncedAt != null && String(payload.syncedAt).trim()
        ? String(payload.syncedAt).trim()
        : new Date().toISOString();
    const marked = await dbManager.withTransaction((db) => {
      return markClinicalChangesSynced(db, changeIds, syncedAt);
    });
    return { ok: true, marked: Number(marked) || 0 };
  });
}
