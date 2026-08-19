import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// See public/js/features/med-pharm-profile-modals.test.mjs for why this suite
// checks the source directly: `npm run test:one` runs through Electron's Node
// runtime with no `document`, so the workbench confirm scrim can't be mounted
// here. We instead assert the destructive confirm is requested with the right
// copy, and that the downgrade only runs after the guard on the resolved result.
const src = readFileSync(fileURLToPath(new URL('./downgrade.mjs', import.meta.url)), 'utf8');

describe('confirmDowngrade destructive confirm', () => {
  it('requests a destructive confirm before restoring an older version', () => {
    const start = src.indexOf('async function confirmDowngrade');
    assert.notEqual(start, -1, 'confirmDowngrade should be declared as an async function');
    const nextFn = src.indexOf('\nfunction ', start + 1);
    const body = src.slice(start, nextFn === -1 ? src.length : nextFn);
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /Restaurar R\+ a v/);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm')");
    const downgradeIdx = body.indexOf('pendingDowngradeVersion = version');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(downgradeIdx > guardIdx, 'the downgrade must run only after the confirm guard');
  });
});
