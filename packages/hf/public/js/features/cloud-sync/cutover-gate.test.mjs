import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowCutoverWizard } from './cutover-gate.mjs';
import { is79CutoverVersion } from './cutover-flags.mjs';

describe('shouldShowCutoverWizard', () => {
  it('hides when cutover done', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: true, cutoverPending: false }),
      false
    );
  });

  it('shows when pending', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: false, cutoverPending: true }),
      true
    );
  });

  it('hides when done even if pending flag stale (avoid loop)', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: true, cutoverPending: true }),
      false
    );
  });

  it('hides when neither done nor pending', () => {
    assert.equal(
      shouldShowCutoverWizard({ cutoverDone: false, cutoverPending: false }),
      false
    );
  });
});

describe('is79CutoverVersion — update safety (8.0.x)', () => {
  let prevVersion;
  let prevLocalStorage;

  beforeEach(() => {
    prevVersion = globalThis.window && globalThis.window.__RPC_APP_VERSION__;
    prevLocalStorage = globalThis.localStorage;
    const store = Object.create(null);
    globalThis.localStorage = {
      getItem(k) {
        return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
      },
      setItem(k, v) {
        store[k] = String(v);
      },
      removeItem(k) {
        delete store[k];
      },
    };
    if (typeof globalThis.window === 'undefined') {
      globalThis.window = {};
    }
  });

  afterEach(() => {
    if (globalThis.window) {
      if (prevVersion === undefined) delete globalThis.window.__RPC_APP_VERSION__;
      else globalThis.window.__RPC_APP_VERSION__ = prevVersion;
    }
    if (prevLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prevLocalStorage;
  });

  it('does not treat 8.0.8 / 8.0.9 as cutover versions (no re-wipe)', () => {
    globalThis.window.__RPC_APP_VERSION__ = '8.0.8';
    assert.equal(is79CutoverVersion(), false);
    globalThis.window.__RPC_APP_VERSION__ = '8.0.9';
    assert.equal(is79CutoverVersion(), false);
  });

  it('still matches 7.9.x for first-time LAN→Nube cutover', () => {
    globalThis.window.__RPC_APP_VERSION__ = '7.9.8';
    assert.equal(is79CutoverVersion(), true);
  });
});
