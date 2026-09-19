import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Jimp } from 'jimp';
import { compressCardioImage } from './cardio-image-compress.mjs';
import { MAX_IMAGE_BYTES } from './cardio-images.mjs';

test('compressCardioImage downsizes a large image to a JPEG under the byte cap', async () => {
  var big = new Jimp({ width: 3000, height: 2000, color: 0xff0000ff });
  var buffer = await big.getBuffer('image/png');
  var result = await compressCardioImage(buffer);
  assert.equal(result.mimeType, 'image/jpeg');
  assert.ok(result.buffer.length <= MAX_IMAGE_BYTES, 'stays under the hard cap');
  assert.ok(result.width <= 1600 && result.height <= 1600, 'long edge capped at 1600');
});

test('compressCardioImage leaves a small image at its original size', async () => {
  var small = new Jimp({ width: 200, height: 150, color: 0x00ff00ff });
  var buffer = await small.getBuffer('image/png');
  var result = await compressCardioImage(buffer);
  assert.equal(result.width, 200);
  assert.equal(result.height, 150);
});
