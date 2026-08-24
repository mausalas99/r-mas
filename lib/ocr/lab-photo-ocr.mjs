/** Local OCR (Spanish) for a photographed outside-lab report. No network call. */
import { createWorker } from 'tesseract.js';

/**
 * @param {Buffer} buffer
 * @param {{ createWorker?: typeof createWorker }} [opts] injectable for tests
 * @returns {Promise<{ text: string, confidence: number }>}
 */
export async function ocrLabPhoto(buffer, opts) {
  var options = opts && typeof opts === 'object' ? opts : {};
  var createWorkerFn = options.createWorker || createWorker;
  var worker = await createWorkerFn('spa');
  try {
    var result = await worker.recognize(buffer);
    var data = (result && result.data) || {};
    return {
      text: String(data.text || ''),
      confidence: typeof data.confidence === 'number' ? data.confidence : 0,
    };
  } finally {
    await worker.terminate();
  }
}
