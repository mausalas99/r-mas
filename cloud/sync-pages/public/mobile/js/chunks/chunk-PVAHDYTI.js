// public/js/features/cloud-sync/crypto.mjs
var WRAP_KEY_ITERATIONS = 21e4;
var DEK_LENGTH_BITS = 256;
var IV_BYTES = 12;
var SALT_BYTES = 16;
function toBase64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function generateWrapSalt() {
  return toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}
async function deriveWrapKey(password, saltB64) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(String(password || "")),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: fromBase64(saltB64), iterations: WRAP_KEY_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: DEK_LENGTH_BITS },
    false,
    ["wrapKey", "unwrapKey"]
  );
}
function generateDek() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: DEK_LENGTH_BITS }, true, [
    "encrypt",
    "decrypt"
  ]);
}
async function wrapDek(dek, wrapKey) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const wrapped = await crypto.subtle.wrapKey("raw", dek, wrapKey, { name: "AES-GCM", iv });
  return { iv: toBase64(iv), ct: toBase64(wrapped) };
}
async function unwrapDek(wrapped, wrapKey) {
  return crypto.subtle.unwrapKey(
    "raw",
    fromBase64(wrapped.ct),
    wrapKey,
    { name: "AES-GCM", iv: fromBase64(wrapped.iv) },
    { name: "AES-GCM", length: DEK_LENGTH_BITS },
    true,
    ["encrypt", "decrypt"]
  );
}
async function importAdminPublicKey(b64) {
  return crypto.subtle.importKey("raw", fromBase64(b64), { name: "ECDH", namedCurve: "P-256" }, true, []);
}
async function wrapDekForAdmin(dek, adminPublicKey) {
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: adminPublicKey },
    ephemeral.privateKey,
    { name: "AES-GCM", length: DEK_LENGTH_BITS },
    false,
    ["wrapKey"]
  );
  const wrapped = await wrapDek(dek, sharedKey);
  const ephemeralPubKey = toBase64(await crypto.subtle.exportKey("raw", ephemeral.publicKey));
  return { ct: wrapped.ct, iv: wrapped.iv, ephemeralPubKey };
}
async function exportDekRaw(dek) {
  return toBase64(await crypto.subtle.exportKey("raw", dek));
}
async function importDekRaw(b64) {
  return crypto.subtle.importKey("raw", fromBase64(b64), { name: "AES-GCM", length: DEK_LENGTH_BITS }, true, [
    "encrypt",
    "decrypt"
  ]);
}
async function encryptValue(dek, value) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(value ?? null));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, dek, plaintext);
  return { enc: 1, iv: toBase64(iv), ct: toBase64(ct) };
}
function isEncryptedEnvelope(value) {
  return !!value && typeof value === "object" && /** @type {any} */
  value.enc === 1;
}
async function decryptValue(dek, value) {
  if (!isEncryptedEnvelope(value)) return value;
  const envelope = (
    /** @type {{ iv: string, ct: string }} */
    value
  );
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(envelope.iv) },
    dek,
    fromBase64(envelope.ct)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

// public/js/features/cloud-sync/cloud-sync-audit.mjs
var DEK_EVENTS = {
  DEK_CREATED: "nube.dek.created",
  WRAP_PUT: "nube.dek.wrap_put",
  WRAP_GET: "nube.dek.wrap_get",
  WRAP_FAILED: "nube.dek.wrap_failed",
  BACKFILL_SWEPT: "nube.dek.backfill_swept"
};
function auditApi() {
  return typeof window !== "undefined" ? window.rplusDb || window.electronAPI : null;
}
async function auditDekEvent(eventType, meta = {}) {
  const api = auditApi();
  if (!api || typeof api.dbAuditAppend !== "function") return;
  try {
    await api.dbAuditAppend({ eventType, meta });
  } catch {
  }
}

// public/js/features/cloud-sync/room-dek.mjs
var NUBE_E2EE_ENABLED = false;
var dekByRoomId = /* @__PURE__ */ new Map();
var unprotectedRooms = /* @__PURE__ */ new Set();
function clearRoomDekCache() {
  dekByRoomId.clear();
  unprotectedRooms.clear();
}
function getCachedRoomDek(roomId) {
  return dekByRoomId.get(String(roomId || "")) || null;
}
function isRoomUnprotected(roomId) {
  return unprotectedRooms.has(String(roomId || ""));
}
var DEK_FETCH_RETRIES = 2;
var DEK_FETCH_RETRY_DELAY_MS = 800;
async function fetchRoomDekWithRetry(api, roomId) {
  let lastErr;
  for (let attempt = 0; attempt <= DEK_FETCH_RETRIES; attempt += 1) {
    try {
      return await api.getRoomDek(roomId);
    } catch (err) {
      lastErr = err;
      if (attempt < DEK_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, DEK_FETCH_RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}
async function ensureAdminEscrow(api, roomId, dek) {
  const bridge = globalThis.electronAPI?.adminRescueKeyGetPublicInfo;
  if (typeof bridge !== "function") return;
  try {
    const info = await bridge();
    if (!info?.publicKeyB64 || !info?.keyId) return;
    const adminPublicKey = await importAdminPublicKey(info.publicKeyB64);
    const wrapped = await wrapDekForAdmin(dek, adminPublicKey);
    await api.setAdminRoomDek(roomId, { ...wrapped, keyId: info.keyId });
    await auditDekEvent(DEK_EVENTS.WRAP_PUT, { roomId, reason: "admin-escrow" });
  } catch {
  }
}
async function ensureRoomDek(api, roomId, roomCode) {
  if (!roomCode) return null;
  try {
    const dek = await generateDek();
    const salt = generateWrapSalt();
    const wrapKey = await deriveWrapKey(roomCode, salt);
    const wrapped = await wrapDek(dek, wrapKey);
    await api.setRoomDek(roomId, { ct: wrapped.ct, iv: wrapped.iv, salt });
    dekByRoomId.set(String(roomId), dek);
    await auditDekEvent(DEK_EVENTS.DEK_CREATED, { roomId });
    await auditDekEvent(DEK_EVENTS.WRAP_PUT, { roomId });
    await ensureAdminEscrow(api, roomId, dek);
    return dek;
  } catch (err) {
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, { roomId, phase: "create", message: String(err?.message || err) });
    throw err;
  }
}
async function loadRoomDek(api, roomId, roomCode) {
  const cached = getCachedRoomDek(roomId);
  if (cached) return cached;
  if (!roomCode) return null;
  let wrapped;
  try {
    ({ dek: wrapped } = await fetchRoomDekWithRetry(api, roomId));
  } catch (err) {
    unprotectedRooms.add(String(roomId));
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, { roomId, phase: "load-fetch", message: String(err?.message || err) });
    return null;
  }
  if (!wrapped) {
    unprotectedRooms.delete(String(roomId));
    return null;
  }
  try {
    const wrapKey = await deriveWrapKey(roomCode, wrapped.salt);
    const dek = await unwrapDek({ ct: wrapped.ct, iv: wrapped.iv }, wrapKey);
    dekByRoomId.set(String(roomId), dek);
    unprotectedRooms.delete(String(roomId));
    await auditDekEvent(DEK_EVENTS.WRAP_GET, { roomId });
    return dek;
  } catch (err) {
    unprotectedRooms.add(String(roomId));
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, { roomId, phase: "load", message: String(err?.message || err) });
    return null;
  }
}
async function retryRoomDekIfUnprotected(api, roomId, roomCode) {
  if (!isRoomUnprotected(roomId)) return;
  await loadRoomDek(api, roomId, roomCode).catch(() => {
  });
}
async function rewrapRoomDekForNewCode(api, roomId, newRoomCode) {
  const dek = getCachedRoomDek(roomId);
  if (!dek || !newRoomCode) return;
  try {
    const salt = generateWrapSalt();
    const wrapKey = await deriveWrapKey(newRoomCode, salt);
    const wrapped = await wrapDek(dek, wrapKey);
    await api.rotateRoomDek(roomId, { ct: wrapped.ct, iv: wrapped.iv, salt });
    await auditDekEvent(DEK_EVENTS.WRAP_PUT, { roomId, reason: "code-rotated" });
  } catch (err) {
    await auditDekEvent(DEK_EVENTS.WRAP_FAILED, { roomId, phase: "rotate", message: String(err?.message || err) });
  }
}
async function exportCachedDeksForPersistence() {
  const out = {};
  for (const [roomId, dek] of dekByRoomId) {
    out[roomId] = await exportDekRaw(dek);
  }
  return out;
}
async function hydrateRoomDeksFromPersistence(deksByRoomId) {
  if (!deksByRoomId) return;
  for (const [roomId, raw] of Object.entries(deksByRoomId)) {
    if (dekByRoomId.has(roomId) || !raw) continue;
    try {
      dekByRoomId.set(roomId, await importDekRaw(raw));
    } catch {
    }
  }
}

export {
  encryptValue,
  isEncryptedEnvelope,
  decryptValue,
  DEK_EVENTS,
  auditDekEvent,
  NUBE_E2EE_ENABLED,
  clearRoomDekCache,
  getCachedRoomDek,
  isRoomUnprotected,
  ensureRoomDek,
  loadRoomDek,
  retryRoomDekIfUnprotected,
  rewrapRoomDekForNewCode,
  exportCachedDeksForPersistence,
  hydrateRoomDeksFromPersistence
};
//# sourceMappingURL=/js/chunks/chunk-PVAHDYTI.js.map
