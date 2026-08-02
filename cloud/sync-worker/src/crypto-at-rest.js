const IV_BYTES = 12;

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

/** @param {{ WORKER_DATA_KEY?: string }} env */
async function importDataKey(env) {
  const hex = env.WORKER_DATA_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('WORKER_DATA_KEY must be 64 hex chars (32 bytes)');
  }
  return crypto.subtle.importKey(
    'raw',
    hexToBytes(hex),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/** @param {{ WORKER_DATA_KEY?: string }} env @param {unknown} obj */
export async function encryptJson(env, obj) {
  const key = await importDataKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );
  return {
    ciphertext: bytesToHex(new Uint8Array(ciphertext)),
    iv: bytesToHex(iv),
  };
}

/** @param {{ WORKER_DATA_KEY?: string }} env @param {string} ciphertextHex @param {string} ivHex */
export async function decryptJson(env, ciphertextHex, ivHex) {
  const key = await importDataKey(env);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBytes(ivHex) },
    key,
    hexToBytes(ciphertextHex)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}
