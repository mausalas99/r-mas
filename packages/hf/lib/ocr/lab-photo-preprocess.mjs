/** Image cleanup before OCR: greyscale, contrast boost, upscale if small. No native deps (jimp). */
import { Jimp } from 'jimp';

// ponytail: fixed pixel threshold, not adaptive to detected text size — good enough for phone photos of a full page.
const MIN_WIDTH = 1800;

/**
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function preprocessImageBuffer(buffer) {
  var image = await Jimp.read(buffer);
  image.greyscale();
  image.contrast(0.3);
  if (image.bitmap.width < MIN_WIDTH) {
    image.resize({ w: MIN_WIDTH });
  }
  return image.getBuffer('image/png');
}
