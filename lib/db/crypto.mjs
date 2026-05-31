import { randomBytes } from 'node:crypto';
import { hashRaw } from '@node-rs/argon2';

export const ARGON2_OPTS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
};

export function newSalt() {
  return randomBytes(16);
}

/** @param {string} passphrase @param {Buffer} saltBuf */
export async function deriveSqlcipherKeyHex(passphrase, saltBuf) {
  const dk = await hashRaw(passphrase, { salt: saltBuf, ...ARGON2_OPTS });
  return Buffer.from(dk).toString('hex');
}

/** @param {string} dekHex @param {{ isEncryptionAvailable: () => boolean, encryptString: (s: string) => string }} safeStorage */
export function wrapDek(dekHex, safeStorage) {
  if (!safeStorage.isEncryptionAvailable()) return null;
  return safeStorage.encryptString(dekHex);
}

/** @param {string | null | undefined} wrapped @param {{ isEncryptionAvailable: () => boolean, decryptString: (s: string) => string }} safeStorage */
export function unwrapDek(wrapped, safeStorage) {
  if (!wrapped || !safeStorage.isEncryptionAvailable()) return null;
  return safeStorage.decryptString(wrapped);
}
