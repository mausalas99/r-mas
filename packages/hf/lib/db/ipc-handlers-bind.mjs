import { ipcError } from './ipc-handlers-shared.mjs';

/**
 * @param {import('electron').IpcMain} ipcMain
 * @param {string} channel
 * @param {(payload: Record<string, unknown>) => Promise<Record<string, unknown>>} handler
 */
export function bindIpcHandler(ipcMain, channel, handler) {
  ipcMain.handle(channel, async (_e, payload = {}) => {
    try {
      return await handler(payload);
    } catch (err) {
      return ipcError(err);
    }
  });
}
