#!/usr/bin/env node
/**
 * Ban new tests that read source files as text (they pin file shape, not behavior).
 * Existing offenders stay on the allowlist until a merge rewrites them.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ALLOW = new Set(
  fs
    .readFileSync(path.join(ROOT, 'scripts/ci/structure-pinning-allowlist.txt'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
);

const READ_RE = /readFileSync\s*\(/;
const SOURCE_HINT_RE = /\.(mjs|js|cjs)['"`]|join\([^)]+\.(mjs|js)|\.mjs|\.js/;

function testFiles() {
  return execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((f) => /\.test\.(mjs|js|cjs)$/.test(f));
}

const offenders = [];
for (const rel of testFiles()) {
  if (ALLOW.has(rel)) continue;
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) continue;
  const src = fs.readFileSync(abs, 'utf8');
  if (!READ_RE.test(src)) continue;
  if (!SOURCE_HINT_RE.test(src)) continue;
  offenders.push(rel);
}

if (offenders.length) {
  console.error('New structure-pinning tests (readFileSync on source). Add a behavior test or allowlist after review:');
  for (const rel of offenders) console.error('  ' + rel);
  process.exit(1);
}
console.log('structure-pinning-tests OK');
