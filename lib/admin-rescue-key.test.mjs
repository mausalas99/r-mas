import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { webcrypto } from 'node:crypto';
import { getAdminPublicKeyInfo, unwrapRoomDekWithAdminKey } from './admin-rescue-key.mjs';

const mockSafe = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from('enc:' + s).toString('base64'),
  decryptString: (s) => Buffer.from(s, 'base64').toString('utf8').replace(/^enc:/, ''),
};

let userDataPath;

beforeEach(async () => {
  userDataPath = await mkdtemp(join(tmpdir(), 'rplus-admin-rescue-'));
});

afterEach(async () => {
  await rm(userDataPath, { recursive: true, force: true });
});

/** Mirrors public/js/features/cloud-sync/crypto.mjs's wrapDekForAdmin, using Node's webcrypto directly (test-only, no cross-boundary import). */
async function wrapDekForAdminTestOnly(dekRaw, publicKeyB64) {
  const dek = await webcrypto.subtle.importKey('raw', dekRaw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const publicKey = await webcrypto.subtle.importKey(
    'raw',
    Buffer.from(publicKeyB64, 'base64'),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
  const ephemeral = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const sharedKey = await webcrypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    ephemeral.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey']
  );
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const wrapped = await webcrypto.subtle.wrapKey('raw', dek, sharedKey, { name: 'AES-GCM', iv });
  const ephemeralPubKey = Buffer.from(await webcrypto.subtle.exportKey('raw', ephemeral.publicKey)).toString('base64');
  return { ct: Buffer.from(wrapped).toString('base64'), iv: Buffer.from(iv).toString('base64'), ephemeralPubKey };
}

describe('admin-rescue-key', () => {
  it('generates a keypair on first use and reuses it on subsequent calls', async () => {
    const first = await getAdminPublicKeyInfo({ userDataPath, safeStorage: mockSafe });
    const second = await getAdminPublicKeyInfo({ userDataPath, safeStorage: mockSafe });
    assert.equal(first.keyId, second.keyId);
    assert.equal(first.publicKeyB64, second.publicKeyB64);
  });

  it('wraps a DEK against the admin public key and unwraps it back to the same bytes', async () => {
    const { publicKeyB64, keyId } = await getAdminPublicKeyInfo({ userDataPath, safeStorage: mockSafe });
    const dekRaw = webcrypto.getRandomValues(new Uint8Array(32));
    const wrapped = await wrapDekForAdminTestOnly(dekRaw, publicKeyB64);

    const recoveredB64 = await unwrapRoomDekWithAdminKey({ userDataPath, safeStorage: mockSafe }, { ...wrapped, keyId });
    assert.equal(recoveredB64, Buffer.from(dekRaw).toString('base64'));
  });

  it('rejects a rescue wrap made for a different admin key id', async () => {
    await getAdminPublicKeyInfo({ userDataPath, safeStorage: mockSafe });
    const dekRaw = webcrypto.getRandomValues(new Uint8Array(32));
    const wrapped = await wrapDekForAdminTestOnly(dekRaw, (await getAdminPublicKeyInfo({ userDataPath, safeStorage: mockSafe })).publicKeyB64);
    await assert.rejects(
      () => unwrapRoomDekWithAdminKey({ userDataPath, safeStorage: mockSafe }, { ...wrapped, keyId: 'wrong-key-id' }),
      /llave de administrador distinta/
    );
  });

  it('throws a clear error when the Keychain is unavailable', async () => {
    const unavailableSafe = { isEncryptionAvailable: () => false, encryptString: () => null, decryptString: () => null };
    await assert.rejects(
      () => getAdminPublicKeyInfo({ userDataPath, safeStorage: unavailableSafe }),
      /Keychain no disponible/
    );
  });

  it('reuses the existing key unchanged when its wrap still decrypts', async () => {
    const first = await getAdminPublicKeyInfo({ userDataPath, safeStorage: mockSafe });
    const rawBefore = await readFile(join(userDataPath, 'admin-rescue-key.json'), 'utf8');

    const second = await getAdminPublicKeyInfo({ userDataPath, safeStorage: mockSafe });
    const rawAfter = await readFile(join(userDataPath, 'admin-rescue-key.json'), 'utf8');

    assert.equal(second.keyId, first.keyId);
    assert.equal(rawAfter, rawBefore);
  });

  it('regenerates the key when the wrap can no longer decrypt and the Keychain is available (e.g. signing identity changed)', async () => {
    const first = await getAdminPublicKeyInfo({ userDataPath, safeStorage: mockSafe });
    const newIdentitySafe = {
      isEncryptionAvailable: () => true,
      encryptString: (s) => Buffer.from('enc:' + s).toString('base64'),
      decryptString: () => { throw new Error('decrypt failed: wrong signing identity'); },
    };

    const second = await getAdminPublicKeyInfo({ userDataPath, safeStorage: newIdentitySafe });
    const raw = await readFile(join(userDataPath, 'admin-rescue-key.json'), 'utf8');

    assert.notEqual(second.keyId, first.keyId);
    assert.equal(JSON.parse(raw).keyId, second.keyId);
  });

  it('does not regenerate when decryption fails only because the Keychain is temporarily unavailable', async () => {
    const first = await getAdminPublicKeyInfo({ userDataPath, safeStorage: mockSafe });
    const rawBefore = await readFile(join(userDataPath, 'admin-rescue-key.json'), 'utf8');
    const lockedSafe = { isEncryptionAvailable: () => false, encryptString: () => null, decryptString: () => { throw new Error('locked'); } };

    const second = await getAdminPublicKeyInfo({ userDataPath, safeStorage: lockedSafe });
    const rawAfter = await readFile(join(userDataPath, 'admin-rescue-key.json'), 'utf8');

    assert.equal(second.keyId, first.keyId);
    assert.equal(rawAfter, rawBefore);
  });
});
