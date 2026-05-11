const crypto = require('crypto');

const ALLOWED_KINDS = new Set(['hello', 'event', 'request-snapshot', 'encrypted']);

function base64Url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

function isObjectPayload(payload) {
  return payload === null || (typeof payload === 'object' && !Array.isArray(payload));
}

function isValidDateString(value) {
  return typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Date.parse(value));
}

function normalizePayload(payload) {
  return isObjectPayload(payload) ? payload : null;
}

function normalizeSentAt(sentAt) {
  return isValidDateString(sentAt) ? sentAt : new Date().toISOString();
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
    payload: normalizePayload(input.payload || null),
    sentAt: normalizeSentAt(input.sentAt),
  };
}

function parseWireMessage(raw) {
  try {
    const msg = JSON.parse(String(raw || ''));
    if (
      !msg ||
      typeof msg !== 'object' ||
      Array.isArray(msg) ||
      msg.ok !== true ||
      typeof msg.kind !== 'string' ||
      !ALLOWED_KINDS.has(msg.kind) ||
      !isObjectPayload(msg.payload) ||
      !isValidDateString(msg.sentAt)
    ) {
      return { ok: false, error: 'invalid-message' };
    }
    return msg;
  } catch (_err) {
    return { ok: false, error: 'invalid-json' };
  }
}

function isTokenAccepted(expected, incoming) {
  if (
    typeof expected !== 'string' ||
    typeof incoming !== 'string' ||
    expected.trim() === '' ||
    incoming.trim() === ''
  ) {
    return false;
  }

  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  const incomingHash = crypto.createHash('sha256').update(incoming).digest();
  return crypto.timingSafeEqual(expectedHash, incomingHash);
}

module.exports = {
  createSessionToken,
  createDeviceId,
  makeWireMessage,
  parseWireMessage,
  isTokenAccepted,
};
