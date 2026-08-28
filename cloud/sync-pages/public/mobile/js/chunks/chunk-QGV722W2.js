import {
  resolveClinicalSessionUserId
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

// public/js/db-storage-bridge.mjs
var CLINICAL_LS_KEYS = [
  "rpc-patients",
  "rpc-notes",
  "rpc-indicaciones",
  "rpc-labHistory",
  "rpc-medRecetaByPatient",
  "rpc-listado-problemas",
  "rpc-recetaHuByPatient",
  "rpc-vpoByPatient",
  "rpc-medPharmProfileByPatient",
  "rpc-medCatalog",
  "rpc-todos",
  "rpc-scheduled-procedures"
];
var APP_FIELD_TO_BLOB = {
  patients: "patients",
  notes: "notes",
  indicaciones: "indicaciones",
  labHistory: "labHistory",
  medRecetaByPatient: "medRecetaByPatient",
  listadoProblemas: "listadoProblemas",
  recetaHuByPatient: "recetaHuByPatient",
  vpoByPatient: "vpoByPatient",
  medPharmProfileByPatient: "medPharmProfileByPatient",
  medCatalog: "medCatalog",
  todos: "todos",
  scheduledProcedures: "scheduledProcedures"
};
function isDbMode() {
  return !!(typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.dbClinicalLoadAll === "function");
}
function isElectronDesktopShell() {
  if (typeof window === "undefined") return false;
  if (isDbMode()) return true;
  if (window.__RPC_ELECTRON_DESKTOP__) return true;
  return /\bElectron\//i.test(String(navigator.userAgent || ""));
}
function isWebClinicalClient() {
  if (isElectronDesktopShell()) return false;
  return typeof window !== "undefined" && !isDbMode();
}
async function hydrateStorageCache() {
  const res = await window.electronAPI.dbClinicalLoadAll();
  if (!res || res.ok === false) {
    const err = new Error(res?.code || res?.error || "DB_LOAD_FAILED");
    err.code = res?.code || "DB_LOAD_FAILED";
    throw err;
  }
  return res.blobs && typeof res.blobs === "object" ? res.blobs : {};
}
function parseBlobJson(raw, fallback) {
  if (raw == null || raw === "") return fallback;
  if (typeof raw !== "string") {
    try {
      return raw == null ? fallback : raw;
    } catch {
      return fallback;
    }
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}
function mapBlobsToAppState(blobs) {
  const b = blobs && typeof blobs === "object" ? blobs : {};
  return {
    patients: parseBlobJson(b.patients, []),
    notes: parseBlobJson(b.notes, {}),
    indicaciones: parseBlobJson(b.indicaciones, {}),
    labHistory: parseBlobJson(b.labHistory, {}),
    medRecetaByPatient: parseBlobJson(b.medRecetaByPatient, {}),
    listadoProblemas: parseBlobJson(b.listadoProblemas, {}),
    recetaHuByPatient: parseBlobJson(b.recetaHuByPatient, {}),
    vpoByPatient: parseBlobJson(b.vpoByPatient, {}),
    medPharmProfileByPatient: parseBlobJson(b.medPharmProfileByPatient, {}),
    medCatalog: parseBlobJson(b.medCatalog, null),
    todos: parseBlobJson(b.todos, {}),
    scheduledProcedures: parseBlobJson(b.scheduledProcedures, [])
  };
}
function appStateFieldsToBlobs(fields) {
  const blobs = {};
  if (!fields || typeof fields !== "object") return blobs;
  for (const [field, blobKey] of Object.entries(APP_FIELD_TO_BLOB)) {
    if (fields[field] === void 0) continue;
    blobs[blobKey] = JSON.stringify(fields[field]);
  }
  return blobs;
}
async function persistSaveAll(fields, auditMeta) {
  const blobs = appStateFieldsToBlobs(fields);
  const payload = {
    blobs,
    auditMeta: auditMeta && typeof auditMeta === "object" ? auditMeta : {}
  };
  if (!payload.auditMeta.eventType) {
    payload.auditMeta.eventType = "clinical.save_all";
  }
  const userId = resolveClinicalSessionUserId();
  if (userId) payload.userId = userId;
  const res = await window.electronAPI.dbClinicalSaveAll(payload);
  if (res?.ok !== false && userId) {
    const { touchClinicalSessionActivity } = await import("/mobile/js/chunks/clinical-access-runtime-7PNW7XFE.js");
    touchClinicalSessionActivity({ force: true });
  }
  return res;
}

export {
  CLINICAL_LS_KEYS,
  APP_FIELD_TO_BLOB,
  isDbMode,
  isElectronDesktopShell,
  isWebClinicalClient,
  hydrateStorageCache,
  mapBlobsToAppState,
  appStateFieldsToBlobs,
  persistSaveAll
};
//# sourceMappingURL=/js/chunks/chunk-QGV722W2.js.map
