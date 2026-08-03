import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createPanelDiagnostics } from './panel-diagnostics.mjs';

function memoryStore() {
  /** @type {Record<string, string>} */
  const map = Object.create(null);
  return {
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => {
      map[k] = String(v);
    },
    removeItem: (k) => {
      delete map[k];
    },
  };
}

function stubDeps() {
  return {
    runtime: () => ({ showToast() {} }),
    renderLanPanel() {},
    esc: (s) => String(s),
    getConnectionManager: () => ({ getTransport: () => 'ws' }),
    lanHostUrl: () => '',
    getActiveLiveSyncRoomId: () => '',
    getLanClient: () => ({ connected: false, liveConnected: false, liveRoomId: '' }),
    getLastPing: () => ({ at: null, status: 0, rttMs: 0 }),
    isLanConnectionDropdownOpen: () => false,
    captureConnectionDropdownScrollTop: () => 0,
    restoreConnectionDropdownScrollTop() {},
  };
}

describe('renderLanPreflightUx Nube', () => {
  const prevLocal = globalThis.localStorage;
  const prevDoc = globalThis.document;

  beforeEach(() => {
    globalThis.localStorage = memoryStore();
    if (typeof globalThis.document === 'undefined') {
      globalThis.document = {
        createElement(tag) {
          const el = {
            tagName: String(tag).toUpperCase(),
            className: '',
            hidden: false,
            innerHTML: '',
            children: [],
            appendChild(child) {
              this.children.push(child);
              return child;
            },
            querySelector(sel) {
              if (sel === '.lan-preflight-row') {
                return this.children.find((c) => String(c.className || '').includes('lan-preflight-row')) || null;
              }
              return null;
            },
          };
          return el;
        },
      };
    }
  });

  afterEach(() => {
    if (prevLocal === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prevLocal;
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  });

  it('clears LAN preflight chips on cloud sala', async () => {
    localStorage.setItem('rpc-settings', JSON.stringify({ clinicalSala: 'Sala 2' }));
    const root = document.createElement('div');
    const row = document.createElement('div');
    row.className = 'lan-preflight-row';
    row.innerHTML = '<span>sin ping</span>';
    root.appendChild(row);

    const api = createPanelDiagnostics(stubDeps());
    const diag = await api.renderLanPreflightUx(root);

    assert.equal(diag, null);
    assert.equal(row.hidden, true);
    assert.equal(row.innerHTML, '');
  });

  it('does not create a preflight row on cloud sala', async () => {
    localStorage.setItem('rpc-settings', JSON.stringify({ clinicalSala: 'Torre HU' }));
    const root = document.createElement('div');
    const api = createPanelDiagnostics(stubDeps());
    assert.equal(await api.renderLanPreflightUx(root), null);
    assert.equal(root.querySelector('.lan-preflight-row'), null);
  });
});
