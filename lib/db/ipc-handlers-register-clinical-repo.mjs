import { bindIpcHandler } from './ipc-handlers-bind.mjs';
import { executeClinicalCommand } from '../clinical-repo/index.mjs';

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
    };
  });
}
