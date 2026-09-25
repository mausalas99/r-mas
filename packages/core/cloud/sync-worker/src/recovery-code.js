// cloud/sync-worker/src/recovery-code.js
import { hashPassword, verifyPassword, LEGACY_ITERATIONS } from './password.js';

/** recovery_hash rows have no per-record iteration column (unlike password_hash /
 * schema/007) — pin both sides to the same fixed constant so hash and verify never
 * drift apart. Recovery codes are high-entropy random strings, not user-chosen
 * passwords, so they don't need the same PBKDF2 hardening as password_hash. */

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
  if (!CODE_RE.test(s)) return '';
  const body = s.slice(2).replace(/-/g, '');
  for (const ch of body) {
    if (!ALPHABET.includes(ch)) return '';
  }
  return s;
}

export async function hashRecoveryCode(code) {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) throw new Error('invalid_recovery_code');
  return hashPassword(normalized, LEGACY_ITERATIONS);
}

export async function verifyRecoveryCode(code, saltHex, hashHex) {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized || !saltHex || !hashHex) return false;
  return verifyPassword(normalized, saltHex, hashHex, LEGACY_ITERATIONS);
}
