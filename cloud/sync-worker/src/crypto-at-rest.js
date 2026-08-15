/**
 * Room snapshot codec for D1 `room_state`.
 *
 * Paid Workers (30s CPU) encrypt every snapshot with AES-256-GCM using WORKER_DATA_KEY.
 * Legacy plaintext JSON blobs (empty IV) still decode for backward compatibility.
 */
const IV_BYTES = 12;
/** Empty IV marks legacy plaintext JSON storage (backward compat decode only). */
const PLAINTEXT_IV = new Uint8Array(0);

/** @type {CryptoKey | null} */
let cachedDataKey = null;
/** @type {string} */
let cachedDataKeyHex = '';

/** @param {unknown} value */
function blobShape(value) {
  if (value == null) return { type: String(value) };
  return {
    type: typeof value,
    ctor: value?.constructor?.name ?? null,
    isAB: value instanceof ArrayBuffer,
    isU8: value instanceof Uint8Array,
    isView: ArrayBuffer.isView(value),
    isArr: Array.isArray(value),
    len: value?.byteLength ?? value?.length ?? null,
  };
}

/** @param {unknown} value */
function toUint8Array(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  // D1 sometimes returns UTF-8 BLOBs as JS strings for JSON-looking payloads.
  if (typeof value === 'string') {
    return new TextEncoder().encode(value);
  }
  // Some D1 paths return number[] for BLOB columns.
  if (Array.isArray(value) && value.length && typeof value[0] === 'number') {
    return Uint8Array.from(value);
  }
  // Node Buffer JSON shape: { type: 'Buffer', data: number[] }
  if (
    value &&
    typeof value === 'object' &&
    /** @type {{ type?: string, data?: unknown }} */ (value).type === 'Buffer' &&
    Array.isArray(/** @type {{ data?: unknown }} */ (value).data)
  ) {
    return Uint8Array.from(/** @type {{ data: number[] }} */ (value).data);
  }
  return new Uint8Array(0);
}

/**
 * Load room state — plaintext JSON or legacy AES-GCM (hex-era or raw).
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {unknown} ciphertextBlob
 * @param {unknown} ivBlob
 */
export async function decodeRoomState(env, ciphertextBlob, ivBlob) {
  // Fast path: D1 returned JSON text directly.
  if (typeof ciphertextBlob === 'string') {
    const trimmed = ciphertextBlob.trim();
    if (trimmed.charAt(0) === '{') return JSON.parse(trimmed);
  }
  const ciphertext = toUint8Array(ciphertextBlob);
  const iv = toUint8Array(ivBlob);
  if (!ciphertext.length) {
    throw new Error(
      `room_state ciphertext empty ${JSON.stringify(blobShape(ciphertextBlob))}`
    );
  }
  if (!iv.length) {
    return JSON.parse(new TextDecoder().decode(ciphertext));
  }
  if (iv.length === IV_BYTES) {
    try {
      const key = await importDataKey(env);
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );
      return JSON.parse(new TextDecoder().decode(plaintext));
    } catch (err) {
      // Legacy row: iv column has stray bytes but ciphertext is really plaintext JSON.
      if (looksLikeJsonObject(ciphertext)) {
        return JSON.parse(new TextDecoder().decode(ciphertext));
      }
      throw err;
    }
  }
  return JSON.parse(new TextDecoder().decode(ciphertext));
}

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
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/** @param {Uint8Array} bytes */
function looksLikeJsonObject(bytes) {
  let i = 0;
  while (i < bytes.length && (bytes[i] === 0x20 || bytes[i] === 0x0a || bytes[i] === 0x0d || bytes[i] === 0x09)) {
    i += 1;
  }
  return bytes[i] === 0x7b; /* { */
}

/** @param {{ WORKER_DATA_KEY?: string }} env */
async function importDataKey(env) {
  const hex = env.WORKER_DATA_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('WORKER_DATA_KEY must be 64 hex chars (32 bytes)');
  }
  if (cachedDataKey && cachedDataKeyHex === hex) return cachedDataKey;
  cachedDataKey = await crypto.subtle.importKey(
    'raw',
    hexToBytes(hex),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  cachedDataKeyHex = hex;
  return cachedDataKey;
}

/**
 * Encrypt room state with AES-256-GCM using WORKER_DATA_KEY.
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {unknown} obj
 * @returns {Promise<{ ciphertext: Uint8Array, iv: Uint8Array, storageBytes: number }>}
 */
export async function encodeRoomState(env, obj) {
  const key = await importDataKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj ?? null));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  );
  return {
    ciphertext,
    iv,
    storageBytes: ciphertext.byteLength,
  };
}

/**
 * Legacy AES-GCM helpers (tests + one-off). Prefer encodeRoomState/decodeRoomState.
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {unknown} obj
 */
export async function encryptJson(env, obj) {
  const key = await importDataKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  );
  return {
    ciphertext: bytesToHex(ciphertext),
    iv: bytesToHex(iv),
  };
}

/**
 * @param {{ WORKER_DATA_KEY?: string }} env
 * @param {string} ciphertextHex
 * @param {string} ivHex
 */
export async function decryptJson(env, ciphertextHex, ivHex) {
  return decodeRoomState(env, hexToBytes(ciphertextHex), hexToBytes(ivHex));
}

export const __test = { looksLikeJsonObject, toUint8Array, PLAINTEXT_IV };
