import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { measureTrackedSize } from './tracked-size.mjs';
import { GATE_EXCLUDED_RE } from './constants.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

test('measureTrackedSize counts tracked text only', () => {
  const size = measureTrackedSize(ROOT);
  assert.ok(size.trackedLoc > 100000);
  assert.ok(size.moduleCount > 100);
  assert.ok(size.fileCount > size.moduleCount);
});

test('measureTrackedSize skips the paths the gate excludes', () => {
  const tracked = execSync('git ls-files -s', { cwd: ROOT, encoding: 'utf8' })
    .trim()
    .split('\n')
    .map((line) => line.match(/^(\d+)\s+\S+\s+\S+\s+(.+)$/))
    .filter((m) => m && m[1] !== '120000')
    .map((m) => m[2]);
  const excluded = tracked.filter((rel) => GATE_EXCLUDED_RE.test(rel));
  assert.ok(excluded.length > 0, 'nothing matched GATE_EXCLUDED_RE — the gate is unchanged');
  assert.equal(measureTrackedSize(ROOT).fileCount, tracked.length - excluded.length);
});
