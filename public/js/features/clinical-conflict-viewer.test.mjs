import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildConflictDiffHtml } from './clinical-conflict-viewer.mjs';

test('highlights conflicting keys in both columns', () => {
  const html = buildConflictDiffHtml({
    conflictingKeys: ['cuarto'],
    localData: { cuarto: '101', cama: 'A' },
    serverData: { cuarto: '201', cama: 'A' },
  });
  assert.ok(html.includes('cuarto'));
  assert.ok(html.includes('conflict-field'));
  assert.ok(html.includes('101'));
  assert.ok(html.includes('201'));
});

test('non-conflicting keys omit conflict-field row class', () => {
  const html = buildConflictDiffHtml({
    conflictingKeys: ['cuarto'],
    localData: { cuarto: '101', cama: 'A' },
    serverData: { cuarto: '201', cama: 'A' },
  });
  const camaRow = html.match(/<tr[^>]*>[\s\S]*?cama[\s\S]*?<\/tr>/i);
  assert.ok(camaRow);
  assert.ok(!camaRow[0].includes('conflict-field'));
});

test('escapes HTML in field values', () => {
  const html = buildConflictDiffHtml({
    conflictingKeys: ['nombre'],
    localData: { nombre: '<script>' },
    serverData: { nombre: 'Ana' },
  });
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});
