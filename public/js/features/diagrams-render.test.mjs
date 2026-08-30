import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

describe('diagrams-render localStorage quota handling', () => {
  let store = {};
  const prev = globalThis.localStorage;

  beforeEach(() => {
    store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    };
  });

  afterEach(() => {
    if (prev) globalThis.localStorage = prev;
    else delete globalThis.localStorage;
  });

  it('logs console.warn when setItem for LAB_DIAGRAMS_COLLAPSED_KEY exceeds quota', async () => {
    const { setLabDiagramsCollapsed } = await import('./diagrams-render.mjs');
    let warned = null;
    const prevWarn = console.warn;
    console.warn = (msg, err) => { warned = { msg, err }; };
    globalThis.localStorage.setItem = () => {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    };
    try {
      setLabDiagramsCollapsed(true);
    } catch (e) {
      // Expected - the function may fail due to document not existing
      // We're only testing that console.warn was called
    } finally {
      console.warn = prevWarn;
    }
    assert.ok(warned, 'console.warn should be called on quota error');
    assert.match(warned.msg, /failed to write rpc-lab-diagrams-collapsed-v1/);
  });
});
