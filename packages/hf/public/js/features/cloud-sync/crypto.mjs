/**
 * Nube client-side envelope encryption (AES-256-GCM room DEK).
 * Runs entirely via window.crypto.subtle — no dependency, works in renderer and Node test.
 *
 * Envelope shape for encrypted field values: { enc: 1, iv: base64, ct: base64 }.
 * cloud/sync-worker/src/lww.js already recognizes `value.enc === 1` for clinicalOps —
 * this module produces that same shape for every encrypted path.
 */

/** Client-side PBKDF2 wrap-key derivation — not subject to the Cloudflare Workers
 * 100k iteration cap (that cap only applies to password_hash on the Worker). */
const WRAP_KEY_ITERATIONS = 210_000;
const DEK_LENGTH_BITS = 256;
const IV_BYTES = 12;
const SALT_BYTES = 16;

/** @param {ArrayBuffer|Uint8Array} buf @returns {string} */
function toBase64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** @param {string} b64 @returns {Uint8Array} */
function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** @returns {string} fresh base64 PBKDF2 salt for wrapping a room DEK */
export function generateWrapSalt() {
  return toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

/**
 * Derive an AES-GCM wrap key from the user's Nube password + a per-room salt.
 * @param {string} password
 * @param {string} saltB64
 * @returns {Promise<CryptoKey>}
 */
export async function deriveWrapKey(password, saltB64) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(String(password || '')),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(saltB64), iterations: WRAP_KEY_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: DEK_LENGTH_BITS },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

/** @returns {Promise<CryptoKey>} a fresh, extractable AES-256-GCM room DEK */
export function generateDek() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: DEK_LENGTH_BITS }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * @param {CryptoKey} dek
 * @param {CryptoKey} wrapKey from deriveWrapKey
 * @returns {Promise<{ iv: string, ct: string }>}
 */
export async function wrapDek(dek, wrapKey) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrapped = await crypto.subtle.wrapKey('raw', dek, wrapKey, { name: 'AES-GCM', iv });
  return { iv: toBase64(iv), ct: toBase64(wrapped) };
}

/**
 * @param {{ iv: string, ct: string }} wrapped
 * @param {CryptoKey} wrapKey from deriveWrapKey
 * @returns {Promise<CryptoKey>}
 */
export async function unwrapDek(wrapped, wrapKey) {
  return crypto.subtle.unwrapKey(
    'raw',
    fromBase64(wrapped.ct),
    wrapKey,
    { name: 'AES-GCM', iv: fromBase64(wrapped.iv) },
    { name: 'AES-GCM', length: DEK_LENGTH_BITS },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Admin rescue key: an ECDH P-256 keypair. The private half never leaves the
 * admin's device — it's generated/stored main-process side (Mac Keychain via
 * Electron safeStorage). Only the public half and these wrap/unwrap helpers are
 * used from the renderer.
 * @param {string} b64
 * @returns {Promise<CryptoKey>}
 */
export async function importAdminPublicKey(b64) {
  return crypto.subtle.importKey('raw', fromBase64(b64), { name: 'ECDH', namedCurve: 'P-256' }, true, []);
}

/** @param {string} b64 @returns {Promise<CryptoKey>} */
export async function importAdminPrivateKey(b64) {
  return crypto.subtle.importKey('pkcs8', fromBase64(b64), { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
}

/**
 * Wrap a room DEK for the admin rescue copy — ephemeral ECDH + AES-GCM (ECIES-style).
 * Anyone can compute this (it only needs the admin's PUBLIC key); only the admin's
 * private key can undo it.
 * @param {CryptoKey} dek
 * @param {CryptoKey} adminPublicKey
 * @returns {Promise<{ ct: string, iv: string, ephemeralPubKey: string }>}
 */
export async function wrapDekForAdmin(dek, adminPublicKey) {
  const ephemeral = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: adminPublicKey },
    ephemeral.privateKey,
    { name: 'AES-GCM', length: DEK_LENGTH_BITS },
    false,
    ['wrapKey']
  );
  const wrapped = await wrapDek(dek, sharedKey);
  const ephemeralPubKey = toBase64(await crypto.subtle.exportKey('raw', ephemeral.publicKey));
  return { ct: wrapped.ct, iv: wrapped.iv, ephemeralPubKey };
}

/**
 * Undo wrapDekForAdmin — needs the admin's PRIVATE key. Main-process/rescue-tool use only.
 * @param {{ ct: string, iv: string, ephemeralPubKey: string }} wrapped
 * @param {CryptoKey} adminPrivateKey
 * @returns {Promise<CryptoKey>}
 */
export async function unwrapDekForAdmin(wrapped, adminPrivateKey) {
  const ephemeralPublicKey = await importAdminPublicKey(wrapped.ephemeralPubKey);
  const sharedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: ephemeralPublicKey },
    adminPrivateKey,
    { name: 'AES-GCM', length: DEK_LENGTH_BITS },
    true,
    ['unwrapKey']
  );
  return unwrapDek({ ct: wrapped.ct, iv: wrapped.iv }, sharedKey);
}

/** @param {CryptoKey} dek @returns {Promise<string>} raw DEK bytes, base64 — for the durable Recuérdame cache only */
export async function exportDekRaw(dek) {
  return toBase64(await crypto.subtle.exportKey('raw', dek));
}

/** @param {string} b64 @returns {Promise<CryptoKey>} */
export async function importDekRaw(b64) {
  return crypto.subtle.importKey('raw', fromBase64(b64), { name: 'AES-GCM', length: DEK_LENGTH_BITS }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * @param {CryptoKey} dek
 * @param {unknown} value plain JS value — JSON-serializable
 * @returns {Promise<{ enc: 1, iv: string, ct: string }>}
 */
export async function encryptValue(dek, value) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(value ?? null));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, plaintext);
  return { enc: 1, iv: toBase64(iv), ct: toBase64(ct) };
}

/** @param {unknown} value */
export function isEncryptedEnvelope(value) {
  return !!value && typeof value === 'object' && /** @type {any} */ (value).enc === 1;
}

/**
 * Decrypts an {enc:1,iv,ct} envelope. Values that are not an envelope pass through
 * unchanged — old, never-encrypted rows and structural paths stay compatible.
 * @param {CryptoKey} dek
 * @param {unknown} value
 * @returns {Promise<unknown>}
 */
export async function decryptValue(dek, value) {
  if (!isEncryptedEnvelope(value)) return value;
  const envelope = /** @type {{ iv: string, ct: string }} */ (value);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(envelope.iv) },
    dek,
    fromBase64(envelope.ct)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}
