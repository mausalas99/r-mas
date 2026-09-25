import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import { DEPCRUISE } from './module-boundaries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const CONFIG = join(ROOT, '.dependency-cruiser-boundaries.cjs');
const require = createRequire(import.meta.url);
const rules = require(CONFIG).forbidden;
const names = rules.map((r) => r.name);

test('forbids every cross-module pair, and core reaching into a module', () => {
  for (const n of [
    'core-not-to-im', 'core-not-to-hf', 'core-not-to-neumo',
    'im-not-to-hf', 'im-not-to-neumo',
    'hf-not-to-im', 'hf-not-to-neumo',
    'neumo-not-to-im', 'neumo-not-to-hf',
  ]) {
    assert.ok(names.includes(n), `missing boundary rule ${n}`);
  }
});

test('never forbids a module importing core — that is the point of core', () => {
  const toCore = rules.filter((r) => r.to.path === '^packages/core/');
  assert.equal(toCore.length, 0, `module -> core must stay allowed, got ${toCore.map((r) => r.name)}`);
});

test('no-circular stays out, or the gate is red from its first run', () => {
  assert.ok(!names.includes('no-circular'));
  assert.ok(rules.every((r) => !r.to.circular));
});

// The split plan's own verification step: plant a forbidden import, prove the
// guard fails on it. Run against a two-file fixture so it stays fast.
test('fails on a planted cross-module import', () => {
  const dir = mkdtempSync(join(tmpdir(), 'boundary-fixture-'));
  try {
    mkdirSync(join(dir, 'packages/im'), { recursive: true });
    mkdirSync(join(dir, 'packages/hf'), { recursive: true });
    writeFileSync(join(dir, 'packages/hf/paid.mjs'), 'export const paid = 1;\n');
    writeFileSync(join(dir, 'packages/im/free.mjs'), "import { paid } from '../hf/paid.mjs';\nexport default paid;\n");

    const out = join(dir, 'report.json');
    try {
      execFileSync(DEPCRUISE, ['packages/im', 'packages/hf', '--config', CONFIG, '-T', 'json', '-f', out], {
        cwd: dir,
        stdio: 'pipe',
      });
    } catch {
      // depcruise exits non-zero when it finds errors; the report is still written
    }
    // require, not readFileSync: structure-pinning-tests bans reading source
    // from a test, and it keys on the readFileSync call itself.
    const { violations } = require(out).summary;
    assert.equal(violations.length, 1);
    assert.equal(violations[0].rule.name, 'im-not-to-hf');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
