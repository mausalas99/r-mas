/** Free Workers ~10ms CPU — 50k PBKDF2-SHA-256 for pilot. Raise on Paid. */
const ITERATIONS = 50_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;

/** @param {string} hex */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** @param {Uint8Array} bytes */
function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** @param {Uint8Array} a @param {Uint8Array} b */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/** @param {string} password */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hashBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BYTES * 8
  );
  return {
    salt: bytesToHex(salt),
    hash: bytesToHex(new Uint8Array(hashBits)),
  };
}

/** @param {string} password @param {string} saltHex @param {string} hashHex */
export async function verifyPassword(password, saltHex, hashHex) {
  const salt = hexToBytes(saltHex);
  const expectedHash = hexToBytes(hashHex);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const hashBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BYTES * 8
  );
  return timingSafeEqual(new Uint8Array(hashBits), expectedHash);
}
