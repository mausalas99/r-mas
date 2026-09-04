import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// `npm run test:one` runs through Electron's Node runtime with no `document`
// (see scripts/run-with-electron-node.mjs), so the workbench confirm scrim
// can't be mounted here. We assert on the source directly: deleting a
// procedimiento now requests a destructive confirm naming the action, and
// the item is only removed from entregaDraft.items after the guard on the
// resolved result — this used to run with zero confirmation at all.
const src = readFileSync(fileURLToPath(new URL('./entrega-modal-procedures.mjs', import.meta.url)), 'utf8');

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
