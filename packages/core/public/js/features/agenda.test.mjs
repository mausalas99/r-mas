import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// See public/js/features/med-pharm-profile-modals.test.mjs for why this suite
// checks the source directly: `npm run test:one` runs through Electron's Node
// runtime with no `document`, so the workbench confirm scrim can't be mounted
// here. We instead assert the destructive confirm is requested with the right
// copy, and that the delete only runs after the guard on the resolved result.
const src = readFileSync(fileURLToPath(new URL('./agenda.mjs', import.meta.url)), 'utf8');

function functionBody(name) {
  const start = src.indexOf('export async function ' + name);
  assert.notEqual(start, -1, name + ' should be declared as an async function');
  const nextExport = src.indexOf('\nexport ', start + 1);
  return src.slice(start, nextExport === -1 ? src.length : nextExport);
}

describe('agenda deleteProcedureAgendaFromModal destructive confirm', () => {
  it('requests a destructive confirm with the procedure-delete copy', () => {
    const body = functionBody('deleteProcedureAgendaFromModal');
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*"destructive"/);
    assert.match(body, /Eliminar este procedimiento de la agenda\? No se puede deshacer desde aquí\./);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf('if (result !== "confirm")');
    const deleteIdx = body.indexOf('saveScheduledProcedures(arr)');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(deleteIdx > guardIdx, 'the delete must run only after the confirm guard');
  });
});
