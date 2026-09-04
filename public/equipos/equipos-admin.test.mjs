import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// equipos-admin.mjs is a standalone PWA module: equipos/index.html loads
// only tokens.css + overlays.css + equipos.css, not workbench-kit.css, so
// the app's wb-confirm modal would render unstyled here. openConfirm is not
// reachable in a working sense — kept the native confirm(), improved wording
// instead. Asserted on source (no `document`/`window.confirm` DOM harness
// under `npm run test:one`).
const src = readFileSync(fileURLToPath(new URL('./equipos-admin.mjs', import.meta.url)), 'utf8');

describe('wipe-history confirm wording', () => {
  it('first confirm names what gets wiped', () => {
    assert.match(src, /confirm\(\s*\n\s*'¿Borrar TODO el historial \(sesiones, reportes, fotos, eventos\)/);
  });

  it('second (final) confirm restates the consequence, not just "cannot be undone"', () => {
    assert.match(
      src,
      /confirm\('Confirmación final: se borrará todo el historial de forma permanente\. Esta acción no se puede deshacer\.'\)/
    );
  });
});
