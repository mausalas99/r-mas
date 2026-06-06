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

test('RELEASE_NOTES_6.6.9 has no TODO placeholders', () => {
  const notes = fs.readFileSync(
    path.join(ROOT, 'docs/RELEASE_NOTES_6.6.9.txt'),
    'utf8'
  );
  assert.ok(!/\bTODO\b/i.test(notes), 'docs/RELEASE_NOTES_6.6.9.txt still has TODO');
});

test('RELEASE_NOTES_6.7.0 has no TODO placeholders', () => {
  const notes = fs.readFileSync(
    path.join(ROOT, 'docs/RELEASE_NOTES_6.7.0.txt'),
    'utf8'
  );
  assert.ok(!/\bTODO\b/i.test(notes), 'docs/RELEASE_NOTES_6.7.0.txt still has TODO');
});

test('RELEASE_NOTES_7.0.1 has no TODO placeholders', () => {
  const notes = fs.readFileSync(
    path.join(ROOT, 'docs/RELEASE_NOTES_7.0.1.txt'),
    'utf8'
  );
  assert.ok(!/\bTODO\b/i.test(notes), 'docs/RELEASE_NOTES_7.0.1.txt still has TODO');
});

test('RELEASE_NOTES_7.0.2 has no TODO placeholders', () => {
  const notes = fs.readFileSync(
    path.join(ROOT, 'docs/RELEASE_NOTES_7.0.2.txt'),
    'utf8'
  );
  assert.ok(!/\bTODO\b/i.test(notes), 'docs/RELEASE_NOTES_7.0.2.txt still has TODO');
});

test('RELEASE_NOTES_7.0.3 has no TODO placeholders', () => {
  const notes = fs.readFileSync(
    path.join(ROOT, 'docs/RELEASE_NOTES_7.0.3.txt'),
    'utf8'
  );
  assert.ok(!/\bTODO\b/i.test(notes), 'docs/RELEASE_NOTES_7.0.3.txt still has TODO');
});

test('RELEASE_NOTES_7.1.0 has no TODO placeholders', () => {
  const notes = fs.readFileSync(
    path.join(ROOT, 'docs/RELEASE_NOTES_7.1.0.txt'),
    'utf8'
  );
  assert.ok(!/\bTODO\b/i.test(notes), 'docs/RELEASE_NOTES_7.1.0.txt still has TODO');
});

test('RELEASE_NOTES_7.1.1 has no TODO placeholders', () => {
  const notes = fs.readFileSync(
    path.join(ROOT, 'docs/RELEASE_NOTES_7.1.1.txt'),
    'utf8'
  );
  assert.ok(!/\bTODO\b/i.test(notes), 'docs/RELEASE_NOTES_7.1.1.txt still has TODO');
});

test('curated 7.1.1 highlights are current default', async () => {
  const mod = await import(
    path.join(ROOT, 'public/js/features/settings-help/release-notes-curated.mjs')
  );
  const highlights = mod.RELEASE_NOTES_HIGHLIGHTS['7.1.1'];
  assert.ok(Array.isArray(highlights) && highlights.length >= 3);
  const joined = highlights.map((n) => `${n.title} ${n.body}`).join(' ');
  assert.ok(!/title: 'TODO'/.test(joined));
  assert.ok(!joined.includes('Completar antes de publicar'));
  assert.ok(joined.includes('command') || joined.includes('Entrega') || joined.includes('Críticos'));
  assert.equal(mod.RELEASE_NOTES_HIGHLIGHTS_DEFAULT, mod.RELEASE_NOTES_HIGHLIGHTS['7.1.1']);
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
