import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// See drive-import-modal-step.test.mjs for why this suite checks the source
// directly instead of mounting a DOM: `npm run test:one` runs through
// Electron's Node runtime with no `document`.
//
// This guards against a regression where onPasteInputChanged called the
// expensive refreshPreview() (full document re-parse) synchronously on every
// keystroke, causing multi-hundred-ms input lag in the paste box. It must
// stay debounced.
const src = readFileSync(fileURLToPath(new URL('./drive-import-actions.mjs', import.meta.url)), 'utf8');

describe('onPasteInputChanged debounces the expensive preview refresh', () => {
  it('does not call refreshPreview synchronously', () => {
    const start = src.indexOf('export function onPasteInputChanged');
    assert.notEqual(start, -1, 'onPasteInputChanged should be declared');
    const nextExport = src.indexOf('\nexport ', start + 1);
    const body = src.slice(start, nextExport === -1 ? src.length : nextExport);

    const syncCall = body.match(/^ {2}refreshPreview\(\);/m);
    assert.equal(syncCall, null, 'refreshPreview() must not run synchronously on every keystroke');

    assert.match(body, /previewDebounceId\s*=\s*setTimeout\(function\s*\(\)\s*\{[\s\S]*?refreshPreview\(\);/);
  });
});

function exportedFunctionBody(name) {
  const start = src.indexOf('export ' + (name === 'startDriveImportReview' ? 'function' : 'async function') + ' ' + name);
  assert.notEqual(start, -1, name + ' should be declared');
  const nextExport = src.indexOf('\nexport ', start + 1);
  return src.slice(start, nextExport === -1 ? src.length : nextExport);
}

describe('paste-textarea field-invalid marking', () => {
  it('marks the textarea invalid (empty paste, and unparseable paste) in startDriveImportReview', () => {
    const body = exportedFunctionBody('startDriveImportReview');
    assert.match(
      body,
      /rt\.showToast\('Pega el contenido del documento', 'error'\);\s*markFieldInvalid\(ta, 'Pega el contenido del documento'\);\s*return;/
    );
    assert.match(
      body,
      /rt\.showToast\('No se pudo analizar el texto', 'error'\);\s*markFieldInvalid\(ta, 'No se pudo analizar el texto'\);\s*return;/
    );
    assert.match(body, /clearFieldInvalid\(ta\);/);
  });

  it('marks the textarea invalid (empty paste, and unparseable paste) in confirmDriveImport', () => {
    const body = exportedFunctionBody('confirmDriveImport');
    assert.match(
      body,
      /rt\.showToast\('Pega el contenido del documento', 'error'\);\s*markFieldInvalid\(ta, 'Pega el contenido del documento'\);\s*return;/
    );
    assert.match(
      body,
      /rt\.showToast\('No se pudo analizar el texto', 'error'\);\s*markFieldInvalid\(ta, 'No se pudo analizar el texto'\);\s*return;/
    );
    assert.match(body, /clearFieldInvalid\(ta\);/);
  });

  it('imports markFieldInvalid/clearFieldInvalid from the shared helper', () => {
    assert.match(src, /import \{ markFieldInvalid, clearFieldInvalid \} from '\.\.\/\.\.\/ui-field-invalid\.mjs';/);
  });
});
