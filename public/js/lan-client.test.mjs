import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LanClient, parseWsPayload } from './lan-client.mjs';

describe('lan-client parseWsPayload', () => {
  it('parses valid json', () => {
    assert.deepStrictEqual(parseWsPayload('{"a":1}'), { a: 1 });
  });
  it('returns null on bad', () => {
    assert.strictEqual(parseWsPayload('not-json'), null);
  });
});

describe('LanClient live channel lifecycle', () => {
  it('ignores onclose from a replaced WebSocket (guard used in _openChannelWs)', () => {
    const state = { _liveWs: null, _liveConnected: true };
    const prop = '_liveWs';
    const ws1 = { id: 1 };
    const ws2 = { id: 2 };
    const onclose = (ws) => () => {
      if (state[prop] !== ws) return;
      state._liveConnected = false;
    };
    state[prop] = ws1;
    const close1 = onclose(ws1);
    state[prop] = ws2;
    state._liveConnected = true;
    close1();
    assert.strictEqual(state._liveConnected, true, 'stale onclose must not clear liveConnected');
    onclose(ws2)();
    assert.strictEqual(state._liveConnected, false);
  });

  it('isLiveChannelBusy when connecting or open for same room', () => {
    const client = new LanClient();
    client._liveRoomId = 'sala-e';
    client._liveWs = { readyState: WebSocket.CONNECTING };
    assert.strictEqual(client.isLiveChannelBusy('sala-e'), true);
    assert.strictEqual(client.isLiveChannelBusy('other'), false);
    client._liveWs = { readyState: WebSocket.OPEN };
    assert.strictEqual(client.isLiveChannelBusy('sala-e'), true);
    client._liveWs = { readyState: WebSocket.CLOSED };
    assert.strictEqual(client.isLiveChannelBusy('sala-e'), false);
  });
});
