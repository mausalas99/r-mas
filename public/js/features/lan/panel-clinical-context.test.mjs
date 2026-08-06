import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

describe('getUserSala', () => {
  /** @type {string|null} */
  let savedSettings;

  beforeEach(() => {
    savedSettings = globalThis.localStorage?.getItem('rpc-settings') ?? null;
    globalThis.localStorage = {
      store: /** @type {Record<string, string>} */ ({}),
      getItem(key) {
        return this.store[key] ?? null;
      },
      setItem(key, value) {
        this.store[key] = String(value);
      },
      removeItem(key) {
        delete this.store[key];
      },
    };
  });

  afterEach(() => {
    if (savedSettings == null) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage.setItem('rpc-settings', savedSettings);
    }
  });

  it('prefers SQLCipher user.sala over stale rpc-settings clinicalSala', async () => {
    globalThis.localStorage.setItem(
      'rpc-settings',
      JSON.stringify({ clinicalSala: 'Sala 1', clinicalRegistered: true })
    );
    const { clinicalSessionContext } = await import('../../clinical-session-context.mjs');
    clinicalSessionContext.user = { user_id: 'u1', sala: 'Torre HU' };
    const { getUserSala } = await import('./panel-clinical-context.mjs');
    assert.equal(getUserSala(), 'Torre HU');
    clinicalSessionContext.user = null;
  });

  it('falls back to clinicalSala when session sala is empty', async () => {
    globalThis.localStorage.setItem(
      'rpc-settings',
      JSON.stringify({ clinicalSala: 'Torre HU' })
    );
    const { clinicalSessionContext } = await import('../../clinical-session-context.mjs');
    clinicalSessionContext.user = { user_id: 'u1', sala: '' };
    const { getUserSala } = await import('./panel-clinical-context.mjs');
    assert.equal(getUserSala(), 'Torre HU');
    clinicalSessionContext.user = null;
  });
});
