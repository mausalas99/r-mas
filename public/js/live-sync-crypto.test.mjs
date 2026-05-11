import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encryptLiveSyncEnvelope, decryptLiveSyncEnvelope } from './live-sync-crypto.mjs';

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
