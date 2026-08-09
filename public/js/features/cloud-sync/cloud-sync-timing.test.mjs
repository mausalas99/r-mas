import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_POLL_IDLE_MS,
  CLOUD_POLL_MOBILE_IDLE_MS,
  CLOUD_POLL_ACTIVE_MS,
  CLOUD_POLL_IDLE_WS_MS,
  CLOUD_POLL_MOBILE_IDLE_WS_MS,
  CLOUD_POLL_IDLE_FALLBACK_MS,
  CLOUD_POLL_ACTIVE_WS_MS,
  CLOUD_POLL_ACTIVE_FALLBACK_MS,
  CLOUD_POLL_ERROR_MIN_MS,
  nextCloudPollDelayMs,
  isCloudRateLimitError,
  isCloudBackoffError,
  isCloudTransientServerError,
} from './cloud-sync-timing.mjs';

describe('nextCloudPollDelayMs', () => {
  it('uses fallback idle when WS not connected', () => {
    assert.equal(nextCloudPollDelayMs({ now: 1_000_000 }), CLOUD_POLL_IDLE_MS);
    assert.equal(CLOUD_POLL_IDLE_MS, CLOUD_POLL_IDLE_FALLBACK_MS);
    assert.ok(CLOUD_POLL_IDLE_WS_MS > CLOUD_POLL_IDLE_FALLBACK_MS);
  });

  it('uses mobile fallback idle when mobile and not pending/active', () => {
    assert.equal(nextCloudPollDelayMs({ now: 1_000_000, mobile: true }), CLOUD_POLL_MOBILE_IDLE_MS);
    assert.ok(CLOUD_POLL_MOBILE_IDLE_WS_MS > CLOUD_POLL_MOBILE_IDLE_MS);
  });

  it('speeds up after recent local write on fallback transport', () => {
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

describe('nextCloudPollDelayMs transport', () => {
  it('uses relaxed idle interval when WS connected', () => {
    assert.equal(
      nextCloudPollDelayMs({ now: 1_000_000, transport: 'ws' }),
      CLOUD_POLL_IDLE_WS_MS
    );
    assert.ok(CLOUD_POLL_IDLE_WS_MS >= 60_000);
  });

  it('uses fallback idle when WS down', () => {
    assert.equal(
      nextCloudPollDelayMs({ now: 1_000_000, transport: 'poll' }),
      CLOUD_POLL_IDLE_FALLBACK_MS
    );
  });

  it('uses faster active interval on fallback transport after local write', () => {
    assert.equal(
      nextCloudPollDelayMs({
        now: 1_000_000,
        transport: 'poll',
        lastLocalWriteAt: 980_000,
      }),
      CLOUD_POLL_ACTIVE_FALLBACK_MS
    );
    assert.equal(
      nextCloudPollDelayMs({
        now: 1_000_000,
        transport: 'ws',
        lastLocalWriteAt: 980_000,
      }),
      CLOUD_POLL_ACTIVE_WS_MS
    );
  });
});

describe('isCloudRateLimitError', () => {
  it('detects 429 and message patterns', () => {
    assert.equal(isCloudRateLimitError({ status: 429 }), true);
    assert.equal(isCloudRateLimitError({ message: 'Demasiados intentos' }), true);
    assert.equal(isCloudRateLimitError({ status: 500 }), false);
  });

  it('treats transient 503 as rate-limit class for backoff', () => {
    assert.equal(isCloudTransientServerError({ status: 503 }), true);
    assert.equal(isCloudBackoffError({ status: 503 }), true);
    assert.equal(isCloudRateLimitError({ status: 503 }), false);
    assert.equal(isCloudTransientServerError({ status: 500 }), false);
  });
});
