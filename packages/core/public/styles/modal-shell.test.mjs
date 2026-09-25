import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Phase 2 (2026-09-23): every modal uses the shell in workbench-kit.css —
// .wb-modal > .wb-modal-head (.wb-modal-title + .wb-modal-close) > .wb-modal-body > .wb-modal-foot.
const pub = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = [
  'partials/modals/root.html',
  'partials/modals/settings-dropdown.html',
  'partials/chrome/overlays.html',
  'partials/chrome/header.html',
  'partials/layout/app-body.html',
];
// Full-screen screens, not modals: lock screens and the tour welcome.
const NOT_MODALS = ['rpc-db-unlock-overlay', 'rpc-idle-lock-overlay', 'onboarding-intro-backdrop'];
// Body and footer come from JS (buildRegistroFormMarkup), checked below.
const JS_BODY = ['ea-registro-backdrop'];

const count = (html, re) => (html.match(re) || []).length;
const cls = (name) => new RegExp('class="[^"]*\\b' + name + '\\b(?!-)', 'g');

// Top-level blocks: each starts with an unindented element.
function blocks(html) {
  return html.split(/\n(?=<div\b)/).filter((b) => /role="(alert)?dialog"/.test(b));
}

test('every modal has the shared shell classes', () => {
  const bad = [];
  let seen = 0;
  for (const file of FILES) {
    for (const block of blocks(readFileSync(join(pub, file), 'utf8'))) {
      const id = (block.match(/^<div[^>]*\bid="([^"]+)"/) || [])[1] || block.slice(0, 60);
      if (NOT_MODALS.includes(id)) continue;
      seen++;
      const dialogs = count(block, /role="(alert)?dialog"/g);
      const noClose = count(block, /data-wb-no-close/g);
      const need = { 'wb-modal': dialogs, 'wb-modal-head': dialogs, 'wb-modal-title': dialogs, 'wb-modal-close': dialogs - noClose };
      if (!JS_BODY.includes(id)) need['wb-modal-body'] = dialogs;
      for (const [name, n] of Object.entries(need)) {
        if (count(block, cls(name)) < n) bad.push(file + ' #' + id + ' missing .' + name);
      }
      if (/\bh[23][^>]*style="[^"]*color:\s*var\(--primary\)/.test(block)) bad.push(file + ' #' + id + ' teal title');
    }
  }
  assert.ok(seen >= 45, 'expected the full modal set, saw ' + seen);
  assert.deepEqual(bad, []);
});

test('registro modal body and footer come with the shell classes', () => {
  const src = readFileSync(join(pub, 'js/features/estado-actual-panel-registro.mjs'), 'utf8');
  assert.match(src, /ea-registro-form-scroll wb-modal-body/);
  assert.match(src, /ea-registro-modal-foot wb-modal-foot/);
});
