import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Same reasoning as downgrade.test.mjs: no `document` under Electron's Node
// test runtime, so we assert against the source instead of mounting the modal.
// The curated release-notes history (data/release-notes-highlights.mjs) grows
// every release, so it must stay a dynamic import here — a static import would
// pull that whole file into the eager boot bundle and re-trip the boot budget
// on every release (see app-boot-imports.test.mjs).
const src = readFileSync(fileURLToPath(new URL('./electron-handlers.mjs', import.meta.url)), 'utf8');

describe('handleUpdateAvailable release-notes import', () => {
  it('is not a static top-level import', () => {
    assert.doesNotMatch(src, /^import\s*\{[^}]*formatUpdaterReleaseNotesPlain[^}]*\}\s*from/m);
  });

  it('is loaded via a dynamic import inside the async handler', () => {
    const start = src.indexOf('async function handleUpdateAvailable');
    assert.notEqual(start, -1, 'handleUpdateAvailable should be declared as an async function');
    const nextFn = src.indexOf('\nfunction ', start + 1);
    const body = src.slice(start, nextFn === -1 ? src.length : nextFn);
    assert.match(body, /await import\(['"]\.\.\/\.\.\/settings-help\/release-notes\.mjs['"]\)/);
  });
});
