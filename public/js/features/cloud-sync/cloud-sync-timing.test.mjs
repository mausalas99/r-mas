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
  CLOUD_POLL_ERROR_MAX_MS,
  nextCloudPollDelayMs,
  isCloudRateLimitError,
  isCloudBackoffError,
  isCloudTransientServerError,
  isCloudPermanentError,
  jitterMs,
  createDrainPacer,
  retryAfterMsFromError,
  CLOUD_CWND_MAX_OPS,
  CLOUD_CWND_MIN_OPS,
  CLOUD_CHUNK_GAP_MIN_MS,
  CLOUD_CHUNK_GAP_MAX_MS,
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

  it('backs off on errors, jittered so it is never the raw exponential value', () => {
    const streak1 = nextCloudPollDelayMs({ errored: true, errorStreak: 1 });
    assert.ok(streak1 >= CLOUD_POLL_ERROR_MIN_MS / 2 && streak1 <= CLOUD_POLL_ERROR_MIN_MS);
    const streak3 = nextCloudPollDelayMs({ errorStreak: 3 });
    assert.ok(streak3 > CLOUD_POLL_ERROR_MIN_MS / 2);
  });

  it('accepts an injectable random for deterministic jitter in tests', () => {
    assert.equal(
      nextCloudPollDelayMs({ errored: true, errorStreak: 1, random: () => 0 }),
      CLOUD_POLL_ERROR_MIN_MS / 2
    );
    assert.equal(
      nextCloudPollDelayMs({ errored: true, errorStreak: 1, random: () => 1 }),
      CLOUD_POLL_ERROR_MIN_MS
    );
  });
});

describe('jitterMs', () => {
  it('is equal jitter: half base fixed, half random, never zero', () => {
    assert.equal(jitterMs(1000, () => 0), 500);
    assert.equal(jitterMs(1000, () => 1), 1000);
    assert.equal(jitterMs(1000, () => 0.5), 750);
  });
});

describe('createDrainPacer (AIMD)', () => {
  it('starts at the ceiling: 16 ops, 250ms gap', () => {
    const pacer = createDrainPacer({ random: () => 0 });
    assert.equal(pacer.chunkOps(), CLOUD_CWND_MAX_OPS);
    assert.equal(pacer.gapMs(), CLOUD_CHUNK_GAP_MIN_MS / 2);
  });

  it('halves the window and doubles the gap on congestion, floors at 4 ops', () => {
    const pacer = createDrainPacer({ random: () => 0 });
    pacer.onCongested({});
    assert.equal(pacer.chunkOps(), 8);
    assert.equal(pacer.gapMs(), CLOUD_CHUNK_GAP_MIN_MS); // 500ms base, jitter(0) -> half
    pacer.onCongested({});
    assert.equal(pacer.chunkOps(), 4);
    pacer.onCongested({});
    assert.equal(pacer.chunkOps(), CLOUD_CWND_MIN_OPS, 'never drops below the 4-op floor');
  });

  it('caps the gap at 8s no matter how many congestion events pile up', () => {
    const pacer = createDrainPacer({ random: () => 0 });
    for (let i = 0; i < 10; i += 1) pacer.onCongested({});
    assert.ok(pacer.gapMs() <= CLOUD_CHUNK_GAP_MAX_MS);
  });

  it('recovers by +1 op and -250ms gap per clean chunk', () => {
    const pacer = createDrainPacer({ random: () => 0 });
    pacer.onCongested({});
    assert.equal(pacer.chunkOps(), 8);
    pacer.onClean();
    assert.equal(pacer.chunkOps(), 9);
    // Gap was doubled to 500ms by onCongested, then -250ms per clean chunk.
    assert.equal(pacer.gapMs(), CLOUD_CHUNK_GAP_MIN_MS / 2);
  });

  it('never grows the window past the 16-op ceiling', () => {
    const pacer = createDrainPacer({ random: () => 0 });
    for (let i = 0; i < 30; i += 1) pacer.onClean();
    assert.equal(pacer.chunkOps(), CLOUD_CWND_MAX_OPS);
  });

  it('a Retry-After header wins over the doubled gap when it asks for longer', () => {
    const pacer = createDrainPacer({ random: () => 0 });
    pacer.onCongested({ retryAfterMs: 6000 });
    assert.equal(pacer.gapMs(), 3000); // half of 6000 with random()=0
  });

  it('gapMs is jittered — never exactly the raw gap value', () => {
    const pacer = createDrainPacer({ random: () => 1 });
    assert.equal(pacer.gapMs(), CLOUD_CHUNK_GAP_MIN_MS);
    assert.equal(retryAfterMsFromError({}, 0), 0);
  });
});

describe('isCloudPermanentError', () => {
  it('is true for client errors a retry cannot fix', () => {
    for (const status of [400, 401, 403, 404, 413, 426]) {
      assert.equal(isCloudPermanentError({ status }), true);
    }
  });

  it('is false for a revision race, true for other 409s', () => {
    assert.equal(isCloudPermanentError({ status: 409, data: { error: 'revision_stale' } }), false);
    assert.equal(isCloudPermanentError({ status: 409, data: { error: 'conflict' } }), false);
    assert.equal(isCloudPermanentError({ status: 409, data: { error: 'duplicate_client' } }), true);
  });

  it('is false for transient/backoff-class statuses', () => {
    assert.equal(isCloudPermanentError({ status: 503 }), false);
    assert.equal(isCloudPermanentError({ status: 500 }), false);
    assert.equal(isCloudPermanentError({ status: 429 }), false);
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

  it('treats a 500 D1-overload message as transient, but a plain 500 as not', () => {
    assert.equal(
      isCloudTransientServerError({ status: 500, data: { message: 'D1_ERROR: D1 DB is overloaded' } }),
      true
    );
    assert.equal(
      isCloudTransientServerError({ status: 500, message: 'queued for too long' }),
      true
    );
    assert.equal(isCloudTransientServerError({ status: 500, data: { message: 'internal_error' } }), false);
  });
});
