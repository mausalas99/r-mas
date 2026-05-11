import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptLiveSyncEnvelope, decryptLiveSyncEnvelope } from './live-sync-crypto.mjs';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function flipFirstCipherByte(ciphertext) {
  const binary = globalThis.atob(ciphertext);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  bytes[0] ^= 1;
  return globalThis.btoa(String.fromCharCode.apply(null, Array.from(bytes)));
}

test('encrypt/decrypt round trip returns original object', async () => {
  const payload = { type: 'event', event: { eventId: 'evt-1', op: 'notes.update' } };
  const encrypted = await encryptLiveSyncEnvelope(payload, 'session-token');
  assert.equal(encrypted.encrypted, true);
  assert.equal(typeof encrypted.ciphertext, 'string');

  const decrypted = await decryptLiveSyncEnvelope(encrypted, 'session-token');
  assert.deepEqual(decrypted, payload);
});

test('decrypt rejects wrong token', async () => {
  const encrypted = await encryptLiveSyncEnvelope({ ok: true }, 'session-token');
  await assert.rejects(
    () => decryptLiveSyncEnvelope(encrypted, 'wrong-token'),
    /decrypt/i
  );
});

test('encrypt rejects empty token', async () => {
  for (const token of ['', '   ', null]) {
    await assert.rejects(
      () => encryptLiveSyncEnvelope({ ok: true }, token),
      /token/i
    );
  }
});

test('decrypt rejects empty token', async () => {
  const encrypted = await encryptLiveSyncEnvelope({ ok: true }, 'session-token');
  for (const token of ['', '   ', null]) {
    await assert.rejects(
      () => decryptLiveSyncEnvelope(encrypted, token),
      /token/i
    );
  }
});

test('decrypt rejects wrong alg/kdf/encrypted/iterations metadata', async () => {
  const encrypted = await encryptLiveSyncEnvelope({ ok: true }, 'session-token');
  const cases = [
    { encrypted: false },
    { alg: 'AES-CBC' },
    { kdf: 'PBKDF2-SHA1' },
    { iterations: 1 },
  ];

  for (const change of cases) {
    await assert.rejects(
      () => decryptLiveSyncEnvelope(Object.assign(clone(encrypted), change), 'session-token'),
      /envelope/i
    );
  }
});

test('decrypt rejects invalid salt/iv/ciphertext shapes', async () => {
  const encrypted = await encryptLiveSyncEnvelope({ ok: true }, 'session-token');
  const cases = [
    { salt: '' },
    { salt: encrypted.iv },
    { iv: '' },
    { iv: encrypted.salt },
    { ciphertext: '' },
    { ciphertext: '*' },
  ];

  for (const change of cases) {
    await assert.rejects(
      () => decryptLiveSyncEnvelope(Object.assign(clone(encrypted), change), 'session-token'),
      /envelope|decrypt/i
    );
  }
});

test('decrypt rejects tampered ciphertext', async () => {
  const encrypted = await encryptLiveSyncEnvelope({ ok: true }, 'session-token');
  const tampered = Object.assign(clone(encrypted), {
    ciphertext: flipFirstCipherByte(encrypted.ciphertext),
  });

  await assert.rejects(
    () => decryptLiveSyncEnvelope(tampered, 'session-token'),
    /decrypt/i
  );
});
