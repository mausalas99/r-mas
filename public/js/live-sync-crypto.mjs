const ITERATIONS = 120000;

function getWebCrypto() {
  var webCrypto = globalThis.crypto;
  if (!webCrypto || !webCrypto.subtle || !webCrypto.getRandomValues) {
    throw new Error('WebCrypto no disponible');
  }
  return webCrypto;
}

function bytesToBase64(bytes) {
  var binary = '';
  var chunkSize = 0x8000;
  for (var i = 0; i < bytes.length; i += chunkSize) {
    var chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(value) {
  var binary = globalThis.atob(String(value || ''));
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(token, salt) {
  var enc = new TextEncoder();
  var subtle = getWebCrypto().subtle;
  var material = await subtle.importKey(
    'raw',
    enc.encode(String(token || '')),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptLiveSyncEnvelope(obj, token) {
  var webCrypto = getWebCrypto();
  var enc = new TextEncoder();
  var salt = webCrypto.getRandomValues(new Uint8Array(16));
  var iv = webCrypto.getRandomValues(new Uint8Array(12));
  var key = await deriveKey(token, salt);
  var plain = enc.encode(JSON.stringify(obj));
  var cipher = await webCrypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plain);
  return {
    encrypted: true,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(cipher)),
  };
}

export async function decryptLiveSyncEnvelope(envelope, token) {
  try {
    var webCrypto = getWebCrypto();
    var dec = new TextDecoder();
    var salt = base64ToBytes(envelope && envelope.salt);
    var iv = base64ToBytes(envelope && envelope.iv);
    var key = await deriveKey(token, salt);
    var plain = await webCrypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      base64ToBytes(envelope && envelope.ciphertext)
    );
    return JSON.parse(dec.decode(plain));
  } catch (err) {
    throw new Error('decrypt failed', { cause: err });
  }
}
