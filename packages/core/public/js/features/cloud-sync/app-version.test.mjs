import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCachedAppVersion } from './app-version.mjs';

describe('getCachedAppVersion', () => {
  it('defaults to empty string outside Electron (no window.electronAPI)', () => {
    assert.equal(getCachedAppVersion(), '');
  });

  it('falls back to the build-stamped cloud-mobile version', () => {
    globalThis.__RPC_CLOUD_MOBILE_APP_VERSION__ = '8.2.3';
    try {
      assert.equal(getCachedAppVersion(), '8.2.3');
    } finally {
      delete globalThis.__RPC_CLOUD_MOBILE_APP_VERSION__;
    }
  });
});
