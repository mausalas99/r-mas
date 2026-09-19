import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'guardia-orphan-entregas.mjs'), 'utf8');

describe('guardia-orphan-entregas destructive confirm (Phase 9, mockup #11a)', () => {
  it('does not use the raw browser window.confirm for the host-delete action', () => {
    assert.equal(src.includes('window.confirm('), false);
  });

  it('routes the delete-from-server action through the shared destructive confirm kit', () => {
    assert.match(src, /import\s*\{\s*openConfirm\s*\}\s*from\s*'\.\/features\/workbench\/confirm\.mjs'/);
    assert.match(src, /weight:\s*'destructive'/);
  });
});
