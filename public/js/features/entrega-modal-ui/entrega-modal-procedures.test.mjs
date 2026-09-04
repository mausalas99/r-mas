import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// See drive-import-modal-step.test.mjs for why this suite checks the source
// directly instead of mounting a DOM: `npm run test:one` runs through
// Electron's Node runtime with no `document`, and addItemFromForm's
// validation runs against markup rendered from a big innerHTML string that
// this harness cannot parse back into a queryable tree.
const src = readFileSync(fileURLToPath(new URL('./entrega-modal-procedures.mjs', import.meta.url)), 'utf8');

function functionBody(name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' should be declared');
  const nextFn = src.indexOf('\nfunction ', start + 1);
  return src.slice(start, nextFn === -1 ? src.length : nextFn);
}

describe('addItemFromForm field-invalid marking', () => {
  it('marks the label field invalid (and does not clear it) on an empty label', () => {
    const body = functionBody('addItemFromForm');
    assert.match(
      body,
      /if \(!fields\.label\) \{\s*toast\('Indica la etiqueta del procedimiento\.', 'error'\);\s*markFieldInvalid\(labelEl, 'Indica la etiqueta del procedimiento\.'\);\s*return;\s*\}/,
      'the empty-label branch must call markFieldInvalid with the same message as the toast, then return before creating an item'
    );
  });

  it('clears the label field invalid state once the label is present', () => {
    const body = functionBody('addItemFromForm');
    const clearIdx = body.indexOf('clearFieldInvalid(labelEl)');
    const createIdx = body.indexOf('createProcedimientoItem(');
    assert.notEqual(clearIdx, -1, 'clearFieldInvalid must be called on the valid path');
    assert.ok(clearIdx < createIdx, 'clearFieldInvalid must run before the item is created');
  });

  it('imports markFieldInvalid/clearFieldInvalid from the shared helper', () => {
    assert.match(src, /import \{ markFieldInvalid, clearFieldInvalid \} from '\.\.\/\.\.\/ui-field-invalid\.mjs';/);
  });
});
