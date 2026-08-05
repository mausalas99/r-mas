import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickBestCloudMobileRoom } from './resolve-active-room.mjs';

describe('pickBestCloudMobileRoom', () => {
  it('prefers highest revision', () => {
    const best = pickBestCloudMobileRoom([
      { id: 'a', revision: 0, storageBytes: 100, updatedAt: '2026-08-03' },
      { id: 'b', revision: 3, storageBytes: 50, updatedAt: '2026-08-02' },
    ]);
    assert.equal(best?.id, 'b');
  });
});
