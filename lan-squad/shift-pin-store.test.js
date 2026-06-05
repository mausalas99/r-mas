'use strict';

const assert = require('node:assert');
const { test } = require('node:test');
const { createShiftPinStore, endOfCalendarMonthMs } = require('./shift-pin-store.js');

test('shift PIN is reusable until expiry', () => {
  const token = 'x'.repeat(64);
  const store = createShiftPinStore({ getHostToken: () => token });
  const { pin } = store.ensure();

  const first = store.exchange(pin);
  const second = store.exchange(pin);
  assert.strictEqual(first.token, token);
  assert.strictEqual(second.token, token);
});

test('ensure expires at start of next calendar month', () => {
  const token = 'z'.repeat(64);
  const store = createShiftPinStore({ getHostToken: () => token });
  const now = new Date('2026-06-15T12:00:00').getTime();
  const { expiresAt } = store.ensure(now);
  assert.strictEqual(expiresAt, new Date('2026-07-01T00:00:00').toISOString());
  assert.strictEqual(endOfCalendarMonthMs(now), new Date('2026-07-01T00:00:00').getTime());
});

test('regenerate invalidates previous shift PIN', () => {
  const token = 'y'.repeat(64);
  const store = createShiftPinStore({ getHostToken: () => token });
  const old = store.ensure().pin;
  const fresh = store.regenerate().pin;

  assert.notStrictEqual(old, fresh);
  assert.strictEqual(store.exchange(old), null);
  assert.strictEqual(store.exchange(fresh).token, token);
});
