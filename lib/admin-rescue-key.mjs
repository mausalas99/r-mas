/**
 * Admin rescue keypair for Nube room-key recovery (Stage 0 item 2 of
 * docs/superpowers/plans/2026-08-23-nube-e2ee-deploy.md).
 *
 * ECDH P-256. The private key is generated once, wrapped with Electron's
 * safeStorage (backed by the OS keychain — Keychain on macOS) and persisted to a
 * small JSON file in userData. It never leaves this device and is never sent to
 * the server. Only the public half (and a short id derived from it) is ever
 * exposed to callers outside this module.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash, webcrypto } from 'node:crypto';
import { wrapDek as wrapSecretForDisk, unwrapDek as unwrapSecretFromDisk } from './db/crypto.mjs';

const FILE_NAME = 'admin-rescue-key.json';

/** @param {ArrayBuffer|Uint8Array} buf */
function toBase64(buf) {
  return Buffer.from(buf).toString('base64');
}

/** @param {string} b64 */
function fromBase64(b64) {
  return Buffer.from(b64, 'base64');
}

/** @param {string} publicKeyB64 */
function keyIdFromPublicKey(publicKeyB64) {
  return createHash('sha256').update(publicKeyB64).digest('hex').slice(0, 16);
}

/** @param {string} userDataPath */
function keyFilePath(userDataPath) {
  return join(userDataPath, FILE_NAME);
}

/** @param {string} userDataPath */
async function readKeyFile(userDataPath) {
  try {
    const raw = await readFile(keyFilePath(userDataPath), 'utf8');
    const data = JSON.parse(raw);
    if (!data?.publicKeyB64 || !data?.wrappedPrivateKeyB64 || !data?.keyId) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * @param {string} userDataPath
 * @param {{ isEncryptionAvailable: () => boolean, encryptString: (s: string) => string }} safeStorage
 */
async function generateAndPersist(userDataPath, safeStorage) {
  const pair = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const publicKeyB64 = toBase64(await webcrypto.subtle.exportKey('raw', pair.publicKey));
  const privateKeyB64 = toBase64(await webcrypto.subtle.exportKey('pkcs8', pair.privateKey));
  const wrappedPrivateKeyB64 = wrapSecretForDisk(privateKeyB64, safeStorage);
  if (!wrappedPrivateKeyB64) {
    throw new Error('No se pudo proteger la llave de rescate (Keychain no disponible).');
  }
  const keyId = keyIdFromPublicKey(publicKeyB64);
  const data = { publicKeyB64, wrappedPrivateKeyB64, keyId, createdAt: new Date().toISOString() };
  await mkdir(dirname(keyFilePath(userDataPath)), { recursive: true });
  await writeFile(keyFilePath(userDataPath), JSON.stringify(data, null, 2), 'utf8');
  return data;
}

/**
 * Loads the admin rescue keypair, generating it on first use. Safe to call
 * repeatedly — a keypair, once created, is reused forever (no rotation here yet).
 * @param {{ userDataPath: string, safeStorage: { isEncryptionAvailable: () => boolean, encryptString: (s: string) => string, decryptString: (s: string) => string } }} deps
 * @returns {Promise<{ publicKeyB64: string, wrappedPrivateKeyB64: string, keyId: string }>}
 */
async function ensureAdminKeyPair({ userDataPath, safeStorage }) {
  const existing = await readKeyFile(userDataPath);
  if (existing) return existing;
  return generateAndPersist(userDataPath, safeStorage);
}

/**
 * Public info safe to hand to the renderer for wrapping a room DEK against.
 * @param {{ userDataPath: string, safeStorage: object }} deps
 * @returns {Promise<{ publicKeyB64: string, keyId: string }>}
 */
export async function getAdminPublicKeyInfo(deps) {
  const { publicKeyB64, keyId } = await ensureAdminKeyPair(deps);
  return { publicKeyB64, keyId };
}

/**
 * Rescue-tool only: decrypt an admin-wrapped room DEK. Needs the private key,
 * which only ever exists in this process, unwrapped via the OS keychain.
 * @param {{ userDataPath: string, safeStorage: object }} deps
 * @param {{ ct: string, iv: string, ephemeralPubKey: string, keyId: string }} wrapped
 * @returns {Promise<string>} raw DEK bytes, base64
 */
export async function unwrapRoomDekWithAdminKey(deps, wrapped) {
  const stored = await ensureAdminKeyPair(deps);
  if (stored.keyId !== wrapped.keyId) {
    throw new Error('Esta sala fue rescatada con una llave de administrador distinta.');
  }
  const privateKeyB64 = unwrapSecretFromDisk(stored.wrappedPrivateKeyB64, deps.safeStorage);
  if (!privateKeyB64) throw new Error('No se pudo leer la llave de rescate desde el Keychain.');

  const privateKey = await webcrypto.subtle.importKey(
    'pkcs8',
    fromBase64(privateKeyB64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  );
  const ephemeralPublicKey = await webcrypto.subtle.importKey(
    'raw',
    fromBase64(wrapped.ephemeralPubKey),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const sharedKey = await webcrypto.subtle.deriveKey(
    { name: 'ECDH', public: ephemeralPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['unwrapKey']
  );
  const dek = await webcrypto.subtle.unwrapKey(
    'raw',
    fromBase64(wrapped.ct),
    sharedKey,
    { name: 'AES-GCM', iv: fromBase64(wrapped.iv) },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return toBase64(await webcrypto.subtle.exportKey('raw', dek));
}
