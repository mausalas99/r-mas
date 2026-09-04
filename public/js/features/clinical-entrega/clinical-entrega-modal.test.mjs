import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, 'clinical-entrega-modal.mjs'), 'utf8');

// populateEntregaNavNameDx_ sets navName via .textContent (a DOM property, not an
// HTML string), so the full patient name needs no HTML-escaping when mirrored into
// .title — CSS truncates #entrega-modal-nav-name with an ellipsis.
describe('populateEntregaNavNameDx_', () => {
  it('sets navName.title to the same full text as navName.textContent', () => {
    const start = src.indexOf('function populateEntregaNavNameDx_');
    const end = src.indexOf('function', start + 30);
    const fn = src.slice(start, end);
    assert.match(fn, /navName\.textContent = navNameText;\s*\n\s*navName\.title = navNameText;/);
  });
});
