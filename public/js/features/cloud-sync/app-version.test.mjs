import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCachedAppVersion } from './app-version.mjs';

describe('getCachedAppVersion', () => {
  it('defaults to empty string outside Electron (no window.electronAPI)', () => {
    assert.equal(getCachedAppVersion(), '');
  });
});
