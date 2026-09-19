import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ClientSessionInactivityLocker } from './session-manager.mjs';

describe('ClientSessionInactivityLocker', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setTimeout'] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it('clears decrypted key and shows overlay after timeout', () => {
    if (typeof document === 'undefined') return;
    const overlay = document.createElement('div');
    overlay.id = 'lock-overlay-test';
    document.body.appendChild(overlay);

    const ctx = { decryptedPrivateKeyPem: 'secret-key' };
    const locker = new ClientSessionInactivityLocker(10, 'lock-overlay-test');
    locker.timeout = 100;
    locker.start(ctx);

    mock.timers.tick(100);

    assert.equal(ctx.decryptedPrivateKeyPem, null);
    assert.ok(overlay.classList.contains('active-lock-view-overlay'));

    locker.stop();
    overlay.remove();
  });

  it('calls onLock once the idle overlay engages', () => {
    if (typeof document === 'undefined') return;
    const overlay = document.createElement('div');
    overlay.id = 'lock-overlay-test-onlock';
    document.body.appendChild(overlay);

    let called = 0;
    const locker = new ClientSessionInactivityLocker(10, 'lock-overlay-test-onlock', () => {
      called += 1;
    });
    locker.timeout = 100;
    locker.start({});

    mock.timers.tick(100);

    assert.equal(called, 1);

    locker.stop();
    overlay.remove();
  });
});
