import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueueOutbox,
  drainOutbox,
  outboxSize,
  peekOutbox,
} from './live-sync-outbox.mjs';

function mockLocalStorage() {
  global.localStorage = {
    _d: {},
    getItem(k) {
      return this._d[k] ?? null;
    },
    setItem(k, v) {
      this._d[k] = v;
    },
    removeItem(k) {
      delete this._d[k];
    },
  };
}

test('enqueue and drain per roomId', () => {
  mockLocalStorage();
  enqueueOutbox('room1', {
    kind: 'bundle',
    payload: { type: 'livesync:bundle', roomId: 'room1' },
  });
  assert.equal(outboxSize('room1'), 1);
  assert.equal(outboxSize('room2'), 0);
  const items = drainOutbox('room1');
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, 'bundle');
  assert.equal(outboxSize('room1'), 0);
});

test('peek does not drain', () => {
  mockLocalStorage();
  enqueueOutbox('r', { kind: 'patch', payload: { type: 'livesync:patch' } });
  assert.equal(peekOutbox('r').length, 1);
  assert.equal(outboxSize('r'), 1);
});
