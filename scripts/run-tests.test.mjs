import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIN_TRACKED_TEST_FILES = 315;

describe('run-tests discovery', () => {
  it(`git ls-files finds at least ${MIN_TRACKED_TEST_FILES} test files`, () => {
    const out = execSync("git ls-files '*.test.js' '*.test.mjs' '*.test.cjs'", {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const files = out.trim().split('\n').filter(Boolean);
    assert.ok(
      files.length >= MIN_TRACKED_TEST_FILES,
      `expected >= ${MIN_TRACKED_TEST_FILES} test files, got ${files.length}`
    );
  });
});
