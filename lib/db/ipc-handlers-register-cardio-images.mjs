import { bindIpcHandler } from './ipc-handlers-bind.mjs';
import {
  insertCardioImage,
  listCardioImages,
  listCardioImagesForVisit,
  getCardioImage,
  deleteCardioImage,
  sumCardioImageBytes,
} from './cardio-images-db.mjs';
import { newCardioImageId, CARDIO_IMAGE_KINDS } from '../cardio/cardio-images.mjs';

/** @param {import('./ipc-handlers-context.mjs').IpcHandlerContext} ctx */
export function registerCardioImageHandlers(ctx) {
  const { ipcMain, dbManager, dialog, getClientId } = ctx;

  bindIpcHandler(ipcMain, 'cardio-image-attach', async (payload) => {
    const patientId = String(payload?.patientId || '').trim();
    const visitModule = String(payload?.visitModule || '').trim();
    const visitDate = String(payload?.visitDate || '').trim();
    const kind = String(payload?.kind || '').trim();
    if (!patientId || !visitModule || !visitDate || CARDIO_IMAGE_KINDS.indexOf(kind) < 0) {
      return { ok: false, error: 'Datos de imagen incompletos.' };
    }
    const result = await dialog.showOpenDialog({
      title: 'Elegir imagen',
      properties: ['openFile'],
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg'] }],
    });
    if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };
    try {
      const fs = await import('node:fs');
      const buffer = await fs.promises.readFile(result.filePaths[0]);
      const { compressCardioImage } = await import('../cardio/cardio-image-compress.mjs');
      const compressed = await compressCardioImage(buffer);
      const record = {
        imageId: newCardioImageId(),
        patientId,
        kind,
        visitModule,
        visitDate,
        mimeType: compressed.mimeType,
        base64: compressed.buffer.toString('base64'),
        sizeBytes: compressed.buffer.length,
        width: compressed.width,
        height: compressed.height,
        createdAt: new Date().toISOString(),
      };
      await dbManager.withTransaction((db, { audit }) => {
        insertCardioImage(db, record);
        audit(getClientId(), 'cardio.image.attach', { patientId, imageId: record.imageId, kind });
      });
      return { ok: true, image: record };
    } catch (e) {
      return { ok: false, error: (e && e.message) || 'No se pudo guardar la imagen.' };
    }
  });

  bindIpcHandler(ipcMain, 'cardio-image-list', async (payload) => {
    const patientId = String(payload?.patientId || '').trim();
    if (!patientId) return { ok: true, images: [] };
    const images = await dbManager.withTransaction((db) => listCardioImages(db, patientId));
    return { ok: true, images };
  });

  bindIpcHandler(ipcMain, 'cardio-image-list-visit', async (payload) => {
    const patientId = String(payload?.patientId || '').trim();
    const visitModule = String(payload?.visitModule || '').trim();
    const visitDate = String(payload?.visitDate || '').trim();
    if (!patientId || !visitModule || !visitDate) return { ok: true, images: [] };
    const images = await dbManager.withTransaction((db) =>
      listCardioImagesForVisit(db, patientId, visitModule, visitDate)
    );
    return { ok: true, images };
  });

  bindIpcHandler(ipcMain, 'cardio-image-get', async (payload) => {
    const imageId = String(payload?.imageId || '').trim();
    if (!imageId) return { ok: false, error: 'imageId requerido.' };
    const image = await dbManager.withTransaction((db) => getCardioImage(db, imageId));
    if (!image) return { ok: false, error: 'Imagen no encontrada.' };
    return { ok: true, image };
  });

  bindIpcHandler(ipcMain, 'cardio-image-delete', async (payload) => {
    const imageId = String(payload?.imageId || '').trim();
    if (!imageId) return { ok: false, error: 'imageId requerido.' };
    const deleted = await dbManager.withTransaction((db, { audit }) => {
      const ok = deleteCardioImage(db, imageId);
      if (ok) audit(getClientId(), 'cardio.image.delete', { imageId });
      return ok;
    });
    return { ok: deleted };
  });

  bindIpcHandler(ipcMain, 'cardio-image-usage', async (payload) => {
    const patientId = String(payload?.patientId || '').trim();
    if (!patientId) return { ok: true, bytes: 0 };
    const bytes = await dbManager.withTransaction((db) => sumCardioImageBytes(db, patientId));
    return { ok: true, bytes };
  });
}
