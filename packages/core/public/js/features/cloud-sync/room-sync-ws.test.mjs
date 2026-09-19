import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRoomSyncWs } from './room-sync-ws.mjs';
import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  RECONNECT_MIN_MS,
} from './room-sync-ws-internals.mjs';

describe('createRoomSyncWs', () => {
  it('builds live websocket url with token and revision', () => {
    let builtUrl = '';
    const original = globalThis.WebSocket;
    globalThis.WebSocket = class MockWs {
      constructor(url) {
        builtUrl = url;
        this.onopen = null;
        this.onclose = null;
      }
      close() {}
    };

    const ws = createRoomSyncWs({
      getBaseUrl: () => 'https://sync.example.com',
      getToken: () => 'token-abc',
      getRoomId: () => 'room-1',
      getRevision: () => 12,
    });
    ws.start();
    assert.match(builtUrl, /^wss:\/\/sync\.example\.com\/api\/sync\/v1\/rooms\/room-1\/live/);
    assert.match(builtUrl, /access_token=token-abc/);
    assert.match(builtUrl, /revision=12/);
    ws.stop();
    globalThis.WebSocket = original;
  });

  it('onRevisionHint fires when remote revision is ahead', () => {
    const hints = [];
    const prevOnline = Object.getOwnPropertyDescriptor(globalThis.navigator || {}, 'onLine');
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    const original = globalThis.WebSocket;
    globalThis.WebSocket = class MockWs {
      constructor() {
        setTimeout(() => {
          if (this.onopen) this.onopen();
          if (this.onmessage) {
            this.onmessage({
              data: JSON.stringify({ type: 'revision', revision: 99 }),
            });
          }
        }, 0);
      }
      close() {}
    };

    const ws = createRoomSyncWs({
      getBaseUrl: () => 'https://sync.example.com',
      getToken: () => 't',
      getRoomId: () => 'r',
      getRevision: () => 10,
      onRevisionHint: (rev) => hints.push(rev),
    });
    ws.start();
    return new Promise((resolve) => {
      setTimeout(() => {
        assert.deepEqual(hints, [99]);
        assert.equal(ws.getTransportState(), 'ws');
        ws.stop();
        globalThis.WebSocket = original;
        if (prevOnline) Object.defineProperty(globalThis.navigator, 'onLine', prevOnline);
        resolve();
      }, 400);
    });
  });

  it('onOpsMessage fires with the carried ops when the broadcast has them (instant apply, Part C)', () => {
    const opsMessages = [];
    const hints = [];
    const prevOnline = Object.getOwnPropertyDescriptor(globalThis.navigator || {}, 'onLine');
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true });
    const original = globalThis.WebSocket;
    const ops = [{ path: 'entries/p1/note', value: { text: 'estable' } }];
    globalThis.WebSocket = class MockWs {
      constructor() {
        setTimeout(() => {
          if (this.onopen) this.onopen();
          if (this.onmessage) {
            this.onmessage({ data: JSON.stringify({ type: 'revision', revision: 7, ops }) });
          }
        }, 0);
      }
      close() {}
    };

    const ws = createRoomSyncWs({
      getBaseUrl: () => 'https://sync.example.com',
      getToken: () => 't',
      getRoomId: () => 'r',
      getRevision: () => 5,
      onRevisionHint: (rev) => hints.push(rev),
      onOpsMessage: (msgOps, rev) => opsMessages.push({ ops: msgOps, rev }),
    });
    ws.start();
    return new Promise((resolve) => {
      setTimeout(() => {
        assert.deepEqual(opsMessages, [{ ops, rev: 7 }]);
        // The debounced fallback still queues (safety net) — see assertion in
        // sync-runtime-cycle.test.mjs that it becomes a no-op once local revision
        // catches up, rather than testing the internal debounce timing here.
        assert.deepEqual(hints, [7]);
        ws.stop();
        globalThis.WebSocket = original;
        if (prevOnline) Object.defineProperty(globalThis.navigator, 'onLine', prevOnline);
        resolve();
      }, 400);
    });
  });

  it('a bare-revision message (no ops, size-cap fallback) never calls onOpsMessage', () => {
    const opsMessages = [];
    const prevOnline = Object.getOwnPropertyDescriptor(globalThis.navigator || {}, 'onLine');
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true });
    const original = globalThis.WebSocket;
    globalThis.WebSocket = class MockWs {
      constructor() {
        setTimeout(() => {
          if (this.onopen) this.onopen();
          if (this.onmessage) this.onmessage({ data: JSON.stringify({ type: 'revision', revision: 8 }) });
        }, 0);
      }
      close() {}
    };

    const ws = createRoomSyncWs({
      getBaseUrl: () => 'https://sync.example.com',
      getToken: () => 't',
      getRoomId: () => 'r',
      getRevision: () => 5,
      onOpsMessage: (msgOps, rev) => opsMessages.push({ ops: msgOps, rev }),
    });
    ws.start();
    return new Promise((resolve) => {
      setTimeout(() => {
        assert.deepEqual(opsMessages, []);
        ws.stop();
        globalThis.WebSocket = original;
        if (prevOnline) Object.defineProperty(globalThis.navigator, 'onLine', prevOnline);
        resolve();
      }, 400);
    });
  });

  it('pings on an interval so an idle iOS socket does not get NAT-dropped silently', () => {
    const prevOnline = Object.getOwnPropertyDescriptor(globalThis.navigator || {}, 'onLine');
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true });
    const original = globalThis.WebSocket;
    const sent = [];
    globalThis.WebSocket = class MockWs {
      constructor() {
        this.onopen = null;
        this.onclose = null;
        setTimeout(() => this.onopen?.(), 0);
      }
      send(msg) {
        sent.push(msg);
      }
      close() {}
    };
    mock.timers.enable({ apis: ['setInterval', 'setTimeout', 'Date'] });
    try {
      const ws = createRoomSyncWs({
        getBaseUrl: () => 'https://sync.example.com',
        getToken: () => 't',
        getRoomId: () => 'r',
        getRevision: () => 1,
      });
      ws.start();
      mock.timers.tick(0); // flush the deferred onopen
      mock.timers.tick(HEARTBEAT_INTERVAL_MS);
      assert.match(sent[0] || '', /"type":"ping"/);
      ws.stop();
    } finally {
      mock.timers.reset();
      globalThis.WebSocket = original;
      if (prevOnline) Object.defineProperty(globalThis.navigator, 'onLine', prevOnline);
    }
  });

  it('force-reconnects a socket gone silent past the heartbeat timeout — the iOS zombie-socket case', () => {
    const prevOnline = Object.getOwnPropertyDescriptor(globalThis.navigator || {}, 'onLine');
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, get: () => true });
    const original = globalThis.WebSocket;
    let constructed = 0;
    let closed = 0;
    globalThis.WebSocket = class MockWs {
      constructor() {
        constructed += 1;
        this.onopen = null;
        this.onclose = null;
        setTimeout(() => this.onopen?.(), 0);
      }
      send() {}
      close() {
        closed += 1;
        this.onclose?.({ code: 1006, reason: 'stale' });
      }
    };
    mock.timers.enable({ apis: ['setInterval', 'setTimeout', 'Date'] });
    try {
      const ws = createRoomSyncWs({
        getBaseUrl: () => 'https://sync.example.com',
        getToken: () => 't',
        getRoomId: () => 'r',
        getRevision: () => 1,
      });
      ws.start();
      mock.timers.tick(0); // flush the deferred onopen
      mock.timers.tick(HEARTBEAT_TIMEOUT_MS + HEARTBEAT_INTERVAL_MS);
      assert.equal(closed, 1);
      mock.timers.tick(RECONNECT_MIN_MS); // the scheduled reconnect fires
      assert.equal(constructed, 2);
      ws.stop();
    } finally {
      mock.timers.reset();
      globalThis.WebSocket = original;
      if (prevOnline) Object.defineProperty(globalThis.navigator, 'onLine', prevOnline);
    }
  });
});
