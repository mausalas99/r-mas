import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { removeStaleChunks, STALE_CHUNK_KEEP_MS } from './bundle-renderer.mjs';

function chunksDirWith(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-chunks-'));
  for (const [name, ageMs] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.writeFileSync(file, '');
    const t = (Date.now() - ageMs) / 1000;
    fs.utimesSync(file, t, t);
  }
  return dir;
}

const metafile = { outputs: { 'public/js/chunks/new-B.js': {}, 'public/js/chunks/new-B.js.map': {} } };

test('dev build keeps old chunks a running app may still lazy-import', () => {
  const dir = chunksDirWith({ 'new-B.js': 0, 'new-B.js.map': 0, 'old-A.js': 60_000, 'old-A.js.map': 60_000, 'ancient-Z.js': STALE_CHUNK_KEEP_MS + 60_000 });
  removeStaleChunks(metafile, { chunksDir: dir, keepMs: STALE_CHUNK_KEEP_MS });
  assert.deepEqual(fs.readdirSync(dir).sort(), ['new-B.js', 'new-B.js.map', 'old-A.js', 'old-A.js.map']);
});

test('prod build drops every chunk it did not write', () => {
  const dir = chunksDirWith({ 'new-B.js': 0, 'new-B.js.map': 0, 'old-A.js': 1000 });
  removeStaleChunks(metafile, { chunksDir: dir, keepMs: 0 });
  assert.deepEqual(fs.readdirSync(dir).sort(), ['new-B.js', 'new-B.js.map']);
});
