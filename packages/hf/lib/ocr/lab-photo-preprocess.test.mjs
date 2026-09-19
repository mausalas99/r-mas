import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Jimp } from 'jimp';
import { preprocessImageBuffer } from './lab-photo-preprocess.mjs';

async function solidColorPng(width, height, hex) {
  var img = new Jimp({ width: width, height: height, color: hex });
  return img.getBuffer('image/png');
}

test('preprocessImageBuffer greyscales the image', async () => {
  var input = await solidColorPng(2000, 100, 0xff3366ff);
  var outBuffer = await preprocessImageBuffer(input);
  var out = await Jimp.read(outBuffer);
  var data = out.bitmap.data;
  assert.equal(data[0], data[1]);
  assert.equal(data[1], data[2]);
});

test('preprocessImageBuffer upscales images narrower than the width threshold', async () => {
  var input = await solidColorPng(900, 100, 0x808080ff);
  var outBuffer = await preprocessImageBuffer(input);
  var out = await Jimp.read(outBuffer);
  assert.equal(out.bitmap.width, 1800);
});

test('preprocessImageBuffer does not upscale images already at or above the threshold', async () => {
  var input = await solidColorPng(2000, 100, 0x808080ff);
  var outBuffer = await preprocessImageBuffer(input);
  var out = await Jimp.read(outBuffer);
  assert.equal(out.bitmap.width, 2000);
});
