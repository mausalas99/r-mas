import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// See public/js/features/med-pharm-profile-modals.test.mjs for why this suite
// checks the source directly: `npm run test:one` runs through Electron's Node
// runtime with no `document`, so the workbench confirm scrim can't be mounted
// here. We instead assert the wrapper requests a destructive confirm with the
// caller-supplied message as the title, and resolves to a boolean that is
// true only when the result is 'confirm'.
const src = readFileSync(fileURLToPath(new URL('./drive-import-modal-step.mjs', import.meta.url)), 'utf8');

describe('confirmDriveImportChoice destructive confirm', () => {
  it('wraps openConfirm with weight destructive and the caller message as title', () => {
    const start = src.indexOf('export async function confirmDriveImportChoice');
    assert.notEqual(start, -1, 'confirmDriveImportChoice should be declared as an async function');
    const nextExport = src.indexOf('\nexport ', start + 1);
    const body = src.slice(start, nextExport === -1 ? src.length : nextExport);
    assert.match(body, /openConfirm\(\{\s*weight:\s*'destructive',\s*title:\s*message\s*\}\)/);
    assert.match(body, /ok = result === 'confirm'/);
  });
});
