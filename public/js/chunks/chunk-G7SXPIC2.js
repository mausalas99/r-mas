import {
  createDeltaMutationBuilder,
  createMutationBuilder,
  getActiveLiveSyncRoomId,
  isLanSessionConfiguredForRest,
  lanPushHistoriaClinica,
  lanPushHistoriaClinicaDelta
} from "/js/chunks/chunk-VQZ5PS5X.js";
import {
  patients,
  saveState
} from "/js/chunks/chunk-ZEVMTFYK.js";

// lib/historia-clinica/migrate-legacy.mjs
function migrateLegacyHistoriaData(legacy) {
  if (!legacy || typeof legacy !== "object") return legacy;
  const hasLegacyFlat = typeof legacy.ficha === "string" || typeof legacy.ahf === "string" || typeof legacy.app === "string" || typeof legacy.apnp === "string" || typeof legacy.peea === "string";
  if (!hasLegacyFlat) return { ...legacy };
  const out = { ...legacy };
  if (typeof legacy.ficha === "string" && legacy.ficha.trim()) {
    out.identificacion = {
      ...out.identificacion && typeof out.identificacion === "object" ? out.identificacion : {},
      informante: legacy.ficha.trim()
    };
  }
  if (typeof legacy.app === "string") {
    out.app = {
      conditions: [],
      descripcionDetallada: legacy.app,
      hospitalizacionesPrevias: "",
      medicamentosActuales: []
    };
  } else if (!out.app || typeof out.app !== "object" || Array.isArray(out.app)) {
    out.app = {
      conditions: [],
      descripcionDetallada: "",
      hospitalizacionesPrevias: "",
      medicamentosActuales: []
    };
  }
  if (typeof legacy.ahf === "string") {
    out.ahf = {
      conditions: [],
      descripcionDetallada: legacy.ahf
    };
  } else if (!out.ahf || typeof out.ahf !== "object" || Array.isArray(out.ahf)) {
    out.ahf = { conditions: [], customConditions: [], entries: [], descripcionDetallada: "" };
  } else {
    if (!Array.isArray(out.ahf.entries)) out.ahf.entries = [];
    if (!Array.isArray(out.ahf.customConditions)) out.ahf.customConditions = [];
    if (!Array.isArray(out.ahf.conditions)) out.ahf.conditions = [];
  }
  if (typeof legacy.apnp === "string" && legacy.apnp.trim()) {
    out.apnp = {
      ...out.apnp && typeof out.apnp === "object" ? out.apnp : {},
      tabaquismo: legacy.apnp.trim()
    };
  } else if (!out.apnp || typeof out.apnp !== "object" || Array.isArray(out.apnp)) {
    out.apnp = {};
  }
  if (typeof legacy.peea === "string") {
    out.padecimientoActual = legacy.peea;
  }
  delete out.ficha;
  delete out.peea;
  return out;
}

// lib/historia-clinica/catalogs/app-conditions.json
var app_conditions_default = {
  parotiditis: "Parotiditis",
  paperas: "Paperas",
  sarampion: "Sarampi\xF3n",
  varicela: "Varicela",
  rubeola: "Rub\xE9ola",
  tuberculosis: "Tuberculosis",
  hepatitis: "Hepatitis",
  vih: "VIH/SIDA",
  hipertension: "Hipertensi\xF3n arterial",
  diabetes: "Diabetes mellitus",
  cardiopatia: "Cardiopat\xEDa",
  enfermedadRenal: "Enfermedad renal cr\xF3nica",
  enfermedadPulmonar: "Enfermedad pulmonar cr\xF3nica",
  cancer: "Neoplasia",
  transfusiones: "Transfusiones previas",
  cirugias: "Cirug\xEDas previas",
  traumaticos: "Antecedentes traum\xE1ticos",
  alergias: "Alergias medicamentosas",
  otro: "Otro"
};

// lib/historia-clinica/catalogs/ahf-conditions.json
var ahf_conditions_default = {
  diabetes: "Diabetes mellitus",
  hipertension: "Hipertensi\xF3n arterial",
  neoplasia: "Neoplasia",
  cardiopatia: "Cardiopat\xEDa isqu\xE9mica",
  enfermedadRenal: "Enfermedad renal",
  enfermedadPulmonar: "Enfermedad pulmonar",
  tuberculosis: "Tuberculosis",
  hepatitis: "Hepatitis",
  vih: "VIH/SIDA",
  epilepsia: "Epilepsia",
  psiquiatrico: "Trastorno psiqui\xE1trico",
  tiroideo: "Enfermedad tiroidea",
  otro: "Otro"
};

// lib/historia-clinica/catalogs/ipas-systems.json
var ipas_systems_default = {
  general: "General",
  tegumentos: "Tegumentos",
  respiratorio: "Respiratorio",
  cardiovascular: "Cardiovascular",
  digestivo: "Digestivo",
  genitourinario: "Genitourinario",
  hemolinfopoietico: "Hemolinfopoy\xE9tico",
  endocrino: "Endocrino",
  nervioso: "Nervioso",
  musculoesqueletico: "Musculoesquel\xE9tico"
};

// public/js/historia-clinica-lan-sync.mjs
var CATALOGS = { appConditions: app_conditions_default, ahfConditions: ahf_conditions_default, ipasSystems: ipas_systems_default };
var HC_SYNC_KEYS = [
  "identificacion",
  "motivoConsulta",
  "apnp",
  "app",
  "ahf",
  "genero",
  "sexual",
  "padecimientoActual",
  "datosNegados",
  "ipas",
  "signosVitalesIngreso",
  "labsAtAdmission",
  "labAnchor",
  "meta",
  "labLookbackHours"
];
var HC_DELTA_SAFE_PATHS = /* @__PURE__ */ new Set([
  "labsAtAdmission.na",
  "labsAtAdmission.k",
  "labsAtAdmission.cr",
  "labsAtAdmission.hb",
  "signosVitalesIngreso.fc",
  "signosVitalesIngreso.ta",
  "signosVitalesIngreso.fr",
  "signosVitalesIngreso.temp",
  "motivoConsulta",
  "padecimientoActual",
  "plan"
]);
function readPathValue(root, path) {
  return String(path || "").split(".").reduce(function(cur, part) {
    return cur && typeof cur === "object" ? cur[part] : void 0;
  }, root);
}
function buildHistoriaClinicaDelta(patient, opts) {
  opts = opts || {};
  if (!patient || !patient.historiaClinica || !patient.historiaClinica.data) return null;
  const changedPaths = Array.isArray(opts.changedPaths) ? opts.changedPaths : [];
  if (!changedPaths.length) return null;
  if (changedPaths.some((path) => !HC_DELTA_SAFE_PATHS.has(String(path)))) return null;
  const nowMs = typeof opts.nowMs === "function" ? opts.nowMs : Date.now;
  const builder = createDeltaMutationBuilder("historiaClinica", patient.id);
  changedPaths.forEach(function(path) {
    const value = readPathValue(patient.historiaClinica.data, path);
    builder.setPath(path, value === void 0 ? null : value, nowMs());
  });
  return builder.build({
    roomId: opts.roomId,
    patientId: patient.id,
    clientId: opts.clientId || localStorage.getItem("rpc-lan-client-id") || "local",
    expectedVersion: Number(patient.historiaClinica.version || 0)
  });
}
var _inFlight = /* @__PURE__ */ new Map();
function markHistoriaPendingLanSync(patient, pending) {
  if (!patient) return;
  if (!patient.historiaClinica) patient.historiaClinica = { version: 0, data: {} };
  patient.historiaClinica.pendingLanSync = true;
  patient.historiaClinica.lanSyncPending = {
    expectedVersion: Number(pending.expectedVersion || 0),
    baseData: pending.baseData,
    changedKeys: (pending.changedKeys || []).slice(),
    source: pending.source ? String(pending.source) : "pending-lan-sync"
  };
}
async function flushPendingHistoriaClinicaLanSync(patient) {
  if (!patient || !patient.historiaClinica || !patient.historiaClinica.pendingLanSync) {
    return { ok: true, skipped: true };
  }
  const roomId = getActiveLiveSyncRoomId() || "";
  if (!isLanSessionConfiguredForRest() || !roomId) {
    return { ok: false, deferred: true };
  }
  const hc = patient.historiaClinica;
  const snap = hc.lanSyncPending;
  const changedKeys = snap && snap.changedKeys && snap.changedKeys.length ? snap.changedKeys.slice() : HC_SYNC_KEYS.filter(function(k) {
    return hc.data && hc.data[k] !== void 0;
  });
  if (!changedKeys.length) {
    delete hc.pendingLanSync;
    delete hc.lanSyncPending;
    return { ok: true, skipped: true };
  }
  const delta = buildHistoriaClinicaDelta(patient, {
    changedPaths: changedKeys,
    roomId,
    clientId: localStorage.getItem("rpc-lan-client-id") || "local"
  });
  if (delta) {
    const out = await lanPushHistoriaClinicaDelta(patient.id, delta);
    if (out && out.ok) {
      hc.version = out.version || hc.version;
      delete hc.pendingLanSync;
      delete hc.lanSyncPending;
      saveState();
      return { ok: true };
    }
  }
  const expectedVersion = snap && snap.expectedVersion != null ? Number(snap.expectedVersion) : Math.max(0, Number(hc.version || 1) - 1);
  const baseData = snap && snap.baseData != null ? snap.baseData : expectedVersion > 0 ? {} : {};
  const builder = createMutationBuilder("historiaClinica", patient.id).captureBase({
    version: expectedVersion,
    data: baseData
  });
  changedKeys.forEach(function(k) {
    if (hc.data[k] !== void 0) builder.set(k, hc.data[k]);
  });
  const mutation = builder.build({
    roomId,
    patientId: patient.id,
    clientId: localStorage.getItem("rpc-lan-client-id") || "local",
    audit: {
      sections: changedKeys,
      source: snap && snap.source ? snap.source : "pending-lan-sync"
    }
  });
  try {
    const out = await lanPushHistoriaClinica(patient.id, mutation);
    if (out && out.conflict) {
      const body = out.body && typeof out.body === "object" ? out.body : {};
      if (body.serverVersion != null || body.serverData) {
        applyServerHistoriaClinicaToPatient(
          patient,
          body.serverVersion != null ? body.serverVersion : hc.version,
          body.serverData || hc.data
        );
      } else {
        delete hc.pendingLanSync;
        delete hc.lanSyncPending;
        saveState();
      }
      return { ok: false, conflict: true, deferred: true };
    }
    if (out && out.ok) {
      hc.version = out.version;
      hc.data = migrateLegacyHistoriaData(out.data, CATALOGS);
      delete hc.pendingLanSync;
      delete hc.lanSyncPending;
      saveState();
      return { ok: true };
    }
  } catch (_e) {
  }
  return { ok: false, deferred: true };
}
function schedulePendingHistoriaClinicaLanSync(patient) {
  const id = String(patient && patient.id ? patient.id : "").trim();
  if (!id || !patient.historiaClinica || !patient.historiaClinica.pendingLanSync) return;
  if (_inFlight.has(id)) return;
  const run = flushPendingHistoriaClinicaLanSync(patient).finally(function() {
    _inFlight.delete(id);
    const p = patients.find(function(x) {
      return x.id === id;
    });
    if (p && p.historiaClinica && p.historiaClinica.pendingLanSync) {
      schedulePendingHistoriaClinicaLanSync(p);
    }
  });
  _inFlight.set(id, run);
}
async function flushAllPendingHistoriaClinicaLanSync() {
  if (!isLanSessionConfiguredForRest() || !getActiveLiveSyncRoomId()) return;
  const pending = patients.filter(function(p) {
    return p.historiaClinica && p.historiaClinica.pendingLanSync;
  });
  for (let i = 0; i < pending.length; i += 1) {
    await flushPendingHistoriaClinicaLanSync(pending[i]);
  }
}
function scheduleFlushAllPendingHistoriaClinicaLanSync() {
  void flushAllPendingHistoriaClinicaLanSync();
}
function applyServerHistoriaClinicaToPatient(patient, serverVersion, serverData) {
  if (!patient) return;
  if (!patient.historiaClinica) patient.historiaClinica = { version: 0, data: {} };
  const hc = patient.historiaClinica;
  hc.version = Number(serverVersion != null ? serverVersion : hc.version || 0);
  if (serverData && typeof serverData === "object") {
    hc.data = migrateLegacyHistoriaData(serverData, CATALOGS);
  }
  delete hc.pendingLanSync;
  delete hc.lanSyncPending;
  saveState();
}

export {
  migrateLegacyHistoriaData,
  app_conditions_default,
  ahf_conditions_default,
  ipas_systems_default,
  buildHistoriaClinicaDelta,
  markHistoriaPendingLanSync,
  flushPendingHistoriaClinicaLanSync,
  schedulePendingHistoriaClinicaLanSync,
  flushAllPendingHistoriaClinicaLanSync,
  scheduleFlushAllPendingHistoriaClinicaLanSync,
  applyServerHistoriaClinicaToPatient
};
//# sourceMappingURL=/js/chunks/chunk-G7SXPIC2.js.map
