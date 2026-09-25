/**
 * Wires crypto.mjs into the push/pull wire format.
 *
 * Scope (2026-09-18): clinical *content* is whole-value encrypted — note, indicaciones,
 * historiaClinica, eventualidades, monitoreo, medReceta, labSidecars, todos, clinicalOps.
 * Patient identity (entries/{id} root + entries/{id}/fields: nombre, cama, servicio) stays
 * plaintext — Interno's board and the admin census view both read those fields server-side
 * today, and rebuilding them to work on ciphertext is a separate, larger follow-up (see
 * docs/core/15-security.md).
 *
 * `registro` (chart number) and the diagnosis fields (diagnosticosList, diagnosticosText)
 * are the exception: they ride bundled inside that same identity payload (siblings of
 * cama/servicio/nombre), but they're clinical content, not board-display identity, so
 * they're now individually (sub-key) encrypted in place — see PATIENT_LOCKED_FIELD_KEYS.
 * `registro` additionally carries a one-way fingerprint (`registroFp`, see crypto.mjs's
 * fingerprintValue) alongside its ciphertext, so the server can still detect a re-admit
 * under the same chart number (cloud/sync-worker/src/lww.js) without ever reading it.
 *
 * A room with no DEK (dek === null — never opted into E2EE, or not unwrapped yet on
 * this device) round-trips exactly like before: nothing is encrypted, nothing decrypted.
 *
 * The backfill sweep (room-dek-migrate.mjs) walks entries/{id} and entries/{id}/fields
 * too, via listContentFieldEntries + needsReencryption below, so a room that already
 * existed before registro/diagnosis locking shipped gets its stored plaintext swept
 * into ciphertext the same way older note/indicaciones plaintext already was.
 */
import { encryptValue, decryptValue, isEncryptedEnvelope, fingerprintValue } from './crypto.mjs';

const ENTRY_CONTENT_FIELDS = ['note', 'indicaciones', 'historiaClinica', 'eventualidades', 'monitoreo', 'medReceta'];

/**
 * Clinical-content keys that ride bundled inside the patient-identity payload
 * (`entries/{id}` root stub, or `entries/{id}/fields`) alongside plaintext
 * siblings like cama/servicio/nombre. Sub-key (not whole-value) encrypted —
 * see encryptPatientLockedFieldsValue / decryptPatientLockedFieldsValue below.
 */
const PATIENT_LOCKED_FIELD_KEYS = ['registro', 'diagnosticosList', 'diagnosticosText'];

/** @param {string} path */
function isPatientIdentityOpPath(path) {
  return /^entries\/[^/]+(\/fields)?$/.test(String(path || ''));
}

/** @param {string} path */
function isTombstoneOpPath(path) {
  return /^tombstones\/[^/]+$/.test(String(path || ''));
}

/** @param {string} path */
export function isEncryptedContentPath(path) {
  const p = String(path || '');
  if (p === 'clinicalOps') return true;
  if (new RegExp(`^entries/[^/]+/(${ENTRY_CONTENT_FIELDS.join('|')})$`).test(p)) return true;
  if (p.startsWith('labSidecars/')) return true;
  if (/^todos\/[^/]+$/.test(p)) return true;
  return false;
}

/** @param {unknown} value identity payload (entries/{id} root, or entries/{id}/fields) */
function hasPlaintextLockedField(value) {
  if (!value || typeof value !== 'object') return false;
  const row = /** @type {Record<string, unknown>} */ (value);
  return PATIENT_LOCKED_FIELD_KEYS.some((key) => row[key] !== undefined && !isEncryptedEnvelope(row[key]));
}

/**
 * True when the value currently stored at `path` still has plaintext content
 * that belongs behind the room DEK — either a whole-value content field never
 * encrypted, or a patient-identity payload (entries/{id}, entries/{id}/fields)
 * carrying a plaintext locked sub-key (registro/diagnosticosList/diagnosticosText).
 * The one place `room-dek-migrate.mjs`'s backfill sweep asks "does this still
 * need re-pushing", so it can't drift out of sync with what actually gets
 * encrypted on push.
 * @param {string} path @param {unknown} value
 */
export function needsReencryption(path, value) {
  if (isEncryptedContentPath(path)) return !isEncryptedEnvelope(value);
  if (isPatientIdentityOpPath(path)) return hasPlaintextLockedField(value);
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
 * Sub-key encrypts the locked keys inside a patient-identity op value (root stub or
 * `fields`), leaving plaintext siblings (cama/servicio/nombre/...) untouched. Also
 * attaches a one-way `registroFp` fingerprint of the plaintext registro (read BEFORE
 * it gets encrypted) — cloud/sync-worker/src/lww.js's re-admit matching reads that
 * instead of the now-ciphertext registro.
 * @param {CryptoKey} dek @param {unknown} value
 */
async function encryptPatientLockedFieldsValue(dek, value) {
  if (!value || typeof value !== 'object') return value;
  const row = /** @type {Record<string, unknown>} */ (value);
  const plainRegistro = typeof row.registro === 'string' ? row.registro.trim() : '';
  const out = { ...row };
  for (const key of PATIENT_LOCKED_FIELD_KEYS) {
    if (out[key] !== undefined && !isEncryptedEnvelope(out[key])) {
      out[key] = await encryptValue(dek, out[key]);
    }
  }
  if (plainRegistro) out.registroFp = await fingerprintValue(dek, plainRegistro);
  return out;
}

/**
 * Decrypts the locked keys inside a patient-identity op value — mirror of
 * encryptPatientLockedFieldsValue. `registroFp` (a hash, never an envelope) is left
 * as-is; it's harmless on the client and irrelevant off the wire.
 * @param {CryptoKey|null} dek @param {unknown} value
 */
async function decryptPatientLockedFieldsValue(dek, value) {
  if (!value || typeof value !== 'object') return value;
  const out = { ...(/** @type {Record<string, unknown>} */ (value)) };
  await Promise.all(
    PATIENT_LOCKED_FIELD_KEYS.map(async (key) => {
      if (out[key] !== undefined) out[key] = await maybeDecrypt(dek, out[key]);
    })
  );
  return out;
}

/**
 * Swaps a tombstone op's plaintext `registro` for its one-way fingerprint before
 * it ever leaves the device — a delete tombstone must never carry the real chart
 * number over the wire. No-op when there's no plaintext registro to swap.
 * @param {CryptoKey} dek @param {unknown} value
 */
async function encryptTombstoneValue(dek, value) {
  if (!value || typeof value !== 'object') return value;
  const row = /** @type {Record<string, unknown>} */ (value);
  const plainRegistro = typeof row.registro === 'string' ? row.registro.trim() : '';
  if (!plainRegistro) return value;
  const { registro, ...rest } = row;
  return { ...rest, registroFp: await fingerprintValue(dek, plainRegistro) };
}

/**
 * @param {CryptoKey|null} dek
 * @param {unknown[]} ops
 * @returns {Promise<unknown[]>}
 */
export async function encryptOpsForPush(dek, ops) {
  if (!dek || !Array.isArray(ops)) return ops;
  return Promise.all(
    ops.map(async (op) => {
      if (!op || typeof op !== 'object') return op;
      const path = /** @type {any} */ (op).path;
      const value = /** @type {any} */ (op).value;
      if (isEncryptedContentPath(path)) {
        return { ...op, value: await encryptValue(dek, value) };
      }
      if (isPatientIdentityOpPath(path)) {
        return { ...op, value: await encryptPatientLockedFieldsValue(dek, value) };
      }
      if (isTombstoneOpPath(path)) {
        return { ...op, value: await encryptTombstoneValue(dek, value) };
      }
      return op;
    })
  );
}

/**
 * @param {CryptoKey|null} dek
 * @param {unknown[]} ops
 * @returns {Promise<unknown[]>}
 */
export async function decryptOpsFromPull(dek, ops) {
  if (!Array.isArray(ops)) return ops;
  return Promise.all(
    ops.map(async (op) => {
      if (!op || typeof op !== 'object') return op;
      const path = /** @type {any} */ (op).path;
      const value = /** @type {any} */ (op).value;
      if (isEncryptedEnvelope(value)) {
        return { ...op, value: await maybeDecrypt(dek, value) };
      }
      if (isPatientIdentityOpPath(path)) {
        return { ...op, value: await decryptPatientLockedFieldsValue(dek, value) };
      }
      return op;
    })
  );
}

/**
 * True when an op still carries a locked `{enc:1,...}` envelope after
 * `decryptOpsFromPull` — this device has no usable key for it yet. Pull-apply
 * then drops that value (see pull-apply-state.mjs's isCiphertext guard), so the
 * caller must NOT advance the local revision past this op: a later `since`-based
 * pull asks only for what comes after it and would never send it again.
 * Checks the sub-key keys too — a locked `registro` rides inside the op value
 * for an `entries/{id}` or `entries/{id}/fields` path, not as the value itself.
 * @param {unknown[]} ops
 */
export function hasLockedOpValue(ops) {
  if (!Array.isArray(ops)) return false;
  return ops.some((op) => {
    const value = /** @type {any} */ (op)?.value;
    if (isEncryptedEnvelope(value)) return true;
    if (!value || typeof value !== 'object') return false;
    return PATIENT_LOCKED_FIELD_KEYS.some((key) => isEncryptedEnvelope(value[key]));
  });
}

/**
 * Enumerates every content (path, value) pair in a full room snapshot — the same
 * fields `decryptRoomStateFromPull` walks, kept in one place so the migration sweep
 * (`room-dek-migrate.mjs`) can't drift out of sync on "which fields are content".
 * @param {Record<string, any>} state
 * @returns {{ path: string, value: unknown }[]}
 */
/** @param {unknown[]} out @param {unknown} clinicalOps */
function collectClinicalOpsEntry(out, clinicalOps) {
  if (clinicalOps !== undefined && clinicalOps !== null) {
    out.push({ path: 'clinicalOps', value: clinicalOps });
  }
}

/**
 * Content fields plus the patient-identity paths that carry a locked sub-key
 * (entries/{id} root registro, entries/{id}/fields). An identity path is
 * listed whenever it's present at all, whether or not it actually still has
 * plaintext to lock — `needsReencryption` is what decides that downstream, so
 * this stays a plain "what exists" enumeration, same as the content fields.
 * @param {unknown[]} out @param {unknown} entries
 */
function collectEntryContentEntries(out, entries) {
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !entry.id) continue;
    for (const field of ENTRY_CONTENT_FIELDS) {
      if (entry[field] !== undefined) out.push({ path: `entries/${entry.id}/${field}`, value: entry[field] });
    }
    if (entry.registro !== undefined) {
      out.push({ path: `entries/${entry.id}`, value: { registro: entry.registro } });
    }
    if (entry.fields && typeof entry.fields === 'object') {
      out.push({ path: `entries/${entry.id}/fields`, value: entry.fields });
    }
  }
}

/** @param {unknown[]} out @param {unknown} labSidecars */
function collectLabSidecarEntries(out, labSidecars) {
  if (!labSidecars || typeof labSidecars !== 'object') return;
  for (const patientId of Object.keys(labSidecars)) {
    const sets = labSidecars[patientId];
    if (!sets || typeof sets !== 'object') continue;
    for (const setId of Object.keys(sets)) {
      out.push({ path: `labSidecars/${patientId}/${setId}`, value: sets[setId] });
    }
  }
}

/** @param {unknown[]} out @param {unknown} todos */
function collectTodoEntries(out, todos) {
  if (!todos || typeof todos !== 'object') return;
  for (const todoId of Object.keys(todos)) {
    out.push({ path: `todos/${todoId}`, value: todos[todoId] });
  }
}

export function listContentFieldEntries(state) {
  const out = [];
  if (!state || typeof state !== 'object') return out;
  collectClinicalOpsEntry(out, state.clinicalOps);
  collectEntryContentEntries(out, state.entries);
  collectLabSidecarEntries(out, state.labSidecars);
  collectTodoEntries(out, state.todos);
  return out;
}

/** @param {CryptoKey|null} dek @param {object} entry */
async function decryptEntryContentFields(dek, entry) {
  if (!entry || typeof entry !== 'object') return;
  await Promise.all(
    ENTRY_CONTENT_FIELDS.map(async (field) => {
      if (entry[field] !== undefined) entry[field] = await maybeDecrypt(dek, entry[field]);
    })
  );
  // registro can land at the entry root (an `entries/{id}` admit-stub merge) or
  // nested under entry.fields (an `entries/{id}/fields` merge) — decrypt both
  // possible locations. diagnosticosList/diagnosticosText only ever ride the
  // `fields` path. Mirrors encryptPatientLockedFieldsValue/decryptPatientLockedFieldsValue.
  if (entry.registro !== undefined) entry.registro = await maybeDecrypt(dek, entry.registro);
  if (entry.fields && typeof entry.fields === 'object') {
    await Promise.all(
      PATIENT_LOCKED_FIELD_KEYS.map(async (key) => {
        if (entry.fields[key] !== undefined) entry.fields[key] = await maybeDecrypt(dek, entry.fields[key]);
      })
    );
  }
}

/** @param {CryptoKey|null} dek @param {Record<string, Record<string, unknown>>} labSidecars */
async function decryptLabSidecars(dek, labSidecars) {
  if (!labSidecars || typeof labSidecars !== 'object') return;
  await Promise.all(
    Object.keys(labSidecars).map(async (patientId) => {
      const sets = labSidecars[patientId];
      if (!sets || typeof sets !== 'object') return;
      await Promise.all(
        Object.keys(sets).map(async (setId) => {
          sets[setId] = await maybeDecrypt(dek, sets[setId]);
        })
      );
    })
  );
}

/** @param {CryptoKey|null} dek @param {Record<string, unknown>} todos */
async function decryptTodos(dek, todos) {
  if (!todos || typeof todos !== 'object') return;
  await Promise.all(
    Object.keys(todos).map(async (todoId) => {
      todos[todoId] = await maybeDecrypt(dek, todos[todoId]);
    })
  );
}

/**
 * Decrypts a full room snapshot (`needSnapshot` pull) in place. No-op field-by-field
 * for a room with no DEK, or for values that were never encrypted. Every field's
 * decrypt is independent, so they all run concurrently instead of one at a time —
 * matters most for the admin network-census pull, which decrypts 8 whole rooms
 * at once and used to be the biggest remaining cost after the round trips were cut.
 * @param {CryptoKey|null} dek
 * @param {Record<string, any>} state
 */
export async function decryptRoomStateFromPull(dek, state) {
  if (!state || typeof state !== 'object') return state;

  const clinicalOpsDone = state.clinicalOps
    ? maybeDecrypt(dek, state.clinicalOps).then((v) => {
        state.clinicalOps = v;
      })
    : Promise.resolve();

  const entriesDone = Array.isArray(state.entries)
    ? Promise.all(state.entries.map((entry) => decryptEntryContentFields(dek, entry)))
    : Promise.resolve();

  await Promise.all([
    clinicalOpsDone,
    entriesDone,
    decryptLabSidecars(dek, state.labSidecars),
    decryptTodos(dek, state.todos),
  ]);

  return state;
}
