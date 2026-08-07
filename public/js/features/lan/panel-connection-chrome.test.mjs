import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldForceRebuildOnConnectionOpen } from './panel-connection-chrome.mjs';
import { connectedViewsHtml } from '../cloud-sync/panel-conexion-views.mjs';

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

describe('Nube connected views chrome', () => {
  const baseOpts = {
    cloudUser: { username: 'doc', displayName: 'Dr. Test' },
    roomHtml: '<div data-test-room></div>',
    equipoHtml: '<div></div>',
    url: 'https://example.workers.dev',
    hasCloudSession: true,
  };

  it('omits LAN diagnostics nav, host pin markup, and :3738', () => {
    const html = connectedViewsHtml(baseOpts);
    assert.doesNotMatch(html, /data-cloud-view="lan"/);
    assert.doesNotMatch(html, /Diagnóstico LAN/);
    assert.doesNotMatch(html, /lan-host-pin/);
    assert.doesNotMatch(html, /lan-pin-host-checkbox/);
    assert.doesNotMatch(html, /3738/);
  });
});
