import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudPollScheduler } from './sync-runtime-schedule.mjs';

/** Scheduler with fake timers, a counting syncCycle and a controllable probe. */
function setup(probeImpl, { pending = 1 } = {}) {
  mock.timers.enable({ apis: ['setTimeout'] });
  // Top of the jitter range: the 30 s backoff lands at ~30 s and each ping at
  // ~10 s. Random jitter let the backoff fire at 15–20 s, inside the 20 s window.
  mock.method(Math, 'random', () => 0.999);
  const calls = { sync: 0, probe: 0, recovered: 0 };
  const scheduler = createCloudPollScheduler({
    syncCycle: () => { calls.sync += 1; },
    pendingCount: () => pending,
    getLastLocalWriteAt: () => 0,
    drainPacer: { onCongested() {} },
    probe: () => { calls.probe += 1; return probeImpl(); },
    onRecovered: () => { calls.recovered += 1; },
  });
  return { scheduler, calls };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
async function advance(ms) {
  mock.timers.tick(ms);
  await flush();
  await flush();
}

test('unreachable Worker: the first ping that answers runs the sync within ~10 s, not after the 30 s backoff', async (t) => {
  t.after(() => { mock.timers.reset(); mock.restoreAll(); });
  const { scheduler, calls } = setup(() => Promise.resolve({ ok: true }));
  scheduler.noteFailure(new TypeError('fetch failed'));
  await advance(10_000);
  assert.equal(calls.probe, 1);
  assert.equal(calls.sync, 1);
  scheduler.stop();
});

test('probe keeps pinging while the Worker is still down', async (t) => {
  t.after(() => { mock.timers.reset(); mock.restoreAll(); });
  const { scheduler, calls } = setup(() => Promise.reject(new TypeError('fetch failed')));
  scheduler.noteFailure(new TypeError('fetch failed'));
  await advance(10_000);
  await advance(10_000);
  assert.equal(calls.probe, 2);
  assert.equal(calls.sync, 0);
  scheduler.stop();
});

test('overloaded Worker (503 / 429): no extra pings on top of the backoff', async (t) => {
  t.after(() => { mock.timers.reset(); mock.restoreAll(); });
  const { scheduler, calls } = setup(() => Promise.resolve({ ok: true }));
  scheduler.noteFailure(Object.assign(new Error('busy'), { status: 503 }));
  await advance(20_000);
  assert.equal(calls.probe, 0);
  scheduler.noteFailure(Object.assign(new Error('slow down'), { status: 429 }));
  await advance(20_000);
  assert.equal(calls.probe, 0);
  scheduler.stop();
});

test('a successful cycle or stop() ends the probing', async (t) => {
  t.after(() => { mock.timers.reset(); mock.restoreAll(); });
  const { scheduler, calls } = setup(() => Promise.reject(new TypeError('fetch failed')));
  scheduler.noteFailure(new TypeError('fetch failed'));
  scheduler.noteSuccess();
  await advance(20_000);
  assert.equal(calls.probe, 0);
  scheduler.noteFailure(new TypeError('fetch failed'));
  scheduler.stop();
  await advance(20_000);
  assert.equal(calls.probe, 0);
});

test('right after the Worker comes back, a device with nothing queued polls at the active rate (catch up on peers)', async (t) => {
  t.after(() => { mock.timers.reset(); mock.restoreAll(); });
  const { scheduler, calls } = setup(() => Promise.resolve({ ok: true }), { pending: 0 });
  scheduler.noteFailure(new TypeError('fetch failed'));
  scheduler.noteSuccess();
  await advance(8_000); // active fallback poll, not the 20 s idle one
  assert.equal(calls.sync, 1);
  scheduler.stop();
});

test('without a recent outage, an idle device keeps the idle poll', async (t) => {
  t.after(() => { mock.timers.reset(); mock.restoreAll(); });
  const { scheduler, calls } = setup(() => Promise.resolve({ ok: true }), { pending: 0 });
  scheduler.noteSuccess();
  await advance(8_000);
  assert.equal(calls.sync, 0);
  await advance(12_000);
  assert.equal(calls.sync, 1);
  scheduler.stop();
});

test('recovering from an unreachable Worker fires onRecovered once (sala-room catch-up); overload recovery does not', async (t) => {
  t.after(() => { mock.timers.reset(); mock.restoreAll(); });
  const { scheduler, calls } = setup(() => Promise.reject(new TypeError('fetch failed')), { pending: 0 });
  scheduler.noteFailure(new TypeError('fetch failed'));
  scheduler.noteFailure(new TypeError('fetch failed'));
  scheduler.noteSuccess();
  scheduler.noteSuccess();
  assert.equal(calls.recovered, 1);
  scheduler.noteFailure(Object.assign(new Error('busy'), { status: 503 }));
  scheduler.noteSuccess();
  assert.equal(calls.recovered, 1);
  scheduler.stop();
});
