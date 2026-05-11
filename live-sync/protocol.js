const crypto = require('crypto');

function base64Url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

function createSessionToken() {
  return base64Url(crypto.randomBytes(32));
}

function createDeviceId(existing) {
  if (existing && typeof existing === 'string') return existing;
  return 'dev-' + base64Url(crypto.randomBytes(16));
}

function makeWireMessage(input) {
  return {
    ok: true,
    kind: input.kind,
    payload: input.payload || null,
    sentAt: input.sentAt || new Date().toISOString(),
  };
}

function parseWireMessage(raw) {
  try {
    const msg = JSON.parse(String(raw || ''));
    if (!msg || msg.ok !== true || typeof msg.kind !== 'string') {
      return { ok: false, error: 'invalid-message' };
    }
    return msg;
  } catch (_err) {
    return { ok: false, error: 'invalid-json' };
  }
}

function isTokenAccepted(expected, incoming) {
  return String(expected || '') === String(incoming || '');
}

module.exports = {
  createSessionToken,
  createDeviceId,
  makeWireMessage,
  parseWireMessage,
  isTokenAccepted,
};
