import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// See public/js/features/med-pharm-profile-modals.test.mjs for why this suite
// checks the source directly: `npm run test:one` runs through Electron's Node
// runtime with no `document`, so the workbench confirm scrim can't be mounted
// here. We instead assert the destructive confirm is requested with the right
// copy, and that the delete only runs after the guard on the resolved result.
const src = readFileSync(
  fileURLToPath(new URL('./teams-roster-directory-assign.mjs', import.meta.url)),
  'utf8'
);

describe('handleLanDeleteDirectoryUserClick destructive confirm', () => {
  it('requests a destructive confirm with the directory-delete copy', () => {
    const start = src.indexOf('export async function handleLanDeleteDirectoryUserClick');
    assert.notEqual(start, -1);
    const nextExport = src.indexOf('\nexport ', start + 1);
    const body = src.slice(start, nextExport === -1 ? src.length : nextExport);
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /¿Eliminar a «\$\{label\}» de la base clínica en esta Mac\?/);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm')");
    const deleteCallIdx = body.indexOf('api.dbClinicalUserDelete(');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(deleteCallIdx > guardIdx, 'the delete call must run only after the confirm guard');
  });
});
