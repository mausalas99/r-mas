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
