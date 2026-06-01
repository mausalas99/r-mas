import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  vitalsIntervalMs,
  BackgroundVitalsMonitorLoop,
  ClientSessionInactivityLocker,
} from './session-manager.mjs';

describe('vitalsIntervalMs', () => {
  it('maps frequency strings to milliseconds', () => {
    assert.equal(vitalsIntervalMs('1h'), 3600000);
    assert.equal(vitalsIntervalMs('2h'), 7200000);
    assert.equal(vitalsIntervalMs('Shift_Once'), 8 * 3600000);
    assert.equal(vitalsIntervalMs('unknown'), 4 * 3600000);
  });
});

describe('BackgroundVitalsMonitorLoop', () => {
  it('fires overdue notification when check is breached', async () => {
    const notifications = [];
    const db = {
      all: async () => [
        {
          patient_id: 'pat-1',
          last_vitals_check: new Date(Date.now() - 2 * 3600000).toISOString(),
          vitals_frequency: '1h',
        },
      ],
    };
    const loop = new BackgroundVitalsMonitorLoop(db, 'user-1', {
      notify: (title, body) => notifications.push({ title, body }),
    });
    await loop.scan();
    assert.equal(notifications.length, 1);
    assert.match(notifications[0].title, /Overdue/);
  });

  it('skips None frequency rows', async () => {
    const notifications = [];
    const db = {
      all: async () => [
        {
          patient_id: 'pat-1',
          last_vitals_check: new Date(Date.now() - 10 * 3600000).toISOString(),
          vitals_frequency: 'None',
        },
      ],
    };
    const loop = new BackgroundVitalsMonitorLoop(db, 'user-1', {
      notify: (title, body) => notifications.push({ title, body }),
    });
    await loop.scan();
    assert.equal(notifications.length, 0);
  });

  it('fires warning when within 15 minutes of due', async () => {
    const notifications = [];
    const db = {
      all: async () => [
        {
          patient_id: 'pat-2',
          last_vitals_check: new Date(Date.now() - (3600000 - 10 * 60000)).toISOString(),
          vitals_frequency: '1h',
        },
      ],
    };
    const loop = new BackgroundVitalsMonitorLoop(db, 'user-1', {
      notify: (title, body) => notifications.push({ title, body }),
    });
    await loop.scan();
    assert.equal(notifications.length, 1);
    assert.match(notifications[0].title, /Warning/);
  });
});

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
});
