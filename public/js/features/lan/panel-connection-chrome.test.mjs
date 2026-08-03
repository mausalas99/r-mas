import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldForceRebuildOnConnectionOpen } from './panel-connection-chrome.mjs';

function runtimeStub(isMobile = false) {
  return () => ({ isMobileWeb: () => isMobile });
}

describe('shouldForceRebuildOnConnectionOpen', () => {
  it('forces rebuild when panel root is empty', () => {
    const root = { querySelector: () => null };
    assert.equal(shouldForceRebuildOnConnectionOpen(root, runtimeStub()), true);
  });

  it('does not force rebuild when Nube chrome is already mounted', () => {
    const root = {
      querySelector(sel) {
        if (sel === '.cloud-sync-conexion') return {};
        return null;
      },
    };
    assert.equal(shouldForceRebuildOnConnectionOpen(root, runtimeStub()), false);
  });
});
