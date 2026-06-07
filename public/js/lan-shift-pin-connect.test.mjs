import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getShiftPinCooldownMs,
  recordShiftPinFailure,
  resetShiftPinBackoff,
} from './lan-shift-pin-connect.mjs';

describe('lan-shift-pin-connect backoff', () => {
  beforeEach(() => {
    resetShiftPinBackoff();
  });

  it('starts at 12s and backs off through 30/60/120', () => {
    assert.equal(getShiftPinCooldownMs(), 12_000);
    recordShiftPinFailure();
    assert.equal(getShiftPinCooldownMs(), 30_000);
    recordShiftPinFailure();
    assert.equal(getShiftPinCooldownMs(), 60_000);
    recordShiftPinFailure();
    assert.equal(getShiftPinCooldownMs(), 120_000);
    recordShiftPinFailure();
    assert.equal(getShiftPinCooldownMs(), 120_000);
  });

  it('resets on resetShiftPinBackoff', () => {
    recordShiftPinFailure();
    recordShiftPinFailure();
    assert.equal(getShiftPinCooldownMs(), 60_000);
    resetShiftPinBackoff();
    assert.equal(getShiftPinCooldownMs(), 12_000);
  });
});
