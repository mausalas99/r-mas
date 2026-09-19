import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// See public/js/features/med-pharm-profile-modals.test.mjs for why this suite
// checks the source directly: `npm run test:one` runs through Electron's Node
// runtime with no `document`, so the workbench confirm scrim can't be mounted
// here. We instead assert the destructive confirm is requested with the right
// copy, and that the delete only runs after the guard on the resolved result.
const src = readFileSync(fileURLToPath(new URL('./lab-panel-history.mjs', import.meta.url)), 'utf8');

function functionBody(name) {
  const start = src.indexOf('async function ' + name);
  assert.notEqual(start, -1, name + ' should be declared as an async function');
  const after = src.slice(start + 1);
  const nextFnRel = after.search(/\n(async )?function /);
  return nextFnRel === -1 ? src.slice(start) : src.slice(start, start + 1 + nextFnRel);
}

describe('lab-panel-history destructive confirms', () => {
  it('deleteAllLabHistorySets requests a destructive confirm with the count in the message', () => {
    const body = functionBody('deleteAllLabHistorySets');
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /¿Eliminar todos los estudios de laboratorio de este paciente\?/);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm')");
    const deleteIdx = body.indexOf('delete getLabHistory()[pid]');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(deleteIdx > guardIdx, 'the delete-all must run only after the confirm guard');
  });

  it('deleteLabHistorySet requests a destructive confirm before removing a set', () => {
    const body = functionBody('deleteLabHistorySet');
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /¿Eliminar este conjunto del historial\? Las tendencias se recalcularán\./);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm') return;");
    const filterIdx = body.indexOf('sets.splice(idx, 1)');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(filterIdx > guardIdx, 'removing the set must run only after the confirm guard');
  });

  it('deleteLabHistoryDay_ requests a destructive confirm before removing the day', () => {
    const body = functionBody('deleteLabHistoryDay_');
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /¿Eliminar los ' \+ n \+ ' conjuntos de este día\?/);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm')");
    const filterIdx = body.indexOf('filterOutDaySets(');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(filterIdx > guardIdx, 'removing the day must run only after the confirm guard');
  });
});
