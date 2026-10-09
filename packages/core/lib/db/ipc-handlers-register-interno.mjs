import {
  getClinicalProfile,
  listSalaInternoAccess,
  rotateSalaInternoToken,
  setSalaInternoActive,
} from './clinical-access-db.mjs';
import { canManageInternoQr } from './clinical-privileges.mjs';
import { bindIpcHandler } from './ipc-handlers-bind.mjs';

function assertInternoQrAccess(db, userId) {
  const profile = getClinicalProfile(db, String(userId || ''));
  if (!canManageInternoQr(profile)) {
    throw new Error('Sin permisos para gestionar QR de internos.');
  }
  return profile;
}

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
function registerDbInternoAccessHandlers(ctx) {
  const { ipcMain, dbManager, getClientId } = ctx;

  bindIpcHandler(ipcMain, 'db:interno-access-list', async (payload) => {
    const rows = await dbManager.withTransaction((db) => {
      assertInternoQrAccess(db, payload.userId);
      return listSalaInternoAccess(db);
    });
    return { ok: true, rows };
  });

  bindIpcHandler(ipcMain, 'db:interno-access-rotate', async (payload) => {
    const row = await dbManager.withTransaction((db, { audit }) => {
      const userId = String(payload.userId || '');
      assertInternoQrAccess(db, userId);
      const out = rotateSalaInternoToken(db, String(payload.sala || ''), userId);
      audit(getClientId(), 'interno.token.rotate', { sala: out?.sala, userId });
      return out;
    });
    return { ok: true, row };
  });

  bindIpcHandler(ipcMain, 'db:interno-access-set-active', async (payload) => {
    const row = await dbManager.withTransaction((db, { audit }) => {
      const userId = String(payload.userId || '');
      assertInternoQrAccess(db, userId);
      const out = setSalaInternoActive(db, String(payload.sala || ''), !!payload.active);
      audit(getClientId(), 'interno.access.toggle', {
        sala: out?.sala,
        active: !!payload.active,
        userId,
      });
      return out;
    });
    return { ok: true, row };
  });
}

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
export function registerDbInternoHandlers(ctx) {
  registerDbInternoAccessHandlers(ctx);
}
