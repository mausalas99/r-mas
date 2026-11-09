import { listEquiposSessions, listEquiposTeamReportsAll } from '../equipos/equipos-db.mjs';
import { bindIpcHandler } from './ipc-handlers-bind.mjs';
import { assertEquiposAdmin } from './ipc-handlers-register-equipos-access.mjs';

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
export function registerDbEquiposBoardHandlers(ctx) {
  const { ipcMain, dbManager } = ctx;

  bindIpcHandler(ipcMain, 'db:equipos-reports', async (payload) => {
    const data = await dbManager.withTransaction((db) => {
      if (payload?.userId) assertEquiposAdmin(db, payload.userId);
      return {
        sessions: listEquiposSessions(db, 100),
        reports: listEquiposTeamReportsAll(db, 100),
      };
    });
    return { ok: true, ...data };
  });
}
