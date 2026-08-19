import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { openEquiposListaPanel } from './equipos-qr-panel.mjs';

function memoryStorage() {
  const data = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem(k, v) {
      data[k] = String(v);
    },
    removeItem(k) {
      delete data[k];
    },
  };
}

describe('equipos-qr-panel.mjs rotate confirm', () => {
  let prevLocalStorage;
  let prevFetch;

  beforeEach(() => {
    prevLocalStorage = globalThis.localStorage;
    prevFetch = globalThis.fetch;
    globalThis.localStorage = memoryStorage();
    localStorage.setItem(
      'rpc-settings',
      JSON.stringify({ equiposCloudUrl: 'https://example.workers.dev', equiposAdminKey: 'k1' })
    );
  });

  afterEach(() => {
    globalThis.localStorage = prevLocalStorage;
    globalThis.fetch = prevFetch;
  });

  it('regenerating an existing link opens a consequence confirm and only rotates on confirm', async () => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML =
      '<div id="equipos-lista-backdrop"><div id="equipos-lista-panel-body"></div></div>';

    let rotateCalls = 0;
    globalThis.fetch = async (url) => {
      const path = String(url);
      if (path.includes('/admin/access/rotate')) {
        rotateCalls += 1;
        return { ok: true, json: async () => ({ row: {} }) };
      }
      if (path.includes('/admin/access')) {
        return { ok: true, json: async () => ({ row: { access_token: 'tok-1', is_active: 1 } }) };
      }
      return { ok: true, json: async () => ({}) };
    };

    await openEquiposListaPanel({ userId: 'u1' });

    const rotateBtn = document.querySelector('[data-eq-rotate]');
    assert.ok(rotateBtn, 'rotate button should render once a token exists');
    rotateBtn.click();
    // let the async click handler reach the confirm dialog
    await Promise.resolve();
    await Promise.resolve();

    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'consequence modal should be open');
    assert.match(backdrop.innerHTML, /wb-confirm-modal--consequence/);
    assert.match(backdrop.innerHTML, /¿Regenerar enlace\?/);
    assert.match(backdrop.innerHTML, /El anterior dejará de funcionar\./);

    document.querySelector('[data-wb-confirm-cancel]').click();
    await Promise.resolve();
    assert.equal(rotateCalls, 0, 'canceling must not call the rotate endpoint');
  });
});
