// public/js/demo-patient.mjs
function isDemoPatientId(patientId) {
  return String(patientId || "").indexOf("demo-") === 0;
}

// public/js/live-sync-room.mjs
var CLIENT_ID_KEY = "rpc-client-id";
var LEGACY_CLIENT_ID_KEY = "rpc-lan-client-id";
function readMigratedClientId(storage = localStorage) {
  try {
    const current = String(storage.getItem(CLIENT_ID_KEY) || "").trim();
    if (current) return current;
    const legacy = String(storage.getItem(LEGACY_CLIENT_ID_KEY) || "").trim();
    if (!legacy) return "";
    storage.setItem(CLIENT_ID_KEY, legacy);
    storage.removeItem(LEGACY_CLIENT_ID_KEY);
    return legacy;
  } catch {
    return "";
  }
}
function compareIso(a, b) {
  const x = String(a || "");
  const y = String(b || "");
  if (x > y) return 1;
  if (x < y) return -1;
  return 0;
}

export {
  isDemoPatientId,
  readMigratedClientId,
  compareIso
};
//# sourceMappingURL=/js/chunks/chunk-WAILSXBQ.js.map
