/** Local OCR (Spanish) for a photographed outside-lab report. No network call. */
import { createWorker, PSM } from 'tesseract.js';
import { preprocessImageBuffer } from './lab-photo-preprocess.mjs';

var WHITELIST =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚÑáéíóúñ0123456789.,:/-<>≤≥%()*';

/**
 * @param {Buffer} buffer
 * @param {{ createWorker?: typeof createWorker, preprocessImageBuffer?: typeof preprocessImageBuffer, langPath?: string }} [opts] injectable for tests
 * @returns {Promise<{ text: string, confidence: number }>}
 */
export async function ocrLabPhoto(buffer, opts) {
  var options = opts && typeof opts === 'object' ? opts : {};
  var createWorkerFn = options.createWorker || createWorker;
  var preprocessFn = options.preprocessImageBuffer || preprocessImageBuffer;
  var workerOptions = options.langPath ? { langPath: options.langPath, gzip: false } : undefined;
  var worker = await createWorkerFn('spa', 1, workerOptions);
  try {
    var cleanedBuffer = await preprocessFn(buffer);
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: WHITELIST,
    });
    var result = await worker.recognize(cleanedBuffer);
    var data = (result && result.data) || {};
    return {
      text: String(data.text || ''),
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
    };
  } finally {
    await worker.terminate();
  }
}
