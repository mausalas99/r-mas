import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { measureTrackedSize } from './tracked-size.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('measureTrackedSize counts tracked text only', () => {
  const size = measureTrackedSize(ROOT);
  assert.ok(size.trackedLoc > 100000);
  assert.ok(size.moduleCount > 100);
  assert.ok(size.fileCount > size.moduleCount);
});
