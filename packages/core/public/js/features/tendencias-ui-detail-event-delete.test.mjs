import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// `npm run test:one` runs through Electron's Node runtime with no `document`
// (see scripts/run-with-electron-node.mjs), so the workbench confirm scrim
// can't be mounted here. We assert on the source directly: the eventualidad
// delete requests a destructive confirm, and `deletePatientEventualidad` only
// runs after the guard on the resolved result — this used to run with zero
// confirmation at all.
const src = readFileSync(fileURLToPath(new URL('./tendencias-ui-detail.mjs', import.meta.url)), 'utf8');

describe('handleTendDetailEventDelete', () => {
  it('requests a destructive confirm before deleting an eventualidad', () => {
    const start = src.indexOf('async function handleTendDetailEventDelete');
    assert.notEqual(start, -1, 'handleTendDetailEventDelete should exist');
    const nextFn = src.indexOf('\nfunction ', start + 1);
    const body = src.slice(start, nextFn === -1 ? src.length : nextFn);
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /confirmLabel:\s*'Eliminar'/);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm') return;");
    const deleteIdx = body.indexOf('deletePatientEventualidad(');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'confirm guard must follow the openConfirm call');
    assert.ok(deleteIdx > guardIdx, 'the delete call must run only after the confirm guard');
  });
});
