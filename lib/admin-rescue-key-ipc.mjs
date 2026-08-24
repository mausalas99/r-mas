import { bindIpcHandler } from './db/ipc-handlers-bind.mjs';
import { getAdminPublicKeyInfo } from './admin-rescue-key.mjs';

/**
 * Exposes just the admin rescue PUBLIC key to the renderer — needed so the
 * renderer can wrap a room DEK against it when creating/joining a room. The
 * private key never crosses this boundary.
 * @param {{ ipcMain: import('electron').IpcMain, app: import('electron').App, safeStorage: object }} deps
 */
export function registerAdminRescueKeyIpcHandlers({ ipcMain, app, safeStorage }) {
  bindIpcHandler(ipcMain, 'admin-rescue-key:get-public-info', async () => {
    const info = await getAdminPublicKeyInfo({ userDataPath: app.getPath('userData'), safeStorage });
    return { ok: true, ...info };
  });
}
