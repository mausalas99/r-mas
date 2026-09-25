import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { installUpdateIfIdleReady } from './check-actions.mjs';
import { updaterState } from './state.mjs';

describe('installUpdateIfIdleReady', () => {
  afterEach(() => {
    updaterState.updateReadyToInstall = false;
    delete globalThis.window;
  });

  it('installs when a downloaded update is waiting', () => {
    updaterState.updateReadyToInstall = true;
    let installed = 0;
    globalThis.window = { electronAPI: { installUpdate: () => { installed += 1; } } };

    installUpdateIfIdleReady();

    assert.equal(installed, 1);
  });

  it('does nothing when no update is ready', () => {
    updaterState.updateReadyToInstall = false;
    let installed = 0;
    globalThis.window = { electronAPI: { installUpdate: () => { installed += 1; } } };

    installUpdateIfIdleReady();

    assert.equal(installed, 0);
  });
});
