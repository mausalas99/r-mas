import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { measureTrackedSize, MODULE_RE } from './tracked-size.mjs';
import { SIZE_GATE_EXCLUDED_RE } from './constants.mjs';

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
  const excluded = tracked.filter((rel) => SIZE_GATE_EXCLUDED_RE.test(rel));
  assert.ok(excluded.length > 0, 'nothing matched SIZE_GATE_EXCLUDED_RE — the gate is unchanged');
  assert.equal(measureTrackedSize(ROOT).fileCount, tracked.length - excluded.length);
});

test('MODULE_RE recognizes public/js and lib files in every workspace package, not just core', () => {
  // SIZE_GATE_EXCLUDED_RE now counts packages/hf and packages/neumo, but
  // MODULE_RE must still be correct for them independently -- widening the
  // exclusion alone (without this) would silently undercount their module
  // totals, the exact blind spot this test guards.
  for (const pkg of ['core', 'shared-signing', 'hf', 'neumo']) {
    assert.ok(MODULE_RE.test(`packages/${pkg}/public/js/foo.mjs`), `${pkg}/public/js not matched`);
    assert.ok(MODULE_RE.test(`packages/${pkg}/lib/bar.mjs`), `${pkg}/lib not matched`);
  }
});

test('measureTrackedSize reports docs size but keeps it out of the gate', () => {
  const docsFiles = execSync('git ls-files -s docs', { cwd: ROOT, encoding: 'utf8' })
    .trim()
    .split('\n')
    .map((line) => line.match(/^(\d+)\s+\S+\s+\S+\s+(.+)$/))
    .filter((m) => m && m[1] !== '120000');
  const size = measureTrackedSize(ROOT);
  assert.equal(size.docsFileCount, docsFiles.length);
  assert.ok(size.docsLoc > 0, 'docs measured as empty');
  // Reported, never gated: every docs path the report counts is a path
  // SIZE_GATE_EXCLUDED_RE drops, so docsLoc can never appear in trackedLoc.
  for (const m of docsFiles) {
    assert.ok(SIZE_GATE_EXCLUDED_RE.test(m[2]), `${m[2]} is counted by the gate`);
  }
});
