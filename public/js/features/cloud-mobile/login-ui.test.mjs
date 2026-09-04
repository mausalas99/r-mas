import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'login-ui.mjs'), 'utf8');

describe('cloud-mobile QR-scan join loads the decryption key', () => {
  it('calls loadRoomDek after joinRoom, like the desktop join handler', () => {
    assert.match(src, /await loadRoomDek\(api, room\.id, room\.code\)/);
  });
});
