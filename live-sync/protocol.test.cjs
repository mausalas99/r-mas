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

test('parseWireMessage rejects invalid JSON', () => {
  assert.deepEqual(parseWireMessage('nope'), { ok: false, error: 'invalid-json' });
});

test('isTokenAccepted compares exact token', () => {
  assert.equal(isTokenAccepted('abc', 'abc'), true);
  assert.equal(isTokenAccepted('abc', 'xyz'), false);
});
