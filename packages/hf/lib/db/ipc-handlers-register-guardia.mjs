import {
  resolveBootstrapClinicalUser,
  upsertRotationCycle,
  getActiveRotationCycle,
  archiveRotationAndTeams,
  fetchIncomingAssignments,
  getClinicalScopeContext,
} from './clinical-access-db.mjs';
import { stampRotationNuevaAt } from './clinical-ops-sync.mjs';
import { bindIpcHandler } from './ipc-handlers-bind.mjs';

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
function registerDbGuardiaReadHandlers(ctx) {
  const { ipcMain, dbManager, getClientId } = ctx;

  bindIpcHandler(ipcMain, 'db:clinical-access-bootstrap', async (payload) => {
    const result = await dbManager.withTransaction((db, { audit }) => {
      const user = resolveBootstrapClinicalUser(db, {
        clientId: String(payload.clientId || getClientId()),
        rank: String(payload.rank || 'Team'),
        preferredUserId: payload.preferredUserId ? String(payload.preferredUserId) : undefined,
        preferredUsername: payload.preferredUsername
          ? String(payload.preferredUsername)
          : undefined,
      });
      audit(getClientId(), 'clinical.access.bootstrap', { userId: user.userId });
      return { user };
    });
    return { ok: true, ...result };
  });

  bindIpcHandler(ipcMain, 'db:clinical-scope-context', async (payload) => {
    const context = await dbManager.withTransaction((db) =>
      getClinicalScopeContext(db, payload.userId ? String(payload.userId) : undefined)
    );
    return { ok: true, context };
  });
}

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
function registerDbGuardiaRotationHandlers(ctx) {
  const { ipcMain, dbManager, getClientId } = ctx;

  bindIpcHandler(ipcMain, 'db:rotation-cycle-get', async () => {
    const cycle = await dbManager.withTransaction((db) => getActiveRotationCycle(db));
    return { ok: true, cycle: cycle ?? null };
  });

  bindIpcHandler(ipcMain, 'db:rotation-cycle-upsert', async (payload) => {
    const cycle = await dbManager.withTransaction((db) =>
      upsertRotationCycle(db, {
        monthEndAt: String(payload.monthEndAt || ''),
        effectiveAt: String(payload.effectiveAt || ''),
        previewDays: payload.previewDays ?? 2,
        createdBy: payload.createdBy ? String(payload.createdBy) : undefined,
      })
    );
    return { ok: true, cycle };
  });

  bindIpcHandler(ipcMain, 'db:rotation-nueva', async (payload) => {
    await dbManager.withTransaction((db, { audit }) => {
      const now = new Date().toISOString();
      archiveRotationAndTeams(db);
      stampRotationNuevaAt(db, now);
      if (payload.userId) {
        audit(getClientId(), 'rotation.nueva', { userId: String(payload.userId) });
      }
    });
    return { ok: true };
  });

  bindIpcHandler(ipcMain, 'db:rotation-incoming-assignments', async () => {
    const assignments = await dbManager.withTransaction((db) =>
      fetchIncomingAssignments(db, new Date().toISOString())
    );
    return { ok: true, assignments };
  });
}

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
export function registerDbGuardiaHandlers(ctx) {
  registerDbGuardiaReadHandlers(ctx);
  registerDbGuardiaRotationHandlers(ctx);
}
