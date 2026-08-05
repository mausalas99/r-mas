import {
  normalizeUsername
} from "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/clinical-settings.mjs
var CLINICAL_LAN_PROFILE_GATE_VERSION = "7.9.0";
var CLINICAL_LAN_PROFILE_GATE_LEAD_HTML = "Migraci\xF3n <strong>7.9</strong>: se reinician las cuentas en este equipo; <strong>pacientes y labs se conservan</strong>. Elige tu @usuario (o crea uno nuevo). En <strong>Sala</strong> o <strong>Torre HU</strong> registras tambi\xE9n tu <strong>contrase\xF1a de Nube</strong> aqu\xED \u2014 no copies el nombre en guardia en el campo de usuario.";
var CLINICAL_LAN_USERNAME_HINT_HTML = "<strong>Usuario LAN (@usuario)</strong> \u2014 identificador \xFAnico en min\xFAsculas, sin espacios ni tildes: apellido + inicio del nombre, p. ej. <code>drmendoza</code> o <code>garcia</code>. No escribas \xABDr. \u2026\xBB aqu\xED.";
var CLINICAL_LAN_DISPLAY_NAME_HINT_HTML = "<strong>Nombre en guardia</strong> \u2014 c\xF3mo te ven en el censo y las entregas: p. ej. <code>Dr. Mendoza</code> o <code>R1 Garc\xEDa</code>.";
function isClinicalLocalOnlyMode(settings = readRpcSettings()) {
  return settings?.clinicalLocalOnly === true;
}
function isClinicalSyncModeChosen(settings = readRpcSettings()) {
  return settings?.clinicalLocalOnly === true || settings?.clinicalLocalOnly === false;
}
function setClinicalSyncModeLocalOnly(localOnly) {
  const settings = readRpcSettings();
  settings.clinicalLocalOnly = !!localOnly;
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(settings));
  } catch (_e) {
    void _e;
  }
  return settings;
}
function isLocalOnlyPlaceholderUsername(raw) {
  return /^local_[a-z0-9_]+$/.test(normalizeUsername(raw || ""));
}
function bundledWardShiftPin() {
  const now = /* @__PURE__ */ new Date();
  if (now.getFullYear() === 2026 && now.getMonth() === 5) return "527953";
  return "";
}
function bundledWardHostUrl() {
  return "http://10.0.57.65:3738";
}
function bundledWardInviteUrl() {
  return "http://10.0.57.65:3738/join/req_5246cafe2d94?th=1407e41b";
}
function readRpcSettings() {
  try {
    return JSON.parse(localStorage.getItem("rpc-settings") || "{}");
  } catch {
    return {};
  }
}
function resolveClinicalClientId(settings = readRpcSettings()) {
  const fromSettings = String(settings?.clientId || "").trim();
  if (fromSettings) return fromSettings;
  try {
    const raw = localStorage.getItem("rpc-lan-client-id");
    const fromLan = String(raw || "").trim();
    if (fromLan) return fromLan;
  } catch (_e) {
    void _e;
  }
  return "desktop-host";
}
function needsClinicalLanProfileGate(settings = readRpcSettings()) {
  if (isClinicalLocalOnlyMode(settings)) return false;
  return String(settings?.clinicalLanProfileGateVersion || "") !== CLINICAL_LAN_PROFILE_GATE_VERSION;
}
function markClinicalLanProfileGateComplete(settings = readRpcSettings()) {
  settings.clinicalLanProfileGateVersion = CLINICAL_LAN_PROFILE_GATE_VERSION;
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(settings));
  } catch (_e) {
    void _e;
  }
  return settings;
}
function ensureLanProfileGateDeviceReset(settings = readRpcSettings()) {
  if (!needsClinicalLanProfileGate(settings)) return settings;
  const next = { ...settings };
  let dirty = false;
  for (const key of ["clinicalUsername", "clinicalDisplayName"]) {
    if (next[key]) {
      delete next[key];
      dirty = true;
    }
  }
  if (dirty) {
    try {
      localStorage.setItem("rpc-settings", JSON.stringify(next));
    } catch (_e) {
      void _e;
    }
  }
  return next;
}
function persistClinicalUserBinding(patch) {
  const settings = readRpcSettings();
  if (!settings.clientId) {
    settings.clientId = resolveClinicalClientId(settings);
  }
  if (patch.userId) settings.clinicalUserId = String(patch.userId);
  if (patch.staleDeviceUserId) {
    settings.clinicalStaleDeviceUserId = String(patch.staleDeviceUserId);
  }
  if (patch.username) settings.clinicalUsername = String(patch.username);
  if (patch.displayName) settings.clinicalDisplayName = String(patch.displayName);
  if (patch.rank) settings.clinicalRank = String(patch.rank);
  if (patch.sala != null) settings.clinicalSala = String(patch.sala);
  if (patch.registered === true) settings.clinicalRegistered = true;
  if (patch.lanProfileGateComplete === true) {
    settings.clinicalLanProfileGateVersion = CLINICAL_LAN_PROFILE_GATE_VERSION;
  }
  if (patch.isProgramAdmin !== void 0) {
    settings.clinicalProgramAdmin = !!patch.isProgramAdmin;
  }
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(settings));
  } catch (_e) {
    void _e;
  }
  return settings;
}

export {
  CLINICAL_LAN_PROFILE_GATE_VERSION,
  CLINICAL_LAN_PROFILE_GATE_LEAD_HTML,
  CLINICAL_LAN_USERNAME_HINT_HTML,
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  isClinicalLocalOnlyMode,
  isClinicalSyncModeChosen,
  setClinicalSyncModeLocalOnly,
  isLocalOnlyPlaceholderUsername,
  bundledWardShiftPin,
  bundledWardHostUrl,
  bundledWardInviteUrl,
  readRpcSettings,
  resolveClinicalClientId,
  needsClinicalLanProfileGate,
  markClinicalLanProfileGateComplete,
  ensureLanProfileGateDeviceReset,
  persistClinicalUserBinding
};
//# sourceMappingURL=/js/chunks/chunk-3566DTDN.js.map
