import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(fileURLToPath(new URL('./drive-import-preview.mjs', import.meta.url)), 'utf8');

describe('drive-import parse-error hint shows Spanish copy, not the raw error', () => {
  it('showParseError logs the raw error and shows a Spanish fallback, never err.message', () => {
    const idx = src.indexOf('function showParseError(err) {');
    assert.notEqual(idx, -1, 'expected showParseError to be declared');
    const end = src.indexOf('\n}', idx);
    const body = src.slice(idx, end);

    assert.match(body, /console\.error\(/, 'the raw error must still be logged for support');
    assert.doesNotMatch(
      body,
      /textContent\s*=\s*.*err/,
      'the parse-hint text must never include the raw error message'
    );
    assert.match(body, /textContent\s*=\s*'No se pudo leer el texto pegado\.'/);
  });
});
