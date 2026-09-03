#!/usr/bin/env node
/**
 * Fail when two tracked regular files have the same bytes.
 * Git symlinks (mode 120000) are the intended shared copy — skip them.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Binary/asset twins and one-line worker gitignores — not code to merge. */
const ALLOW_PAIRS = new Set([
  'cloud/equipos-worker/.gitignore | cloud/sync-worker/.gitignore',
  'design/icon/signal-from-noise/layer-1-field.svg | design/icon/single-glass-cross/layer-1-field.svg',
  'public/equipos/icons/apple-touch-icon.png | public/equipos/icons/icon-192.png',
  'public/equipos/icons/apple-touch-icon.png | public/equipos/icons/v2/apple-touch-icon.png',
  'public/equipos/icons/apple-touch-icon.png | public/equipos/icons/v2/icon-192.png',
  'public/equipos/icons/icon-192.png | public/equipos/icons/v2/apple-touch-icon.png',
  'public/equipos/icons/icon-192.png | public/equipos/icons/v2/icon-192.png',
  'public/equipos/icons/icon-512-maskable.png | public/equipos/icons/v2/icon-512-maskable.png',
  'public/equipos/icons/icon-512.png | public/equipos/icons/v2/icon-512.png',
  'public/equipos/icons/v2/apple-touch-icon.png | public/equipos/icons/v2/icon-192.png',
]);

function pairKey(a, b) {
  return [a, b].sort().join(' | ');
}

function trackedRegularFiles() {
  const lines = execSync('git ls-files -s', { cwd: ROOT, encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^(\d+)\s+\S+\s+\S+\s+(.+)$/);
    if (!m) continue;
    const mode = m[1];
    const rel = m[2];
    if (mode === '120000') continue;
    if (mode !== '100644' && mode !== '100755') continue;
    out.push(rel);
  }
  return out;
}

const byHash = new Map();
for (const rel of trackedRegularFiles()) {
  const abs = path.join(ROOT, rel);
  let buf;
  try {
    buf = fs.readFileSync(abs);
  } catch {
    continue;
  }
  if (buf.length === 0) continue;
  const hash = crypto.createHash('md5').update(buf).digest('hex');
  const list = byHash.get(hash) || [];
  list.push(rel);
  byHash.set(hash, list);
}

const clones = [];
for (const list of byHash.values()) {
  if (list.length < 2) continue;
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const key = pairKey(list[i], list[j]);
      if (!ALLOW_PAIRS.has(key)) clones.push(key);
    }
  }
}

if (clones.length) {
  console.error('Byte-identical tracked files (share a module or add a parity test):');
  for (const key of clones.sort()) console.error('  ' + key);
  process.exit(1);
}
console.log('no-duplicate-files OK');
