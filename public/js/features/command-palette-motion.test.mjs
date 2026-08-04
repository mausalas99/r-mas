import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('command palette closes instantly without closeOverlayAnimated', () => {
  const src = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'command-palette.mjs'),
    'utf8'
  );
  assert.equal(src.includes('closeOverlayAnimated'), false);
  assert.equal(src.includes('cancelOverlayClose'), false);
});
