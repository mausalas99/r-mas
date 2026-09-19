/**
 * Main-process-only compression for cardio image attachments (Rx tórax,
 * POCUS, EKG) — same jimp dependency and buffer-in/buffer-out shape as
 * `lib/ocr/lab-photo-preprocess.mjs`. Not imported by renderer code.
 */
import { Jimp } from 'jimp';
import { MAX_IMAGE_BYTES } from './cardio-images.mjs';

var MAX_LONG_EDGE = 1600;
var QUALITY_STEPS = [72, 55, 40];

/**
 * @param {Buffer} buffer
 * @returns {Promise<{buffer: Buffer, mimeType: string, width: number, height: number}>}
 */
export async function compressCardioImage(buffer) {
  var image = await Jimp.read(buffer);
  var longEdge = Math.max(image.bitmap.width, image.bitmap.height);
  if (longEdge > MAX_LONG_EDGE) {
    var scale = MAX_LONG_EDGE / longEdge;
    image.resize({ w: Math.round(image.bitmap.width * scale), h: Math.round(image.bitmap.height * scale) });
  }
  var out = null;
  for (var i = 0; i < QUALITY_STEPS.length; i++) {
    out = await image.getBuffer('image/jpeg', { quality: QUALITY_STEPS[i] });
    if (out.length <= MAX_IMAGE_BYTES) break;
  }
  return { buffer: out, mimeType: 'image/jpeg', width: image.bitmap.width, height: image.bitmap.height };
}
