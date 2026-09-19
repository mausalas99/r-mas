import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mountCloudMobileInviteInHost } from './panel-mobile-invite.mjs';
import { setCloudSyncUrl, setCloudSyncToken } from './settings.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(dir, 'panel-mobile-invite.mjs'), 'utf8');

function memoryStore() {
  const map = new Map();
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(String(k), String(v));
    },
    removeItem(k) {
      map.delete(String(k));
    },
    clear() {
      map.clear();
    },
  };
}

describe('panel-mobile-invite', () => {
  it('renders invite content flat on the dedicated mobile subview (no nested disclosure)', () => {
    assert.match(src, /fillCloudMobileInviteBody/);
    assert.doesNotMatch(src, /createElement\('details'\)/);
    assert.doesNotMatch(src, /createElement\('summary'\)/);
  });

  describe('mountCloudMobileInviteInHost', () => {
    const prevLocal = globalThis.localStorage;
    const prevDoc = globalThis.document;

    beforeEach(() => {
      globalThis.localStorage = memoryStore();
      setCloudSyncUrl('https://sync.example.workers.dev');
      setCloudSyncToken('test-auth-token');
      globalThis.localStorage.setItem(
        'rpc-settings',
        JSON.stringify({ clinicalUsername: 'r1test' })
      );
    });

    afterEach(() => {
      globalThis.localStorage = prevLocal;
      globalThis.document = prevDoc;
    });

    it('shows QR and copy actions immediately without a collapsible wrapper', () => {
      if (typeof document === 'undefined') return;
      const host = document.createElement('div');
      mountCloudMobileInviteInHost(host, {
        runtime() {
          return { showToast() {} };
        },
      });
      assert.equal(host.querySelector('details'), null);
      assert.equal(host.querySelector('summary'), null);
      assert.ok(host.querySelector('.cloud-mobile-invite-qr-host canvas'));
      assert.match(
        host.querySelector('.btn-lan-primary')?.textContent || '',
        /Copiar enlace móvil/
      );
    });
  });
});
