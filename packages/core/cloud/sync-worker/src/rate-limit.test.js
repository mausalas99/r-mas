import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRateLimit,
  clearFailures,
  rateLimitKey,
  recordFailure,
  RATE_LIMIT_MAX,
} from './rate-limit.mjs';
import { SyncError } from './errors.js';

describe('rate-limit', () => {
  it('blocks after max failures for the same key', () => {
    const key = rateLimitKey('1.2.3.4', 'demo');
    clearFailures(key);
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      recordFailure(key);
    }
    assert.throws(() => checkRateLimit(key), (err) => {
      assert.ok(err instanceof SyncError);
      assert.equal(err.code, 'invalid_credentials');
      return true;
    });
    clearFailures(key);
  });

  it('uses ip-only keys for anonymous throttling', () => {
    assert.equal(rateLimitKey('9.9.9.9'), 'ip|9.9.9.9');
  });
});
