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

describe('manual "Buscar actualizaciones" bypasses an active snooze', () => {
  // Bug: clicking "Más tarde" snoozes a version for 24h (markDismissedVersion),
  // and a manual re-check hit the same isSnoozeActiveForVersion guard, so the
  // modal silently never came back until the snooze expired.
  it('checks checkFeedback before every isSnoozeActiveForVersion guard', () => {
    // A guard can sit inline in the handler, or be delegated to a shouldSkip*
    // helper called as `if (shouldSkipX()) return;` — either shape must still
    // bypass on manual check (checkFeedback) before consulting snooze state.
    const inlineGuards = [...src.matchAll(/^.*isSnoozeActiveForVersion\([^)]*\)\) return;$/gm)]
      .map(([line]) => line);
    const helperNames = [...src.matchAll(/if \((shouldSkip\w*)\([^)]*\)\) return;/g)]
      .map(([, name]) => name);
    const helperGuards = helperNames.map((name) => {
      const start = src.indexOf(`function ${name}(`);
      assert.notEqual(start, -1, `helper ${name} not found`);
      const bodyEnd = src.indexOf('\n}', start);
      return src.slice(start, bodyEnd);
    });
    const guards = [...inlineGuards, ...helperGuards];
    assert.equal(guards.length, 3, 'expected three snooze guards in handleUpdateAvailable/Progress/Ready');
    for (const guard of guards) {
      assert.match(guard, /!updaterState\.checkFeedback/, `guard missing manual-check bypass: ${guard}`);
      assert.match(guard, /isSnoozeActiveForVersion/, `guard missing snooze check: ${guard}`);
    }
  });
});
