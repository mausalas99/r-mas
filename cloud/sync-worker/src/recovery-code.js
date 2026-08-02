// cloud/sync-worker/src/recovery-code.js
import { hashPassword, verifyPassword } from './password.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /^R\+[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

function randomChars(n) {
  const out = [];
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  for (let i = 0; i < n; i++) out.push(ALPHABET[bytes[i] % ALPHABET.length]);
  return out.join('');
}

/** @returns {string} e.g. R+AB3K-7NMP-Q2WX */
export function generateRecoveryCode() {
  return `R+${randomChars(4)}-${randomChars(4)}-${randomChars(4)}`;
}

/** @param {unknown} raw */
export function normalizeRecoveryCode(raw) {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  return CODE_RE.test(s) ? s : '';
}

export async function hashRecoveryCode(code) {
  return hashPassword(normalizeRecoveryCode(code) || code);
}

export async function verifyRecoveryCode(code, saltHex, hashHex) {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized || !saltHex || !hashHex) return false;
  return verifyPassword(normalized, saltHex, hashHex);
}
