import {
  labSetTimestamp,
  looksLikeSomeLabReport,
  monitoreoUpdatedAt
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";

// public/js/features/cloud-sync/constants.mjs
var CLOUD_BATCH_MUTATION_ID = "cloud-room-push";
var CLOUD_LAB_BACKFILL_MUTATION_ID = "cloud-lab-backfill";
var CLOUD_TOMBSTONES_MUTATION_ID = "cloud-tombstones";

// public/js/features/cloud-sync/pull-apply-state.mjs
var ENTRY_SKIP_KEYS = /* @__PURE__ */ new Set([
  "id",
  "note",
  "indicaciones",
  "historiaClinica",
  "eventualidades",
  "monitoreo",
  "fields"
]);
function assembleLabHistoryFromSidecars(sidecarMap) {
  if (!sidecarMap || typeof sidecarMap !== "object") return [];
  return Object.values(sidecarMap).filter((row) => row && typeof row === "object");
}
function buildPatientFromCloudEntry(entry) {
  const patientId = String(entry.id).trim();
  const fields = entry.fields;
  const patient = {
    id: patientId,
    ...fields && typeof fields === "object" ? fields : {}
  };
  for (const [key, value] of Object.entries(entry)) {
    if (ENTRY_SKIP_KEYS.has(key)) continue;
    patient[key] = value;
  }
  if (entry.eventualidades) patient.eventualidades = entry.eventualidades;
  if (entry.monitoreo) patient.monitoreo = entry.monitoreo;
  return patient;
}
function cloudEntryToLanEntry(entry, labSidecarsForPatient) {
  if (!entry?.id) return null;
  const note = entry.note;
  const indicaciones = entry.indicaciones;
  return {
    patient: buildPatientFromCloudEntry(entry),
    note: note && typeof note === "object" ? note : {},
    indicaciones: indicaciones && typeof indicaciones === "object" ? indicaciones : {},
    labHistory: assembleLabHistoryFromSidecars(labSidecarsForPatient)
  };
}
function cloudStateToLanEntries(state) {
  const labSidecars = state?.labSidecars && typeof state.labSidecars === "object" ? state.labSidecars : {};
  const rows = Array.isArray(state?.entries) ? state.entries : [];
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    const pid = String(rows[i]?.id || "").trim();
    const lanEntry = cloudEntryToLanEntry(rows[i], labSidecars[pid] || {});
    if (lanEntry) out.push(lanEntry);
  }
  return out;
}
function createOpFold() {
  return {
    entries: /* @__PURE__ */ new Map(),
    labSidecars: {},
    todos: {},
    agenda: {},
    clinicalOps: void 0,
    tombstones: {}
  };
}
function foldEntryRoot(fold, pid, value) {
  const prev = fold.entries.get(pid) || { id: pid };
  fold.entries.set(pid, { ...prev, ...value && typeof value === "object" ? value : {}, id: pid });
}
function foldEntryField(fold, pid, field, value) {
  const prev = fold.entries.get(pid) || { id: pid };
  prev[field] = value;
  fold.entries.set(pid, prev);
}
function foldLabSidecar(fold, patientId, setId, value) {
  if (!fold.labSidecars[patientId]) fold.labSidecars[patientId] = {};
  fold.labSidecars[patientId][setId] = value;
}
function foldAgendaList(fold, value) {
  const list = Array.isArray(value) ? value : [];
  for (let i = 0; i < list.length; i += 1) {
    if (list[i]?.id) fold.agenda[String(list[i].id)] = list[i];
  }
}
function foldTombstone(fold, patientId, value, op) {
  const base = value && typeof value === "object" ? { ...value } : {};
  const actorId = String(
    /** @type {{ actorId?: string }} */
    op?.actorId || ""
  ).trim();
  if (actorId) base.actorId = actorId;
  fold.tombstones[patientId] = base;
}
function foldCloudOp(fold, op) {
  const path = String(op?.path || "");
  const value = op?.value;
  const entryRoot = /^entries\/([^/]+)$/.exec(path);
  if (entryRoot) {
    foldEntryRoot(fold, entryRoot[1], value);
    return;
  }
  const entryField = /^entries\/([^/]+)\/(note|indicaciones|historiaClinica|eventualidades|monitoreo|fields)$/.exec(
    path
  );
  if (entryField) {
    foldEntryField(fold, entryField[1], entryField[2], value);
    return;
  }
  const labSidecar = /^labSidecars\/([^/]+)\/([^/]+)$/.exec(path);
  if (labSidecar) {
    foldLabSidecar(fold, labSidecar[1], labSidecar[2], value);
    return;
  }
  const todoMatch = /^todos\/([^/]+)$/.exec(path);
  if (todoMatch) {
    fold.todos[todoMatch[1]] = value;
    return;
  }
  const agendaItem = /^agenda\/([^/]+)$/.exec(path);
  if (agendaItem) {
    fold.agenda[agendaItem[1]] = value;
    return;
  }
  if (path === "agenda") {
    foldAgendaList(fold, value);
    return;
  }
  if (path === "clinicalOps") {
    fold.clinicalOps = value;
    return;
  }
  const tombstone = /^tombstones\/([^/]+)$/.exec(path);
  if (tombstone) {
    foldTombstone(fold, tombstone[1], value, op);
  }
}
function opFoldToLanEntries(fold) {
  const out = [];
  for (const entry of fold.entries.values()) {
    const pid = String(entry.id || "").trim();
    const lanEntry = cloudEntryToLanEntry(entry, fold.labSidecars[pid] || {});
    if (lanEntry) out.push(lanEntry);
  }
  return out;
}

// lib/db/canonical-json.mjs
function canonicalStringify(value) {
  return JSON.stringify(sortValue(value));
}
function sortValue(v) {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(sortValue);
  const keys = Object.keys(v).sort();
  const out = {};
  for (const k of keys) out[k] = sortValue(v[k]);
  return out;
}

// public/js/features/cloud-sync/cloud-op-slim.mjs
var CLOUD_LAB_MUTATION_MAX_BYTES = 150 * 1024;
var CLOUD_NOTE_MAX_BYTES = 256 * 1024;
var CLOUD_MONITOREO_MAX_BYTES = 150 * 1024;
var CLOUD_PUSH_WARN_BODY_BYTES = 2 * 1024 * 1024;
var CLOUD_PUSH_WARN_OP_BYTES = 180 * 1024;
var CLOUD_LAB_SET_ALLOWLIST = ["id", "fecha", "hora", "resLabs", "bhExtras", "sourceText"];
function utf8JsonBytes(value) {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}
function slimLabSetForCloud(set) {
  if (!set || typeof set !== "object") return set;
  const src = (
    /** @type {Record<string, unknown>} */
    set
  );
  const out = {};
  for (const key of CLOUD_LAB_SET_ALLOWLIST) {
    if (key === "sourceText") continue;
    if (!(key in src)) continue;
    out[key] = src[key];
  }
  const some = String(src.sourceText || "");
  if (some.trim() && looksLikeSomeLabReport(some)) out.sourceText = some;
  return out;
}
function fitResLabsToQuota(row, maxBytes) {
  const lines = Array.isArray(row.resLabs) ? row.resLabs.map((line) => String(line || "")) : [];
  if (!lines.length) return utf8JsonBytes(row) <= maxBytes ? row : null;
  let lo = 0;
  let hi = lines.length;
  let best = 0;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const trial = { ...row, resLabs: lines.slice(0, mid) };
    if (utf8JsonBytes(trial) <= maxBytes) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (!best) return null;
  return { ...row, resLabs: lines.slice(0, best) };
}
function fitLabSetToQuota(set, maxBytes = CLOUD_LAB_MUTATION_MAX_BYTES) {
  let out = slimLabSetForCloud(set);
  if (!out || typeof out !== "object") return out;
  if (utf8JsonBytes(out) <= maxBytes) return out;
  const row = (
    /** @type {Record<string, unknown>} */
    { ...out }
  );
  if (row.sourceText) {
    const someOnly = { ...row };
    delete someOnly.resLabs;
    delete someOnly.bhExtras;
    if (utf8JsonBytes(someOnly) <= maxBytes) return someOnly;
    delete row.sourceText;
    if (utf8JsonBytes(row) <= maxBytes) return row;
  }
  if (row.bhExtras) {
    delete row.bhExtras;
    if (utf8JsonBytes(row) <= maxBytes) return row;
  }
  return fitResLabsToQuota(row, maxBytes);
}
function isMonitoreoPath(path) {
  return /^entries\/[^/]+\/monitoreo$/.test(String(path || ""));
}
function maxBytesForPath(path) {
  const p = String(path || "");
  if (p.startsWith("labSidecars/")) return CLOUD_LAB_MUTATION_MAX_BYTES;
  if (isMonitoreoPath(p)) return CLOUD_MONITOREO_MAX_BYTES;
  return CLOUD_NOTE_MAX_BYTES;
}
function fitMonitoreoToQuota(value, maxBytes = CLOUD_MONITOREO_MAX_BYTES) {
  if (!value || typeof value !== "object") return value;
  if (utf8JsonBytes(value) <= maxBytes) return value;
  const src = (
    /** @type {Record<string, unknown>} */
    value
  );
  const historial = Array.isArray(src.historial) ? src.historial : [];
  if (!historial.length) return null;
  let lo = 0;
  let hi = historial.length;
  let best = 0;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const trial = { ...src, historial: historial.slice(historial.length - mid) };
    if (utf8JsonBytes(trial) <= maxBytes) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (!best) return null;
  return { ...src, historial: historial.slice(historial.length - best) };
}
function slimCloudOp(op) {
  if (!op || typeof op !== "object") return op;
  const path = String(op.path || "");
  if (path.startsWith("labSidecars/")) {
    const fitted = fitLabSetToQuota(op.value, CLOUD_LAB_MUTATION_MAX_BYTES);
    if (fitted == null) return null;
    return { ...op, value: fitted };
  }
  if (isMonitoreoPath(path)) {
    const fitted = fitMonitoreoToQuota(op.value, CLOUD_MONITOREO_MAX_BYTES);
    if (fitted == null) return null;
    return { ...op, value: fitted };
  }
  return op;
}
function sanitizeOpsForCloudPush(ops) {
  if (!Array.isArray(ops) || !ops.length) return { ops: [], dropped: 0 };
  const next = [];
  let dropped = 0;
  for (let i = 0; i < ops.length; i += 1) {
    const slimmed = slimCloudOp(
      /** @type {{ path?: string, value?: unknown }} */
      ops[i]
    );
    if (!slimmed || typeof slimmed !== "object") {
      dropped += 1;
      const dropPath = String(ops[i]?.path || "");
      if (dropPath.startsWith("labSidecars/")) markCloudLabOpPoison(dropPath);
      continue;
    }
    const path = String(slimmed.path || "");
    if (utf8JsonBytes(slimmed.value) > maxBytesForPath(path)) {
      dropped += 1;
      if (path.startsWith("labSidecars/")) markCloudLabOpPoison(path);
      continue;
    }
    next.push(slimmed);
  }
  return { ops: next, dropped };
}

// public/js/features/cloud-sync/mutate-bridge-ops.mjs
var FIELD_SKIP = /* @__PURE__ */ new Set(["historiaClinica", "id", "monitoreo", "eventualidades"]);
function noteOpUpdatedAt(note, fallback) {
  if (!note || typeof note !== "object") return fallback;
  const row = note;
  const at = String(row.updatedAt || row.savedAt || "").trim();
  return at || fallback;
}
function fieldsOpUpdatedAt(patient) {
  return String(patient?.lanUpdatedAt || "").trim();
}
function monitoreoOpUpdatedAt(monitoreo) {
  return String(monitoreoUpdatedAt(monitoreo) || "").trim();
}
function eventualidadesOpUpdatedAt(ev, fallback) {
  if (!ev || typeof ev !== "object") return fallback;
  const row = ev;
  const at = String(row.updatedAt || "").trim();
  return at || fallback;
}
function labSetId(set, index) {
  const row = set && typeof set === "object" ? set : {};
  return String(row.id || row.fecha || `idx-${index}`).trim();
}
function pickCensusFields(patient) {
  const out = {};
  for (const [key, value] of Object.entries(patient || {})) {
    if (FIELD_SKIP.has(key) || value === void 0) continue;
    out[key] = value;
  }
  return out;
}
function cloudOp(fields) {
  return {
    path: fields.path,
    value: fields.value,
    updatedAt: fields.updatedAt,
    actorId: fields.actorId
  };
}
function pushCensusFieldsOp(ops, patientId, patient, actorId) {
  const fieldsAt = fieldsOpUpdatedAt(patient);
  const fields = pickCensusFields(patient);
  if (!fieldsAt || !Object.keys(fields).length) return;
  ops.push(
    cloudOp({
      path: `entries/${patientId}/fields`,
      value: fields,
      actorId,
      updatedAt: fieldsAt
    })
  );
}
function pushCloudLiveClinicalOps(ops, patientId, patient, actorId, batchAt) {
  if (patient.monitoreo) {
    const monAt = monitoreoOpUpdatedAt(patient.monitoreo) || batchAt;
    ops.push(
      cloudOp({
        path: `entries/${patientId}/monitoreo`,
        value: patient.monitoreo,
        actorId,
        updatedAt: monAt
      })
    );
  }
  if (patient.eventualidades) {
    ops.push(
      cloudOp({
        path: `entries/${patientId}/eventualidades`,
        value: patient.eventualidades,
        actorId,
        updatedAt: eventualidadesOpUpdatedAt(patient.eventualidades, batchAt)
      })
    );
  }
}
function pushClinicalBlockOps(ops, patientId, patient, actorId, batchAt) {
  pushCloudLiveClinicalOps(ops, patientId, patient, actorId, batchAt);
}
function pushDocOps(ops, patientId, entry, actorId, batchAt) {
  ops.push(
    cloudOp({
      path: `entries/${patientId}/note`,
      value: entry.note || {},
      actorId,
      updatedAt: noteOpUpdatedAt(entry.note, batchAt)
    })
  );
  ops.push(
    cloudOp({
      path: `entries/${patientId}/indicaciones`,
      value: entry.indicaciones || {},
      actorId,
      updatedAt: noteOpUpdatedAt(entry.indicaciones, batchAt)
    })
  );
}
function pushLabSidecarOps(ops, patientId, labs, actorId, batchAt) {
  for (let i = 0; i < labs.length; i += 1) {
    const setId = labSetId(labs[i], i);
    if (!setId) continue;
    const labAt = String(labSetTimestamp(labs[i]) || "").trim() || batchAt;
    ops.push(
      cloudOp({
        path: `labSidecars/${patientId}/${setId}`,
        value: slimLabSetForCloud(labs[i]),
        actorId,
        updatedAt: labAt
      })
    );
  }
}
function mapPatientEntryToOps(entry, meta) {
  if (!entry?.patient?.id) return [];
  const patientId = String(entry.patient.id).trim();
  if (!patientId || patientId.indexOf("demo-") === 0) return [];
  const actorId = meta.actorId;
  const batchAt = meta.updatedAt;
  const ops = [];
  pushCensusFieldsOp(ops, patientId, entry.patient, actorId);
  pushClinicalBlockOps(ops, patientId, entry.patient, actorId, batchAt);
  pushDocOps(ops, patientId, entry, actorId, batchAt);
  const labs = Array.isArray(entry.labHistory) ? entry.labHistory : [];
  pushLabSidecarOps(ops, patientId, labs, actorId, batchAt);
  return ops;
}
function mapPatientEntryToCensusSeedOps(entry, meta) {
  if (!entry?.patient?.id) return [];
  const patientId = String(entry.patient.id).trim();
  if (!patientId || patientId.indexOf("demo-") === 0) return [];
  const ops = [];
  pushCensusFieldsOp(ops, patientId, entry.patient, meta.actorId);
  return ops;
}
function mapPatientEntryToCloudBundleOps(entry, meta) {
  if (!entry?.patient?.id) return [];
  const patientId = String(entry.patient.id).trim();
  if (!patientId || patientId.indexOf("demo-") === 0) return [];
  const ops = [];
  pushCensusFieldsOp(ops, patientId, entry.patient, meta.actorId);
  pushCloudLiveClinicalOps(ops, patientId, entry.patient, meta.actorId, meta.updatedAt);
  return ops;
}
function registroByPatientIdFromBundle(bundle) {
  const out = {};
  const entries = Array.isArray(bundle?.entries) ? bundle.entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const pid = String(entry?.patient?.id || "").trim();
    const reg = String(entry?.patient?.registro || "").trim();
    if (pid && reg) out[pid] = reg;
  }
  return out;
}
function mapBundleTodosToOps(bundle, meta) {
  const ops = [];
  const regByPid = registroByPatientIdFromBundle(bundle);
  const todos = bundle.todos && typeof bundle.todos === "object" ? bundle.todos : {};
  for (const pid of Object.keys(todos)) {
    const list = Array.isArray(todos[pid]) ? todos[pid] : [];
    for (let j = 0; j < list.length; j += 1) {
      const todo = list[j];
      if (!todo?.id) continue;
      const patientId = String(pid || todo.patientId || "").trim();
      const registro = String(todo.registro || regByPid[patientId] || "").trim();
      const row = { ...todo, patientId };
      if (registro) row.registro = registro;
      const todoAt = String(row.updatedAt || meta.updatedAt).trim() || meta.updatedAt;
      ops.push(
        cloudOp({
          path: `todos/${todo.id}`,
          value: row,
          actorId: meta.actorId,
          updatedAt: todoAt
        })
      );
    }
  }
  return ops;
}
function mapBundleAgendaToOps(bundle, meta) {
  const ops = [];
  const agenda = Array.isArray(bundle.agenda) ? bundle.agenda : [];
  for (let k = 0; k < agenda.length; k += 1) {
    const item = agenda[k];
    if (!item?.id) continue;
    ops.push(cloudOp({ path: `agenda/${item.id}`, value: item, ...meta }));
  }
  return ops;
}
function mapBundleEnvelopeToOps(bundle, meta) {
  if (!bundle) return [];
  const ops = [];
  const entries = Array.isArray(bundle.entries) ? bundle.entries : [];
  for (let i = 0; i < entries.length; i += 1) {
    ops.push(...mapPatientEntryToCloudBundleOps(entries[i], meta));
  }
  ops.push(...mapBundleTodosToOps(bundle, meta));
  ops.push(...mapBundleAgendaToOps(bundle, meta));
  return ops;
}
function countPatientEntryOps(ops) {
  let count = 0;
  for (let i = 0; i < ops.length; i += 1) {
    if (String(ops[i]?.path || "").startsWith("entries/")) count += 1;
  }
  return count;
}
function buildInternoAccessUpsertOp(row) {
  const sala = String(row?.sala || "").trim();
  return {
    type: "internoAccessUpsert",
    sala,
    accessToken: String(row?.access_token || ""),
    isActive: Number(row?.is_active) === 1,
    rotatedAt: row?.rotated_at ? String(row.rotated_at) : null,
    rotatedBy: row?.rotated_by ? String(row.rotated_by) : null
  };
}
function internoAccessMutationId(row) {
  const sala = String(row?.sala || "").trim();
  const rotatedAt = String(row?.rotated_at || "").trim();
  const active = Number(row?.is_active) === 1 ? "1" : "0";
  return `internoAccess/${sala}/${rotatedAt || "na"}/${active}`;
}
function hasNonEntryCloudOps(ops) {
  for (let i = 0; i < ops.length; i += 1) {
    const path = String(ops[i]?.path || "");
    if (!path.startsWith("entries/")) return true;
  }
  return false;
}

// public/js/features/cloud-sync/cloud-lab-sidecar-index.mjs
var CLOUD_LAB_FP_INDEX_KEY = "rpc-cloud-sync-lab-fp-index";
var CLOUD_LAB_POISON_KEY = "rpc-cloud-sync-lab-poison";
function cloudLabSidecarFingerprint(set) {
  return canonicalStringify(slimLabSetForCloud(set));
}
function cloudLabSidecarOpFingerprint(op) {
  return cloudLabSidecarFingerprint(op?.value);
}
function isCloudLabSidecarPath(path) {
  return String(path || "").startsWith("labSidecars/");
}
function parseCloudLabSidecarPath(path) {
  const m = /^labSidecars\/([^/]+)\/([^/]+)$/.exec(String(path || "").trim());
  if (!m) return null;
  return { patientId: m[1], setId: m[2], path: `labSidecars/${m[1]}/${m[2]}` };
}
function readLabFingerprintIndex() {
  try {
    const raw = localStorage.getItem(CLOUD_LAB_FP_INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function writeLabFingerprintIndex(index) {
  try {
    localStorage.setItem(CLOUD_LAB_FP_INDEX_KEY, JSON.stringify(index));
  } catch {
  }
}
function readLabPoisonPaths() {
  try {
    const raw = localStorage.getItem(CLOUD_LAB_POISON_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return /* @__PURE__ */ new Set();
  }
}
function writeLabPoisonPaths(paths) {
  try {
    localStorage.setItem(CLOUD_LAB_POISON_KEY, JSON.stringify([...paths]));
  } catch {
  }
}
function markCloudLabOpPoison(path) {
  const p = String(path || "").trim();
  if (!p || !isCloudLabSidecarPath(p)) return;
  const set = readLabPoisonPaths();
  if (set.has(p)) return;
  set.add(p);
  writeLabPoisonPaths(set);
}
function isCloudLabOpPoison(path, poisonSet) {
  const set = poisonSet || readLabPoisonPaths();
  return set.has(String(path || "").trim());
}
function shouldSkipCloudLabSidecarPush(patientId, set, setId, index) {
  const sid = String(setId || labSetId(set, 0) || "").trim();
  const pid = String(patientId || "").trim();
  if (!pid || !sid) return true;
  const path = `labSidecars/${pid}/${sid}`;
  const fp = cloudLabSidecarFingerprint(set);
  const idx = index || readLabFingerprintIndex();
  return idx[path]?.fp === fp;
}
function buildDirtyLabSidecarOpsForPatient(patientId, labs, meta) {
  const ops = [];
  const actorId = meta.actorId;
  const batchAt = meta.updatedAt;
  const list = Array.isArray(labs) ? labs : [];
  const idx = readLabFingerprintIndex();
  const poisonPaths = readLabPoisonPaths();
  for (let i = 0; i < list.length; i += 1) {
    const set = list[i];
    const setId = labSetId(set, i);
    if (!setId) continue;
    const opPath = `labSidecars/${patientId}/${setId}`;
    if (isCloudLabOpPoison(opPath, poisonPaths)) continue;
    if (shouldSkipCloudLabSidecarPush(patientId, set, setId, idx)) continue;
    const labAt = String(labSetTimestamp(set) || "").trim() || batchAt;
    ops.push(
      cloudOp({
        path: opPath,
        value: slimLabSetForCloud(set),
        actorId,
        updatedAt: labAt
      })
    );
  }
  return ops;
}
function noteCloudLabSidecarsFromState(state) {
  const labSidecars = state?.labSidecars;
  if (!labSidecars || typeof labSidecars !== "object") return 0;
  const idx = readLabFingerprintIndex();
  let n = 0;
  for (const pid of Object.keys(labSidecars)) {
    const sets = labSidecars[pid];
    if (!sets || typeof sets !== "object") continue;
    for (const setId of Object.keys(sets)) {
      const value = sets[setId];
      if (!value || typeof value !== "object") continue;
      const path = `labSidecars/${pid}/${setId}`;
      idx[path] = { fp: cloudLabSidecarFingerprint(value), at: Date.now(), src: "pull" };
      n += 1;
    }
  }
  writeLabFingerprintIndex(idx);
  return n;
}
function noteCloudLabSidecarsFromFold(fold) {
  const map = fold?.labSidecars;
  if (!map || typeof map !== "object") return 0;
  const idx = readLabFingerprintIndex();
  let n = 0;
  for (const pid of Object.keys(map)) {
    const sets = map[pid];
    if (!sets || typeof sets !== "object") continue;
    for (const setId of Object.keys(sets)) {
      const value = sets[setId];
      if (!value || typeof value !== "object") continue;
      const path = `labSidecars/${pid}/${setId}`;
      idx[path] = { fp: cloudLabSidecarFingerprint(value), at: Date.now(), src: "pull" };
      n += 1;
    }
  }
  writeLabFingerprintIndex(idx);
  return n;
}
function noteCloudLabSidecarsFromPullResult(result) {
  if (!result || typeof result !== "object") return 0;
  const row = result;
  if (row.state) return noteCloudLabSidecarsFromState(row.state);
  if (!Array.isArray(row.ops) || !row.ops.length) return 0;
  const fold = createOpFold();
  for (let i = 0; i < row.ops.length; i += 1) {
    foldCloudOp(fold, row.ops[i]);
  }
  return noteCloudLabSidecarsFromFold(fold);
}
function noteCloudLabSidecarOpsSent(originalOps, sentOps) {
  if (!Array.isArray(sentOps) || !sentOps.length) return 0;
  const sentPaths = new Set(sentOps.map((op) => String(op?.path || "")));
  const originals = (Array.isArray(originalOps) ? originalOps : []).filter(
    (op) => sentPaths.has(String(op?.path || ""))
  );
  return noteCloudLabSidecarOpsPushed(originals);
}
function noteCloudLabSidecarOpsPushed(ops) {
  if (!Array.isArray(ops) || !ops.length) return 0;
  const idx = readLabFingerprintIndex();
  let n = 0;
  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];
    if (!op || typeof op !== "object") continue;
    const path = String(op.path || "");
    if (!isCloudLabSidecarPath(path)) continue;
    idx[path] = { fp: cloudLabSidecarOpFingerprint(op), at: Date.now(), src: "push" };
    n += 1;
  }
  writeLabFingerprintIndex(idx);
  return n;
}
function filterCloudLabSidecarOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return [];
  const idx = readLabFingerprintIndex();
  return ops.filter(function(op) {
    if (!op || typeof op !== "object") return false;
    const path = String(op.path || "");
    if (!isCloudLabSidecarPath(path)) return true;
    return idx[path]?.fp !== cloudLabSidecarOpFingerprint(op);
  });
}
function coalesceLabSidecarOps(ops) {
  if (!Array.isArray(ops) || !ops.length) return [];
  const rest = [];
  const byPath = /* @__PURE__ */ new Map();
  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];
    if (!op || typeof op !== "object") continue;
    const path = String(op.path || "");
    if (!isCloudLabSidecarPath(path)) {
      rest.push(op);
      continue;
    }
    const prev = byPath.get(path);
    if (!prev) {
      byPath.set(path, op);
      continue;
    }
    const prevAt = String(
      /** @type {{ updatedAt?: string }} */
      prev.updatedAt || ""
    );
    const nextAt = String(
      /** @type {{ updatedAt?: string }} */
      op.updatedAt || ""
    );
    if (nextAt >= prevAt) byPath.set(path, op);
  }
  return rest.concat(Array.from(byPath.values()));
}
function isLabSidecarOutboxMutationId(clientMutationId) {
  const id = String(clientMutationId || "");
  return id.startsWith("labSidecars/") || id === "cloud-lab-backfill";
}

export {
  CLOUD_BATCH_MUTATION_ID,
  CLOUD_LAB_BACKFILL_MUTATION_ID,
  CLOUD_TOMBSTONES_MUTATION_ID,
  cloudStateToLanEntries,
  createOpFold,
  foldCloudOp,
  opFoldToLanEntries,
  isCloudLabSidecarPath,
  parseCloudLabSidecarPath,
  buildDirtyLabSidecarOpsForPatient,
  noteCloudLabSidecarsFromPullResult,
  noteCloudLabSidecarOpsSent,
  filterCloudLabSidecarOps,
  coalesceLabSidecarOps,
  isLabSidecarOutboxMutationId,
  CLOUD_PUSH_WARN_BODY_BYTES,
  CLOUD_PUSH_WARN_OP_BYTES,
  utf8JsonBytes,
  sanitizeOpsForCloudPush,
  labSetId,
  pickCensusFields,
  cloudOp,
  pushCensusFieldsOp,
  mapPatientEntryToOps,
  mapPatientEntryToCensusSeedOps,
  mapPatientEntryToCloudBundleOps,
  mapBundleEnvelopeToOps,
  countPatientEntryOps,
  buildInternoAccessUpsertOp,
  internoAccessMutationId,
  hasNonEntryCloudOps
};
//# sourceMappingURL=/js/chunks/chunk-4ALI7FVW.js.map
