import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRoomWsController,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  RECONNECT_MIN_MS,
} from './room-sync-ws-internals.mjs';

/** Mock sockets: open/close/message are fired by the test, never on their own. */
let sockets;
class MockWs {
  constructor(url) {
    this.url = url;
    this.sent = [];
    sockets.push(this);
  }
  send(data) { this.sent.push(data); }
  close() { this.closed = true; }
}

function controller() {
  const seen = { transports: [], ops: [] };
  const ctl = createRoomWsController({
    getBaseUrl: () => 'https://sync.example.com',
    getToken: () => 't',
    getRoomId: () => 'room-1',
    getRevision: () => 1,
    onOpsMessage: (ops, rev) => seen.ops.push(rev),
    onTransportChange: (t) => seen.transports.push(t),
  });
  return { ctl, seen };
}

const opsMsg = (rev) => JSON.stringify({ type: 'revision', revision: rev, ops: [{ path: 'x', value: 1 }] });

describe('room WS: a replaced socket cannot touch the current one', () => {
  let original;
  beforeEach(() => {
    sockets = [];
    original = globalThis.WebSocket;
    globalThis.WebSocket = MockWs;
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true });
    mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] });
  });
  afterEach(() => {
    mock.timers.reset();
    globalThis.WebSocket = original;
  });

  it('old onclose after resume: new socket stays live, transport ws, no extra reconnect', () => {
    const { ctl, seen } = controller();
    ctl.start();
    sockets[0].onopen();
    ctl.resume({ force: true });
    assert.equal(sockets.length, 2);
    sockets[1].onopen();
    sockets[0].onclose({ code: 1000 });
    assert.equal(ctl.getTransportState(), 'ws');
    mock.timers.tick(RECONNECT_MIN_MS * 5);
    assert.equal(sockets.length, 2, 'no reconnect from the old close');
    // Heartbeat of the new socket still runs.
    mock.timers.tick(20_000);
    assert.ok(sockets[1].sent.length >= 1, 'new socket still pings');
    ctl.stop();
  });

  it('old socket messages are ignored (no double-applied ops)', () => {
    const { ctl, seen } = controller();
    ctl.start();
    sockets[0].onopen();
    ctl.resume({ force: true });
    sockets[1].onopen();
    sockets[0].onmessage({ data: opsMsg(2) });
    sockets[1].onmessage({ data: opsMsg(2) });
    assert.deepEqual(seen.ops, [2]);
    ctl.stop();
  });

  it('old onopen after it was replaced does not flip transport or start a heartbeat', () => {
    const { ctl, seen } = controller();
    ctl.start();
    ctl.resume();
    sockets[0].onopen();
    assert.equal(ctl.getTransportState(), 'poll');
    assert.ok(!seen.transports.includes('ws'));
    ctl.stop();
  });

  it('current socket close still reconnects', () => {
    const { ctl } = controller();
    ctl.start();
    sockets[0].onopen();
    sockets[0].onclose({ code: 1006 });
    assert.equal(ctl.getTransportState(), 'poll');
    mock.timers.tick(RECONNECT_MIN_MS);
    assert.equal(sockets.length, 2);
    ctl.stop();
  });

  it('heartbeat timeout reconnects even when the dead socket never fires onclose', () => {
    const { ctl } = controller();
    ctl.start();
    sockets[0].onopen();
    mock.timers.tick(HEARTBEAT_TIMEOUT_MS + 20_000);
    assert.ok(sockets[0].closed);
    assert.equal(ctl.getTransportState(), 'poll');
    mock.timers.tick(RECONNECT_MIN_MS);
    assert.equal(sockets.length, 2);
    ctl.stop();
  });

  it('pause: the late onclose of the paused socket does not reconnect', () => {
    const { ctl } = controller();
    ctl.start();
    sockets[0].onopen();
    ctl.pause();
    sockets[0].onclose({ code: 1000 });
    mock.timers.tick(RECONNECT_MIN_MS * 5);
    assert.equal(sockets.length, 1);
    ctl.resume();
    assert.equal(sockets.length, 2);
    ctl.stop();
  });

  // Ways the faster reconnect can go wrong:
  // 1. a dead socket still takes up to 60 s to notice (20 s / 45 s);
  // 2. focus (fires often on desktop) churns a healthy socket;
  // 3. focus or online waits out a long reconnect backoff (up to 30 s);
  // 4. online keeps a socket that looks open but died with the network.
  it('heartbeat is 10 s / 25 s: a silent dead socket is dropped within 35 s', () => {
    assert.equal(HEARTBEAT_INTERVAL_MS, 10_000);
    assert.equal(HEARTBEAT_TIMEOUT_MS, 25_000);
    const { ctl } = controller();
    ctl.start();
    sockets[0].onopen();
    mock.timers.tick(35_000);
    assert.ok(sockets[0].closed);
    ctl.stop();
  });

  it('resume on a live socket keeps it', () => {
    const { ctl } = controller();
    ctl.start();
    sockets[0].onopen();
    mock.timers.tick(5_000);
    sockets[0].onmessage({ data: JSON.stringify({ type: 'pong' }) });
    ctl.resume();
    assert.equal(sockets.length, 1);
    assert.ok(!sockets[0].closed);
    ctl.stop();
  });

  it('resume during a reconnect backoff connects at once', () => {
    const { ctl } = controller();
    ctl.start();
    for (let i = 0; i < 6; i += 1) {
      sockets[sockets.length - 1].onclose({ code: 1006 });
      mock.timers.tick(30_000);
    }
    sockets[sockets.length - 1].onclose({ code: 1006 });
    const before = sockets.length;
    ctl.resume();
    assert.equal(sockets.length, before + 1);
    ctl.stop();
  });

  it('resume({ force: true }) replaces a socket that still looks live', () => {
    const { ctl } = controller();
    ctl.start();
    sockets[0].onopen();
    ctl.resume({ force: true });
    assert.equal(sockets.length, 2);
    assert.ok(sockets[0].closed);
    ctl.stop();
  });
});
