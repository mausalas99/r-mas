/**
 * Wires crypto.mjs into the push/pull wire format.
 *
 * Scope (2026-08-17): only clinical *content* is encrypted — note, indicaciones,
 * historiaClinica, eventualidades, monitoreo, labSidecars, todos, clinicalOps.
 * Patient identity (entries/{id} root + entries/{id}/fields: nombre, cama, servicio,
 * registro, diagnósticos) stays plaintext — Interno's board and the admin census view
 * both read those fields server-side today, and rebuilding them to work on ciphertext
 * is a separate, larger follow-up (see docs/core/15-security.md).
 *
 * A room with no DEK (dek === null — never opted into E2EE, or not unwrapped yet on
 * this device) round-trips exactly like before: nothing is encrypted, nothing decrypted.
 */
import { encryptValue, decryptValue, isEncryptedEnvelope } from './crypto.mjs';

const ENTRY_CONTENT_FIELDS = ['note', 'indicaciones', 'historiaClinica', 'eventualidades', 'monitoreo'];

/** @param {string} path */
export function isEncryptedContentPath(path) {
  const p = String(path || '');
  if (p === 'clinicalOps') return true;
  if (new RegExp(`^entries/[^/]+/(${ENTRY_CONTENT_FIELDS.join('|')})$`).test(p)) return true;
  if (p.startsWith('labSidecars/')) return true;
  if (/^todos\/[^/]+$/.test(p)) return true;
  return false;
}

/** @param {CryptoKey|null} dek @param {unknown} value */
async function maybeDecrypt(dek, value) {
  if (!isEncryptedEnvelope(value)) return value;
  if (!dek) return value; // ciphertext we can't unwrap yet on this device — leave as-is
  try {
    return await decryptValue(dek, value);
  } catch {
    return value; // stale/wrong key — don't fail the whole pull over one field
  }
}

/**
 * @param {CryptoKey|null} dek
 * @param {unknown[]} ops
 * @returns {Promise<unknown[]>}
 */
export async function encryptOpsForPush(dek, ops) {
  if (!dek || !Array.isArray(ops)) return ops;
  const out = [];
  for (const op of ops) {
    if (op && typeof op === 'object' && isEncryptedContentPath(/** @type {any} */ (op).path)) {
      out.push({ ...op, value: await encryptValue(dek, /** @type {any} */ (op).value) });
    } else {
      out.push(op);
    }
  }
  return out;
}

/**
 * @param {CryptoKey|null} dek
 * @param {unknown[]} ops
 * @returns {Promise<unknown[]>}
 */
export async function decryptOpsFromPull(dek, ops) {
  if (!Array.isArray(ops)) return ops;
  const out = [];
  for (const op of ops) {
    if (op && typeof op === 'object' && isEncryptedEnvelope(/** @type {any} */ (op).value)) {
      out.push({ ...op, value: await maybeDecrypt(dek, /** @type {any} */ (op).value) });
    } else {
      out.push(op);
    }
  }
  return out;
}

/** @param {CryptoKey|null} dek @param {object} entry */
async function decryptEntryContentFields(dek, entry) {
  if (!entry || typeof entry !== 'object') return;
  for (const field of ENTRY_CONTENT_FIELDS) {
    if (entry[field] !== undefined) entry[field] = await maybeDecrypt(dek, entry[field]);
  }
}

/** @param {CryptoKey|null} dek @param {Record<string, Record<string, unknown>>} labSidecars */
async function decryptLabSidecars(dek, labSidecars) {
  if (!labSidecars || typeof labSidecars !== 'object') return;
  for (const patientId of Object.keys(labSidecars)) {
    const sets = labSidecars[patientId];
    if (!sets || typeof sets !== 'object') continue;
    for (const setId of Object.keys(sets)) {
      sets[setId] = await maybeDecrypt(dek, sets[setId]);
    }
  }
}

/** @param {CryptoKey|null} dek @param {Record<string, unknown>} todos */
async function decryptTodos(dek, todos) {
  if (!todos || typeof todos !== 'object') return;
  for (const todoId of Object.keys(todos)) {
    todos[todoId] = await maybeDecrypt(dek, todos[todoId]);
  }
}

/**
 * Decrypts a full room snapshot (`needSnapshot` pull) in place. No-op field-by-field
 * for a room with no DEK, or for values that were never encrypted.
 * @param {CryptoKey|null} dek
 * @param {Record<string, any>} state
 */
export async function decryptRoomStateFromPull(dek, state) {
  if (!state || typeof state !== 'object') return state;

  if (state.clinicalOps) {
    state.clinicalOps = await maybeDecrypt(dek, state.clinicalOps);
  }

  if (Array.isArray(state.entries)) {
    for (const entry of state.entries) {
      await decryptEntryContentFields(dek, entry);
    }
  }

  await decryptLabSidecars(dek, state.labSidecars);
  await decryptTodos(dek, state.todos);

  return state;
}
