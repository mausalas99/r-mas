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
  if (entry.historiaClinica) patient.historiaClinica = entry.historiaClinica;
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
    fold.tombstones[tombstone[1]] = value;
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

export {
  cloudStateToLanEntries,
  createOpFold,
  foldCloudOp,
  opFoldToLanEntries
};
//# sourceMappingURL=/js/chunks/chunk-ZOXS3A7B.js.map
