import {
  hydrateClinicalReadModel
} from "/mobile/js/chunks/chunk-FSGBGJHB.js";
import {
  mapBlobsToAppState
} from "/mobile/js/chunks/chunk-QGV722W2.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";

// public/js/clinical-repo-hydrate.mjs
var MAP_FIELDS = [
  "notes",
  "indicaciones",
  "labHistory",
  "medRecetaByPatient",
  "medPharmProfileByPatient",
  "recetaHuByPatient",
  "listadoProblemas",
  "vpoByPatient"
];
var STORAGE_GETTERS = [
  ["patients", "getPatients"],
  ["notes", "getNotes"],
  ["indicaciones", "getIndicaciones"],
  ["labHistory", "getLabHistory"],
  ["medRecetaByPatient", "getMedRecetaByPatient"],
  ["medPharmProfileByPatient", "getMedPharmProfileByPatient"],
  ["recetaHuByPatient", "getRecetaHuByPatient"],
  ["listadoProblemas", "getListadoProblemas"],
  ["vpoByPatient", "getVpoByPatient"]
];
function canHydrateClinicalRepoFromDb() {
  return !!(typeof window !== "undefined" && window.electronAPI && typeof window.electronAPI.dbClinicalLoadAll === "function");
}
function asPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function snapshotFromFields(fields) {
  const f = fields && typeof fields === "object" ? fields : {};
  const snap = {
    patients: Array.isArray(f.patients) ? f.patients : []
  };
  for (const key of MAP_FIELDS) {
    snap[key] = asPlainObject(f[key]);
  }
  return snap;
}
function snapshotFromStorage(storage) {
  if (!storage || typeof storage !== "object") return null;
  const fields = {};
  let any = false;
  for (const [field, method] of STORAGE_GETTERS) {
    if (typeof storage[method] !== "function") continue;
    try {
      fields[field] = storage[method]();
      any = true;
    } catch {
      return null;
    }
  }
  if (!any) return null;
  return snapshotFromFields(fields);
}
async function hydrateFromDb() {
  try {
    const res = await window.electronAPI.dbClinicalLoadAll();
    if (!res || res.ok === false) {
      return { ok: false, error: String(res?.code || res?.error || "DB_LOAD_FAILED") };
    }
    const blobs = res.blobs && typeof res.blobs === "object" ? res.blobs : {};
    hydrateClinicalReadModel(snapshotFromFields(mapBlobsToAppState(blobs)));
    return { ok: true, source: "db" };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err || "DB_LOAD_FAILED") };
  }
}
async function resolveStorage(storageOpt) {
  if (storageOpt) return storageOpt;
  try {
    const mod = await import("/mobile/js/chunks/storage-2RBETHZM.js");
    return mod.storage || mod.default || null;
  } catch {
    return null;
  }
}
async function hydrateClinicalRepoIntoReadModel(opts = {}) {
  if (canHydrateClinicalRepoFromDb()) {
    return hydrateFromDb();
  }
  const snap = snapshotFromStorage(await resolveStorage(opts.storage));
  if (!snap) {
    return { ok: false, error: "hydrate_unavailable" };
  }
  hydrateClinicalReadModel(snap);
  return { ok: true, source: "storage" };
}
export {
  canHydrateClinicalRepoFromDb,
  hydrateClinicalRepoIntoReadModel
};
//# sourceMappingURL=/js/chunks/clinical-repo-hydrate-SVW6HQEE.js.map
