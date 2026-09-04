import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(fileURLToPath(new URL('./equipos-admin.mjs', import.meta.url)), 'utf8');

const sites = ["'No se pudo borrar el historial.'", "'Clave incorrecta.'"];

describe('equipos-admin error toasts show Spanish copy, not the raw error', () => {
  for (const fallback of sites) {
    it(`${fallback} is preceded by a console.error and never shows e.message`, () => {
      const idx = src.indexOf(fallback);
      assert.notEqual(idx, -1, `expected to find ${fallback} in equipos-admin.mjs`);
      const catchIdx = src.lastIndexOf('catch (e) {', idx);
      assert.notEqual(catchIdx, -1, 'expected a preceding catch (e) block');
      const block = src.slice(catchIdx, idx + fallback.length);

      assert.doesNotMatch(block, /showToast\(e\.message/, 'must never show the raw error message');
      assert.match(block, /console\.error\(/, 'the raw error must still be logged for support');
    });
  }

  // Lines 292/298 belong to a different, already-merged work unit (confirm-dialog
  // wording) and must stay untouched by this one.
  it('leaves the two native confirm() calls at the wipe-history guard untouched', () => {
    assert.match(
      src,
      /confirm\(\s*\n\s*'¿Borrar TODO el historial \(sesiones, reportes, fotos, eventos\) y quitar «Anterior» de la cola\? No cambia quién tiene el equipo ahora\.'\s*\n\s*\)/
    );
    assert.match(src, /confirm\('Confirmación final: esta acción no se puede deshacer\.'\)/);
  });
});
