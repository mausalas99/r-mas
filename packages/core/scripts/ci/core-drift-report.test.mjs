import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { findDrifts } from './core-drift-report.mjs';

function git(dir, args) {
  execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
}

function makeFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'core-drift-fixture-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.email', 'a@b.c']);
  git(dir, ['config', 'user.name', 'fixture']);
  mkdirSync(join(dir, 'packages/core/lib'), { recursive: true });
  mkdirSync(join(dir, 'packages/hf/lib'), { recursive: true });
  mkdirSync(join(dir, 'packages/neumo/lib'), { recursive: true });
  writeFileSync(join(dir, 'packages/core/lib/persist.mjs'), 'export const persist = 1;\n');
  writeFileSync(join(dir, 'packages/hf/lib/persist.mjs'), 'export const persist = 1;\n');
  writeFileSync(join(dir, 'packages/neumo/lib/persist.mjs'), 'export const persist = 1;\n');
  writeFileSync(join(dir, 'packages/core/lib/hf-only-diverged.mjs'), 'export const a = 1;\n');
  writeFileSync(join(dir, 'packages/hf/lib/hf-only-diverged.mjs'), 'export const a = 2; // already its own\n');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'base']);
  git(dir, ['checkout', '-q', '-b', 'work']);
  return dir;
}

test('flags a core file that just broke parity with a byte-identical twin', () => {
  const dir = makeFixture();
  try {
    writeFileSync(join(dir, 'packages/core/lib/persist.mjs'), 'export const persist = 2; // fixed\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'fix persist']);

    const drifts = findDrifts(dir, 'main');
    assert.equal(drifts.length, 2);
    assert.ok(drifts.some((d) => d.includes('packages/core/lib/persist.mjs -> packages/hf/lib/persist.mjs')));
    assert.ok(drifts.some((d) => d.includes('packages/core/lib/persist.mjs -> packages/neumo/lib/persist.mjs')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('stays quiet when core and its twin change together', () => {
  const dir = makeFixture();
  try {
    writeFileSync(join(dir, 'packages/core/lib/persist.mjs'), 'export const persist = 2;\n');
    writeFileSync(join(dir, 'packages/hf/lib/persist.mjs'), 'export const persist = 2;\n');
    writeFileSync(join(dir, 'packages/neumo/lib/persist.mjs'), 'export const persist = 2;\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'fix persist everywhere']);

    assert.deepEqual(findDrifts(dir, 'main'), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('stays quiet on a file already diverged before this branch touched it', () => {
  const dir = makeFixture();
  try {
    writeFileSync(join(dir, 'packages/core/lib/hf-only-diverged.mjs'), 'export const a = 3;\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'change already-diverged file']);

    assert.deepEqual(findDrifts(dir, 'main'), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('stays quiet on a brand-new core file with no twin to drift from', () => {
  const dir = makeFixture();
  try {
    writeFileSync(join(dir, 'packages/core/lib/new-thing.mjs'), 'export const b = 1;\n');
    git(dir, ['add', '-A']);
    git(dir, ['commit', '-q', '-m', 'add new file']);

    assert.deepEqual(findDrifts(dir, 'main'), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
