import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// This test suite runs under `npm run test:one`, which executes tests through
// Electron's Node runtime with no DOM (see scripts/run-with-electron-node.mjs).
// The workbench confirm modal (public/js/features/workbench/confirm.mjs) needs
// a real `document` to build/append its scrim, so it cannot be exercised end to
// end here. Instead we assert on the source directly: the destructive confirm
// is requested with the right copy, and the delete only runs after the guard
// that checks the resolved result is 'confirm'.
const src = readFileSync(fileURLToPath(new URL('./med-pharm-profile-modals.mjs', import.meta.url)), 'utf8');

function functionBody(name) {
  const start = src.indexOf('export async function ' + name);
  assert.notEqual(start, -1, name + ' should be declared as an async function');
  const nextExport = src.indexOf('\nexport ', start + 1);
  return src.slice(start, nextExport === -1 ? src.length : nextExport);
}

describe('med-pharm-profile-modals destructive confirms', () => {
  it('deleteMedPharmViewMonth requests a destructive confirm with the month copy', () => {
    const body = functionBody('deleteMedPharmViewMonth');
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /Eliminar el perfil farmacoterapéutico de/);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm')");
    const deleteIdx = body.indexOf('deleteMonthFromProfile(');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(deleteIdx > guardIdx, 'the month delete must run only after the confirm guard');
  });

  it('deleteMedPharmProfileAll requests a destructive confirm with the whole-profile copy', () => {
    const body = functionBody('deleteMedPharmProfileAll');
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /Borrar todo el perfil farmacoterapéutico/);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm')");
    const deleteIdx = body.indexOf('delete getMedPharmProfileByPatient()[pid]');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(deleteIdx > guardIdx, 'the profile delete must run only after the confirm guard');
  });
});
