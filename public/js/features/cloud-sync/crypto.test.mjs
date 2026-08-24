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
  importAdminPublicKey,
  importAdminPrivateKey,
  wrapDekForAdmin,
  unwrapDekForAdmin,
} from './crypto.mjs';

/** Test-only ECDH keypair generator — mirrors the shape lib/admin-rescue-key.mjs produces. */
async function generateTestAdminKeyPair() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const publicB64 = Buffer.from(await crypto.subtle.exportKey('raw', pair.publicKey)).toString('base64');
  const privateB64 = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64');
  return { publicB64, privateB64 };
}

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

  it('admin rescue wrap round-trips with only the admin PUBLIC key needed to wrap', async () => {
    const dek = await generateDek();
    const { publicB64, privateB64 } = await generateTestAdminKeyPair();
    const adminPublicKey = await importAdminPublicKey(publicB64);
    const wrapped = await wrapDekForAdmin(dek, adminPublicKey);
    assert.ok(wrapped.ct && wrapped.iv && wrapped.ephemeralPubKey);

    const adminPrivateKey = await importAdminPrivateKey(privateB64);
    const recovered = await unwrapDekForAdmin(wrapped, adminPrivateKey);
    const value = { note: 'rescatado' };
    const envelope = await encryptValue(dek, value);
    assert.deepEqual(await decryptValue(recovered, envelope), value);
  });

  it('admin rescue wrap cannot be opened by a different admin keypair', async () => {
    const dek = await generateDek();
    const real = await generateTestAdminKeyPair();
    const wrongAdmin = await generateTestAdminKeyPair();
    const wrapped = await wrapDekForAdmin(dek, await importAdminPublicKey(real.publicB64));
    const wrongPrivateKey = await importAdminPrivateKey(wrongAdmin.privateB64);
    await assert.rejects(() => unwrapDekForAdmin(wrapped, wrongPrivateKey));
  });
});
