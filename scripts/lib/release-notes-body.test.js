/**
 * Release notes must be curated before publish (no stale default copy).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

test('RELEASE_NOTES_6.6.8 has no TODO placeholders', () => {
  const notes = fs.readFileSync(
    path.join(ROOT, 'docs/RELEASE_NOTES_6.6.8.txt'),
    'utf8'
  );
  assert.ok(!/\bTODO\b/i.test(notes), 'docs/RELEASE_NOTES_6.6.8.txt still has TODO');
});

test('curated 6.6.8 highlights are current default', async () => {
  const mod = await import(
    path.join(ROOT, 'public/js/features/settings-help/release-notes-curated.mjs')
  );
  const highlights = mod.RELEASE_NOTES_HIGHLIGHTS['6.6.8'];
  assert.ok(Array.isArray(highlights) && highlights.length >= 4);
  const joined = highlights.map((n) => `${n.title} ${n.body}`).join(' ');
  assert.ok(!/title: 'TODO'/.test(joined));
  assert.ok(!joined.includes('Completar antes de publicar'));
  assert.ok(joined.includes('Wi') || joined.includes('LiveSync'));
  assert.equal(mod.RELEASE_NOTES_HIGHLIGHTS_DEFAULT, mod.RELEASE_NOTES_HIGHLIGHTS['6.6.8']);
});

test('curated 6.6.3 highlights remain filled (not legacy empty)', async () => {
  const mod = await import(
    path.join(ROOT, 'public/js/features/settings-help/release-notes-curated.mjs')
  );
  const highlights = mod.RELEASE_NOTES_HIGHLIGHTS['6.6.3'];
  assert.ok(Array.isArray(highlights) && highlights.length >= 4);
  const joined = highlights.map((n) => `${n.title} ${n.body}`).join(' ');
  assert.ok(!joined.includes('Completar antes de publicar'));
  assert.ok(joined.includes('Arranque') || joined.includes('Windows'));
});
