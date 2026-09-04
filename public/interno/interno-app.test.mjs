import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// interno-app.mjs is a top-level boot script (it calls `void init();` at
// import time and has zero exports), so markPendienteComplete cannot be
// unit-imported here. Check the source directly instead — same convention
// as drive-import-actions.test.mjs / entrega-modal-procedures.test.mjs for
// code this Electron-as-Node test runner cannot exercise via a real DOM.
const src = readFileSync(fileURLToPath(new URL('./interno-app.mjs', import.meta.url)), 'utf8');

function functionBody(name) {
  const start = src.indexOf('function ' + name + '(');
  assert.notEqual(start, -1, name + ' should be declared');
  const nextFn = src.indexOf('\nfunction ', start + 1);
  return src.slice(start, nextFn === -1 ? src.length : nextFn);
}

describe('markPendienteComplete field-invalid marking', () => {
  it('imports markFieldInvalid from the shared helper', () => {
    assert.match(src, /import \{ markFieldInvalid \} from '\.\.\/js\/ui-field-invalid\.mjs';/);
  });

  it('marks #interno-sheet-hecho invalid alongside the server-error toast', () => {
    const body = functionBody('markPendienteComplete');
    assert.match(
      body,
      /showToast\(msg\);\s*markFieldInvalid\(document\.getElementById\('interno-sheet-hecho'\), msg\);\s*return;/
    );
  });

  it('marks #interno-sheet-hecho invalid alongside the network-error toast', () => {
    const body = functionBody('markPendienteComplete');
    assert.match(
      body,
      /showToast\('Error de conexión'\);\s*markFieldInvalid\(document\.getElementById\('interno-sheet-hecho'\), 'Error de conexión'\);/
    );
  });
});
