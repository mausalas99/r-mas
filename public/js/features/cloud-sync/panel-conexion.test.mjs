import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const panelConexionSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'panel-conexion.mjs'),
  'utf8'
);

describe('panel-conexion status chip', () => {
  it('bindStatusChip resolves toast from deps (not outer mount scope)', () => {
    const fnStart = panelConexionSrc.indexOf('function bindStatusChip');
    assert.ok(fnStart >= 0);
    const fnBody = panelConexionSrc.slice(fnStart, fnStart + 900);
    assert.match(fnBody, /const toast = typeof deps\.toast === 'function'/);
    assert.doesNotMatch(fnBody, /refreshCloudSyncDiagnostics\([^)]*\{\s*toast,\s*\}/);
  });
});
