import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateWrapSalt,
  deriveWrapKey,
  generateDek,
  wrapDek,
  unwrapDek,
  exportDekRaw,
  importDekRaw,
  encryptValue,
  decryptValue,
  isEncryptedEnvelope,
} from './crypto.mjs';

describe('cloud-sync crypto', () => {
  it('round-trips a value through encrypt/decrypt', async () => {
    const dek = await generateDek();
    const value = { nota: 'paciente estable', historial: [1, 2, 3] };
    const envelope = await encryptValue(dek, value);
    assert.equal(envelope.enc, 1);
    assert.ok(envelope.iv && envelope.ct);
    const decrypted = await decryptValue(dek, envelope);
    assert.deepEqual(decrypted, value);
  });

  it('passes through non-envelope values unchanged on decrypt', async () => {
    const dek = await generateDek();
    assert.equal(await decryptValue(dek, 'plain string'), 'plain string');
    assert.deepEqual(await decryptValue(dek, { foo: 'bar' }), { foo: 'bar' });
    assert.equal(await decryptValue(dek, null), null);
  });

  it('isEncryptedEnvelope only recognizes enc:1 objects', () => {
    assert.equal(isEncryptedEnvelope({ enc: 1, iv: 'a', ct: 'b' }), true);
    assert.equal(isEncryptedEnvelope({ enc: 0 }), false);
    assert.equal(isEncryptedEnvelope('str'), false);
    assert.equal(isEncryptedEnvelope(null), false);
  });

  it('wraps and unwraps a DEK with a password-derived key', async () => {
    const dek = await generateDek();
    const salt = generateWrapSalt();
    const wrapKey = await deriveWrapKey('correct horse battery staple', salt);
    const wrapped = await wrapDek(dek, wrapKey);
    const wrapKeyAgain = await deriveWrapKey('correct horse battery staple', salt);
    const unwrapped = await unwrapDek(wrapped, wrapKeyAgain);

    const value = { indicaciones: 'ceftriaxona 1g IV c/24h' };
    const envelope = await encryptValue(dek, value);
    const decrypted = await decryptValue(unwrapped, envelope);
    assert.deepEqual(decrypted, value);
  });

  it('fails to unwrap with the wrong password', async () => {
    const dek = await generateDek();
    const salt = generateWrapSalt();
    const wrapKey = await deriveWrapKey('right-password', salt);
    const wrapped = await wrapDek(dek, wrapKey);
    const wrongKey = await deriveWrapKey('wrong-password', salt);
    await assert.rejects(() => unwrapDek(wrapped, wrongKey));
  });

  it('round-trips a raw exported DEK', async () => {
    const dek = await generateDek();
    const raw = await exportDekRaw(dek);
    const imported = await importDekRaw(raw);
    const value = { agenda: 'seguimiento 9am' };
    const envelope = await encryptValue(dek, value);
    assert.deepEqual(await decryptValue(imported, envelope), value);
  });

  it('fails to decrypt with a different DEK (authentication fails)', async () => {
    const dekA = await generateDek();
    const dekB = await generateDek();
    const envelope = await encryptValue(dekA, { note: 'secreto' });
    await assert.rejects(() => decryptValue(dekB, envelope));
  });
});
