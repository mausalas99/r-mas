import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRoomSyncWs } from './room-sync-ws.mjs';

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
});
