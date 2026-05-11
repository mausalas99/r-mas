const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createSessionToken,
  createDeviceId,
  makeWireMessage,
  parseWireMessage,
  isTokenAccepted,
} = require('./protocol');

test('createSessionToken returns url-safe token', () => {
  const token = createSessionToken();
  assert.match(token, /^[A-Za-z0-9_-]{32,}$/);
});

test('createDeviceId is stable when stored id exists', () => {
  assert.equal(createDeviceId('dev-existing'), 'dev-existing');
});

test('makeWireMessage and parseWireMessage round trip', () => {
  const wire = makeWireMessage({ kind: 'event', payload: { eventId: 'evt-1' } });
  const parsed = parseWireMessage(JSON.stringify(wire));
  assert.deepEqual(parsed, wire);
});

test('parseWireMessage accepts a valid message from makeWireMessage', () => {
  const wire = makeWireMessage({ kind: 'hello', payload: { deviceId: 'dev-1' } });
  assert.deepEqual(parseWireMessage(JSON.stringify(wire)), wire);
});

test('parseWireMessage rejects invalid JSON', () => {
  assert.deepEqual(parseWireMessage('nope'), { ok: false, error: 'invalid-json' });
});

test('parseWireMessage rejects empty kind', () => {
  const raw = JSON.stringify({
    ok: true,
    kind: '',
    payload: null,
    sentAt: new Date().toISOString(),
  });
  assert.deepEqual(parseWireMessage(raw), { ok: false, error: 'invalid-message' });
});

test('parseWireMessage rejects unknown kind', () => {
  const raw = JSON.stringify({
    ok: true,
    kind: 'unknown',
    payload: null,
    sentAt: new Date().toISOString(),
  });
  assert.deepEqual(parseWireMessage(raw), { ok: false, error: 'invalid-message' });
});

test('parseWireMessage rejects invalid sentAt', () => {
  const raw = JSON.stringify({
    ok: true,
    kind: 'event',
    payload: null,
    sentAt: 'not-a-date',
  });
  assert.deepEqual(parseWireMessage(raw), { ok: false, error: 'invalid-message' });
});

test('parseWireMessage rejects non-object payload', () => {
  const raw = JSON.stringify({
    ok: true,
    kind: 'event',
    payload: 'evt-1',
    sentAt: new Date().toISOString(),
  });
  assert.deepEqual(parseWireMessage(raw), { ok: false, error: 'invalid-message' });
});

test('isTokenAccepted compares exact token', () => {
  assert.equal(isTokenAccepted('', ''), false);
  assert.equal(isTokenAccepted('abc', ''), false);
  assert.equal(isTokenAccepted('', 'abc'), false);
  assert.equal(isTokenAccepted(null, null), false);
  assert.equal(isTokenAccepted(123, 123), false);
  assert.equal(isTokenAccepted('abc', 'abc'), true);
  assert.equal(isTokenAccepted('abc', 'xyz'), false);
});

const { startLanHost, connectLanPeer, chooseLanHostAddress } = require('./lan-transport');
const WebSocket = require('ws');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function connectRawSocket(url) {
  const socket = new WebSocket(url);
  return new Promise((resolve, reject) => {
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function closeRawSocket(socket) {
  if (!socket || socket.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise((resolve) => {
    socket.once('close', () => resolve());
    socket.close();
  });
}

test('chooseLanHostAddress selects first non-internal IPv4 with loopback fallback', () => {
  assert.equal(chooseLanHostAddress({
    lo0: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    en0: [{ family: 'IPv6', address: 'fe80::1', internal: false }],
    en1: [{ family: 'IPv4', address: '192.168.1.10', internal: false }],
    en2: [{ family: 'IPv4', address: '10.0.0.5', internal: false }],
  }), '192.168.1.10');

  assert.equal(chooseLanHostAddress({
    lo0: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
  }), '127.0.0.1');
});

test('LAN host advertises hostAddress override', async () => {
  const host = await startLanHost({
    token: 'tok',
    preferredPort: 0,
    hostAddress: '127.0.0.1',
  });

  assert.match(host.url, /^ws:\/\/127\.0\.0\.1:\d+\/sync\?token=tok$/);

  await host.close();
});

test('LAN host and peer exchange one message', async () => {
  const host = await startLanHost({ token: 'tok', preferredPort: 0, hostAddress: '127.0.0.1' });
  const received = [];
  host.onMessage((msg) => received.push(msg));

  const peer = await connectLanPeer({
    url: host.url,
    token: 'tok',
    timeoutMs: 1000,
  });

  peer.send({ kind: 'hello', payload: { from: 'peer' } });
  await wait(80);

  assert.equal(received.length, 1);
  assert.equal(received[0].kind, 'hello');

  await peer.close();
  await host.close();
});

test('LAN peer rejects wrong token', async () => {
  const host = await startLanHost({ token: 'tok', preferredPort: 0, hostAddress: '127.0.0.1' });

  await assert.rejects(
    () => connectLanPeer({ url: host.url, token: 'wrong', timeoutMs: 1000 }),
    /unexpected server response|socket hang up|bad-token|401/i
  );

  await host.close();
});

test('LAN host ignores invalid frames', async () => {
  const host = await startLanHost({ token: 'tok', preferredPort: 0, hostAddress: '127.0.0.1' });
  const received = [];
  host.onMessage((msg) => received.push(msg));

  const socket = await connectRawSocket(host.url);
  socket.send('not-json');
  await wait(80);

  assert.equal(received.length, 0);

  await closeRawSocket(socket);
  await host.close();
});

test('LAN host close is idempotent and closes connected peer', async () => {
  const host = await startLanHost({ token: 'tok', preferredPort: 0, hostAddress: '127.0.0.1' });
  const peer = await connectLanPeer({
    url: host.url,
    token: 'tok',
    timeoutMs: 1000,
  });

  await Promise.race([
    host.close(),
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error('host close timed out')), 1000)),
  ]);
  await Promise.race([
    host.close(),
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error('second host close timed out')), 1000)),
  ]);
  await Promise.race([
    peer.close(),
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error('peer close timed out')), 1000)),
  ]);
});
