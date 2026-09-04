import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// `npm run test:one` runs through Electron's Node runtime with no `document`
// (see scripts/run-with-electron-node.mjs), so neither the workbench confirm
// scrim nor a big rendered innerHTML string can be mounted here. We assert
// on the source directly, same convention as drive-import-modal-step.test.mjs.
const src = readFileSync(fileURLToPath(new URL('./entrega-modal-procedures.mjs', import.meta.url)), 'utf8');

function functionBody(name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' should be declared');
  const nextFn = src.indexOf('\nfunction ', start + 1);
  return src.slice(start, nextFn === -1 ? src.length : nextFn);
}

describe('deleteItem (entrega procedimientos)', () => {
  it('requests a destructive confirm naming the procedure before removing it', () => {
    const start = src.indexOf('async function deleteItem');
    assert.notEqual(start, -1, 'deleteItem should be async');
    const nextFn = src.indexOf('\nfunction ', start + 1);
    const body = src.slice(start, nextFn === -1 ? src.length : nextFn);
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /title:\s*'¿Eliminar procedimiento\?'/);
    assert.match(body, /confirmLabel:\s*'Eliminar'/);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm') return;");
    const filterIdx = body.indexOf('entregaDraft.items.filter(');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'confirm guard must follow the openConfirm call');
    assert.ok(filterIdx > guardIdx, 'the item must be removed only after the confirm guard');
  });

  it('the click handler awaits the now-async deleteItem', () => {
    assert.match(src, /if \(id\) void deleteItem\(id\);/);
  });
});

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
