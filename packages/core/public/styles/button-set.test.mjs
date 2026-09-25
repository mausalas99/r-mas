import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Phase 1 (2026-09-23): `.wb-btn*` in workbench-kit.css is the only button set.
// The old families were deleted with no aliases; this keeps them from coming back.
const pub = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY =
  /(^|[\s."'`])(btn-med-(primary|secondary)|btn-settings-row|btn-save-profile|btn-save|btn-generate|btn-cancel|btn-lan-(primary|secondary)|btn-conflict-(primary|secondary|cancel|hint)|btn-edit-templates|ui-confirm-btn)(?![\w-]*=)(?=[\s."'`:,{)[]|--|$)/m;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== 'chunks' && name !== 'vendor') yield* walk(p);
    } else if (/\.(mjs|js|html|css)$/.test(name) && !/\.bundle\.|\.test\.mjs$/.test(name)) {
      yield p;
    }
  }
}

test('no legacy button class in public markup, scripts or CSS', () => {
  const hits = [];
  for (const dir of ['js', 'partials', 'styles']) {
    for (const file of walk(join(pub, dir))) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          // ids like id="btn-save-x" / getElementById('btn-conflict-move') are not classes
          const stripped = line.replace(/(id=["']|getElementById\(['"]|#)btn-[\w-]+/g, '');
          if (LEGACY.test(stripped)) hits.push(relative(pub, file) + ':' + (i + 1));
        });
    }
  }
  const html = readFileSync(join(pub, 'index.html'), 'utf8').replace(/id="btn-[\w-]+"/g, '');
  if (LEGACY.test(html)) hits.push('index.html');
  assert.deepEqual(hits, []);
});
