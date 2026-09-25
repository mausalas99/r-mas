/** Cloudflare Workers WebCrypto hard-caps PBKDF2 at 100k iterations — not a CPU-time
 * limit, a platform rule (paid plan does not raise it). A 2026-08-14 release-prep
 * commit (5d3ee570) bumped this past the cap to 310k and broke every hash/verify
 * call for two weeks (fixed 2026-08-16, 08155435) because every stored row was
 * verified with one hardcoded constant — any change broke every existing login,
 * not just new ones.
 *
 * password_iterations (schema/007) makes iterations per-row instead of hardcoded:
 * new hashes use MAX_ITERATIONS; existing rows keep whatever they were hashed
 * with (LEGACY_ITERATIONS, via the column's DEFAULT) and verify correctly against
 * their own stored count. Raising the target no longer requires a backfill or
 * risks breaking a single login — old and new rows are both self-describing. */
export const LEGACY_ITERATIONS = 50_000;
export const MAX_ITERATIONS = 100_000;
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

/** @param {string} password @param {number} [iterations] */
export async function hashPassword(password, iterations = MAX_ITERATIONS) {
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
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BYTES * 8
  );
  return {
    salt: bytesToHex(salt),
    hash: bytesToHex(new Uint8Array(hashBits)),
    iterations,
  };
}

/**
 * @param {string} password @param {string} saltHex @param {string} hashHex
 * @param {number} [iterations] must match whatever the row was hashed with —
 * pass the row's stored `password_iterations`, not a hardcoded constant.
 */
export async function verifyPassword(password, saltHex, hashHex, iterations = LEGACY_ITERATIONS) {
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
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BYTES * 8
  );
  return timingSafeEqual(new Uint8Array(hashBits), expectedHash);
}
