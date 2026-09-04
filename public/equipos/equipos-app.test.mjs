import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// equipos-app.mjs reads `document.getElementById('equipos-app')` at module
// scope, so it cannot be imported under Electron's Node test runtime (no
// `document`). We assert the four fixed catch blocks directly on the source,
// same approach as import-core.test.mjs.
const src = readFileSync(fileURLToPath(new URL('./equipos-app.mjs', import.meta.url)), 'utf8');

const sites = [
  "showToast('No se pudo entrar en la cola.');",
  "showToast('Error al tomar.');",
  "showToast('Error al entregar.');",
  "showToast('Error.');",
];

describe('equipos-app error toasts show Spanish copy, not the raw error', () => {
  for (const toastCall of sites) {
    it(`"${toastCall}" is preceded by a console.error and never by e.message`, () => {
      const toastIdx = src.indexOf(toastCall);
      assert.notEqual(toastIdx, -1, `expected to find ${toastCall} in equipos-app.mjs`);
      const catchIdx = src.lastIndexOf('catch (e) {', toastIdx);
      assert.notEqual(catchIdx, -1, 'expected a preceding catch (e) block');
      const block = src.slice(catchIdx, toastIdx + toastCall.length);

      assert.doesNotMatch(
        block,
        /showToast\(e\.message/,
        'the toast must never show the raw error message'
      );
      assert.match(block, /console\.error\(/, 'the raw error must still be logged for support');
    });
  }
});
