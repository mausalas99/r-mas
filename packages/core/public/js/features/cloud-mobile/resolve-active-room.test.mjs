import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickBestCloudMobileRoom } from './resolve-active-room.mjs';

const bootSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'boot.mjs'), 'utf8');
const resolveSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'resolve-active-room.mjs'), 'utf8');

describe('pickBestCloudMobileRoom', () => {
  it('prefers highest revision', () => {
    const best = pickBestCloudMobileRoom([
      { id: 'a', revision: 0, storageBytes: 100, updatedAt: '2026-08-03' },
      { id: 'b', revision: 3, storageBytes: 50, updatedAt: '2026-08-02' },
    ]);
    assert.equal(best?.id, 'b');
  });
});

describe('cloud-mobile room resolution loads the decryption key', () => {
  it('loads the room DEK after every resolved room, like the desktop join handler', () => {
    assert.match(resolveSrc, /loadRoomDek\(api, room\.id, room\.code\)/);
    assert.match(resolveSrc, /applyResolvedRoom\(active, client\)/);
  });
});

describe('cloud-mobile boot clinicalOps', () => {
  it('pulls sala clinicalOps after the first census syncCycle', () => {
    assert.match(bootSrc, /syncCycle/);
    assert.match(bootSrc, /pullClinicalOpsForSala/);
    assert.match(bootSrc, /finalizeMobileLanPatientCensus/);
    assert.match(bootSrc, /since:\s*0/);
  });
});
