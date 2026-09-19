// public/js/clinical-read-model.mjs
var DOMAIN_KEYS = [
  "patients",
  "notes",
  "indicaciones",
  "labHistory",
  "medRecetaByPatient",
  "medPharmProfileByPatient",
  "recetaHuByPatient",
  "listadoProblemas",
  "vpoByPatient",
  "medNotaSelectionByPatient"
];
var MAP_KEYS = new Set(DOMAIN_KEYS.filter((k) => k !== "patients"));
var _cache = emptyCache();
var _listeners = /* @__PURE__ */ new Set();
function emptyCache() {
  return {
    patients: [],
    notes: {},
    indicaciones: {},
    labHistory: {},
    medRecetaByPatient: {},
    medPharmProfileByPatient: {},
    recetaHuByPatient: {},
    listadoProblemas: {},
    vpoByPatient: {},
    medNotaSelectionByPatient: {}
  };
}
function cloneValue(value) {
  if (value == null || typeof value !== "object") return value;
  try {
    if (typeof structuredClone === "function") return structuredClone(value);
  } catch {
  }
  return JSON.parse(JSON.stringify(value));
}
function notify(detail) {
  for (const fn of _listeners) {
    try {
      fn(detail);
    } catch (err) {
      console.warn("[clinical-read-model] subscriber error", err);
    }
  }
}
function getMapDomain(key, patientId) {
  const map = _cache[key] && typeof _cache[key] === "object" ? _cache[key] : {};
  if (patientId == null || patientId === "") {
    return cloneValue(map);
  }
  const id = String(patientId);
  if (!Object.prototype.hasOwnProperty.call(map, id)) return void 0;
  return cloneValue(map[id]);
}
function getPatients() {
  return cloneValue(_cache.patients);
}
function getLabHistory(patientId) {
  return getMapDomain("labHistory", patientId);
}
function _applyRepoSnapshot(partial, meta = {}) {
  if (!partial || typeof partial !== "object") return;
  let changed = false;
  if (Array.isArray(partial.patients)) {
    _cache.patients = cloneValue(partial.patients);
    changed = true;
  }
  for (const key of MAP_KEYS) {
    if (partial[key] === void 0) continue;
    const value = partial[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      _cache[key] = {};
    } else {
      _cache[key] = cloneValue(value);
    }
    changed = true;
  }
  if (!changed) return;
  notify({ source: meta.source || "snapshot" });
}
function hydrateClinicalReadModel(snapshot) {
  _applyRepoSnapshot(snapshot, { source: "hydrate" });
}
function _applyPatientPatch(patientId, patch, seed, meta = {}) {
  const id = String(patientId || "").trim();
  if (!id) return;
  const patchObj = patch && typeof patch === "object" ? cloneValue(patch) : {};
  const idx = _cache.patients.findIndex((p) => p && String(p.id) === id);
  if (idx >= 0) {
    _cache.patients[idx] = { ..._cache.patients[idx], ...patchObj, id };
  } else {
    const base = seed && typeof seed === "object" ? { ...seed } : { id };
    _cache.patients = [..._cache.patients, { ...base, ...patchObj, id }];
  }
  notify({ source: meta.source || "patient-patch" });
}

export {
  getPatients,
  getLabHistory,
  _applyRepoSnapshot,
  hydrateClinicalReadModel,
  _applyPatientPatch
};
//# sourceMappingURL=/js/chunks/chunk-FSGBGJHB.js.map
