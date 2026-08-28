import {
  decryptValue,
  encryptValue,
  isEncryptedEnvelope
} from "/mobile/js/chunks/chunk-PVAHDYTI.js";

// public/js/features/cloud-sync/cloud-sync-crypto-wire.mjs
var ENTRY_CONTENT_FIELDS = ["note", "indicaciones", "historiaClinica", "eventualidades", "monitoreo"];
function isEncryptedContentPath(path) {
  const p = String(path || "");
  if (p === "clinicalOps") return true;
  if (new RegExp(`^entries/[^/]+/(${ENTRY_CONTENT_FIELDS.join("|")})$`).test(p)) return true;
  if (p.startsWith("labSidecars/")) return true;
  if (/^todos\/[^/]+$/.test(p)) return true;
  return false;
}
async function maybeDecrypt(dek, value) {
  if (!isEncryptedEnvelope(value)) return value;
  if (!dek) return value;
  try {
    return await decryptValue(dek, value);
  } catch {
    return value;
  }
}
async function encryptOpsForPush(dek, ops) {
  if (!dek || !Array.isArray(ops)) return ops;
  const out = [];
  for (const op of ops) {
    if (op && typeof op === "object" && isEncryptedContentPath(
      /** @type {any} */
      op.path
    )) {
      out.push({ ...op, value: await encryptValue(
        dek,
        /** @type {any} */
        op.value
      ) });
    } else {
      out.push(op);
    }
  }
  return out;
}
async function decryptOpsFromPull(dek, ops) {
  if (!Array.isArray(ops)) return ops;
  const out = [];
  for (const op of ops) {
    if (op && typeof op === "object" && isEncryptedEnvelope(
      /** @type {any} */
      op.value
    )) {
      out.push({ ...op, value: await maybeDecrypt(
        dek,
        /** @type {any} */
        op.value
      ) });
    } else {
      out.push(op);
    }
  }
  return out;
}
function collectClinicalOpsEntry(out, clinicalOps) {
  if (clinicalOps !== void 0 && clinicalOps !== null) {
    out.push({ path: "clinicalOps", value: clinicalOps });
  }
}
function collectEntryContentEntries(out, entries) {
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || !entry.id) continue;
    for (const field of ENTRY_CONTENT_FIELDS) {
      if (entry[field] !== void 0) out.push({ path: `entries/${entry.id}/${field}`, value: entry[field] });
    }
  }
}
function collectLabSidecarEntries(out, labSidecars) {
  if (!labSidecars || typeof labSidecars !== "object") return;
  for (const patientId of Object.keys(labSidecars)) {
    const sets = labSidecars[patientId];
    if (!sets || typeof sets !== "object") continue;
    for (const setId of Object.keys(sets)) {
      out.push({ path: `labSidecars/${patientId}/${setId}`, value: sets[setId] });
    }
  }
}
function collectTodoEntries(out, todos) {
  if (!todos || typeof todos !== "object") return;
  for (const todoId of Object.keys(todos)) {
    out.push({ path: `todos/${todoId}`, value: todos[todoId] });
  }
}
function listContentFieldEntries(state) {
  const out = [];
  if (!state || typeof state !== "object") return out;
  collectClinicalOpsEntry(out, state.clinicalOps);
  collectEntryContentEntries(out, state.entries);
  collectLabSidecarEntries(out, state.labSidecars);
  collectTodoEntries(out, state.todos);
  return out;
}
async function decryptEntryContentFields(dek, entry) {
  if (!entry || typeof entry !== "object") return;
  for (const field of ENTRY_CONTENT_FIELDS) {
    if (entry[field] !== void 0) entry[field] = await maybeDecrypt(dek, entry[field]);
  }
}
async function decryptLabSidecars(dek, labSidecars) {
  if (!labSidecars || typeof labSidecars !== "object") return;
  for (const patientId of Object.keys(labSidecars)) {
    const sets = labSidecars[patientId];
    if (!sets || typeof sets !== "object") continue;
    for (const setId of Object.keys(sets)) {
      sets[setId] = await maybeDecrypt(dek, sets[setId]);
    }
  }
}
async function decryptTodos(dek, todos) {
  if (!todos || typeof todos !== "object") return;
  for (const todoId of Object.keys(todos)) {
    todos[todoId] = await maybeDecrypt(dek, todos[todoId]);
  }
}
async function decryptRoomStateFromPull(dek, state) {
  if (!state || typeof state !== "object") return state;
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

export {
  isEncryptedContentPath,
  encryptOpsForPush,
  decryptOpsFromPull,
  listContentFieldEntries,
  decryptRoomStateFromPull
};
//# sourceMappingURL=/js/chunks/chunk-O5BLBOGB.js.map
