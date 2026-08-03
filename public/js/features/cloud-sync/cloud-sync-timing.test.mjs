import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_POLL_IDLE_MS,
  CLOUD_POLL_ACTIVE_MS,
  CLOUD_POLL_ERROR_MIN_MS,
  nextCloudPollDelayMs,
  isCloudRateLimitError,
} from './cloud-sync-timing.mjs';

describe('nextCloudPollDelayMs', () => {
  it('uses idle interval by default', () => {
    assert.equal(nextCloudPollDelayMs({ now: 1_000_000 }), CLOUD_POLL_IDLE_MS);
  });

  it('speeds up after recent local write', () => {
    assert.equal(
      nextCloudPollDelayMs({ now: 1_000_000, lastLocalWriteAt: 980_000 }),
      CLOUD_POLL_ACTIVE_MS
    );
  });

  it('backs off on errors', () => {
    assert.equal(nextCloudPollDelayMs({ errored: true, errorStreak: 1 }), CLOUD_POLL_ERROR_MIN_MS);
    assert.ok(nextCloudPollDelayMs({ errorStreak: 3 }) > CLOUD_POLL_ERROR_MIN_MS);
  });
});

describe('isCloudRateLimitError', () => {
  it('detects 429 and message patterns', () => {
    assert.equal(isCloudRateLimitError({ status: 429 }), true);
    assert.equal(isCloudRateLimitError({ message: 'Demasiados intentos' }), true);
    assert.equal(isCloudRateLimitError({ status: 500 }), false);
  });
});
