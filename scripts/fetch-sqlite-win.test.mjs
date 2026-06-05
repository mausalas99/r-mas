import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeFile = path.join(
  root,
  'node_modules/better-sqlite3-multiple-ciphers/build/Release/better_sqlite3.node'
);

test('fetch-sqlite-win leaves a Windows PE better_sqlite3.node when run on macOS', () => {
  if (process.platform === 'win32') {
    return;
  }
  const script = path.join(root, 'scripts/fetch-sqlite-win.mjs');
  const r = spawnSync(process.execPath, [script], { cwd: root, stdio: 'pipe', encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout || 'fetch-sqlite-win failed');
  assert.ok(fs.existsSync(nodeFile), 'better_sqlite3.node must exist after fetch-sqlite-win');
  const buf = fs.readFileSync(nodeFile);
  assert.equal(buf[0], 0x4d);
  assert.equal(buf[1], 0x5a);
});
