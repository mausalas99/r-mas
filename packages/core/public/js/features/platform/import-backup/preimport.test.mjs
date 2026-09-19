import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// See public/js/features/med-pharm-profile-modals.test.mjs for why this suite
// checks the source directly: `npm run test:one` runs through Electron's Node
// runtime with no `document`, so the workbench confirm scrim can't be mounted
// here. We instead assert the destructive confirm is requested with the right
// copy, and that the restore only runs after the guard on the resolved result.
const src = readFileSync(fileURLToPath(new URL('./preimport.mjs', import.meta.url)), 'utf8');

describe('restorePreimportBackupPrompt destructive confirm', () => {
  it('requests a destructive confirm before restoring the pre-import backup', () => {
    const start = src.indexOf('async function restorePreimportBackupPrompt');
    assert.notEqual(start, -1, 'restorePreimportBackupPrompt should be declared as an async function');
    const nextFn = src.indexOf('\nexport ', start + 1);
    const body = src.slice(start, nextFn === -1 ? src.length : nextFn);
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /¿Restaurar la copia guardada automáticamente/);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm')");
    const restoreIdx = body.indexOf('persistFullBackupPayload(payload)');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(restoreIdx > guardIdx, 'the restore must run only after the confirm guard');
  });
});
