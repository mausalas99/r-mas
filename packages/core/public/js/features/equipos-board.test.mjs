import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderEquiposBoardPanel } from './equipos-board.mjs';
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';

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

describe('equipos-board.mjs purge confirms', () => {
  let prevLocalStorage;
  let prevFetch;
  let prevUser;
  let purgeCalls;

  beforeEach(() => {
    prevLocalStorage = globalThis.localStorage;
    prevFetch = globalThis.fetch;
    prevUser = clinicalSessionContext.user;
    globalThis.localStorage = memoryStorage();
    localStorage.setItem(
      'rpc-settings',
      JSON.stringify({ equiposCloudUrl: 'https://example.workers.dev', equiposAdminKey: 'k1' })
    );
    clinicalSessionContext.user = { is_program_admin: 1 };
    purgeCalls = [];
    globalThis.fetch = async (url) => {
      const path = String(url);
      if (path.includes('/admin/purge-queue')) {
        purgeCalls.push(path);
        return { ok: true, json: async () => ({}) };
      }
      if (path.includes('/board')) {
        return {
          ok: true,
          json: async () => ({
            devices: [{ device_type: 'lumify', status: 'available', waitlist: [] }],
            alerts: [],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    };
  });

  afterEach(() => {
    globalThis.localStorage = prevLocalStorage;
    globalThis.fetch = prevFetch;
    clinicalSessionContext.user = prevUser;
  });

  it('single-device purge: consequence confirm gates the purge call', async () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    document.body.appendChild(host);
    await renderEquiposBoardPanel(host);

    const purgeBtn = host.querySelector('[data-purge]');
    assert.ok(purgeBtn, 'admin should see a per-device purge button');
    purgeBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'consequence modal should be open');
    assert.match(backdrop.innerHTML, /wb-confirm-modal--consequence/);
    assert.match(backdrop.innerHTML, /¿Liberar este dispositivo y vaciar la cola\?/);

    document.querySelector('[data-wb-confirm-cancel]').click();
    await Promise.resolve();
    assert.equal(purgeCalls.length, 0, 'canceling must not purge');

    host.remove();
  });

  it('purge-all: consequence confirm; confirming calls the purge-all endpoint', async () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    document.body.appendChild(host);
    await renderEquiposBoardPanel(host);

    const purgeAllBtn = host.querySelector('#btn-equipos-purge-all');
    assert.ok(purgeAllBtn, 'admin should see the purge-all button');
    const clickResult = (async () => {
      purgeAllBtn.click();
    })();

    await Promise.resolve();
    await Promise.resolve();
    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'consequence modal should be open');
    assert.match(backdrop.innerHTML, /¿Purgar cola de los tres dispositivos\?/);

    document.querySelector('[data-wb-confirm-ok]').click();
    await clickResult;
    assert.equal(purgeCalls.length, 1, 'confirm must call purge-all once');

    host.remove();
  });
});
