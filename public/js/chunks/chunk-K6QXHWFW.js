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
  "rpc-scheduled-procedures",
  "rpc-lan-room-snapshots",
  "rpc-lan-host-patient-map"
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
  scheduledProcedures: "scheduledProcedures",
  lanRoomSnapshots: "lanRoomSnapshots",
  lanHostPatientMap: "lanHostPatientMap"
};
function isDbMode() {
  return !!(typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.dbClinicalLoadAll === "function");
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
  return window.electronAPI.dbClinicalSaveAll(payload);
}

export {
  CLINICAL_LS_KEYS,
  isDbMode,
  hydrateStorageCache,
  appStateFieldsToBlobs,
  persistSaveAll
};
//# sourceMappingURL=/js/chunks/chunk-K6QXHWFW.js.map
