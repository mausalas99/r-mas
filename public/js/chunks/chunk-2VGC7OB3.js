// public/js/clinical-username.mjs
var USERNAME_RE = /^[a-z][a-z0-9_]{2,31}$/;
function normalizeUsername(raw) {
  return String(raw || "").trim().replace(/^@+/, "").toLowerCase();
}
function isValidUsernameFormat(raw) {
  return USERNAME_RE.test(normalizeUsername(raw));
}
function isLegacyMachineUsername(username, clientId) {
  const u = String(username || "");
  const c = String(clientId || "");
  if (!u) return true;
  if (c && u === c) return true;
  return /^lc_[a-z0-9_]+$/i.test(u);
}

// public/js/clinical-settings.mjs
var CLINICAL_LAN_PROFILE_GATE_VERSION = "6.6.6";
var CLINICAL_LAN_PROFILE_GATE_LEAD_HTML = "Tras actualizar a <strong>6.6.6</strong>, cada dispositivo debe volver a registrar el perfil. Son dos datos distintos: no copies el nombre en guardia en el campo de usuario.";
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
  }
  return settings;
}
function isLocalOnlyPlaceholderUsername(raw) {
  return /^local_[a-z0-9_]+$/.test(normalizeUsername(raw || ""));
}
function readRpcSettings() {
  try {
    return JSON.parse(localStorage.getItem("rpc-settings") || "{}");
  } catch (_e) {
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
    }
  }
  return next;
}
function persistClinicalUserBinding(patch) {
  const settings = readRpcSettings();
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
  }
  return settings;
}

export {
  normalizeUsername,
  isValidUsernameFormat,
  isLegacyMachineUsername,
  CLINICAL_LAN_PROFILE_GATE_VERSION,
  CLINICAL_LAN_PROFILE_GATE_LEAD_HTML,
  CLINICAL_LAN_USERNAME_HINT_HTML,
  CLINICAL_LAN_DISPLAY_NAME_HINT_HTML,
  isClinicalLocalOnlyMode,
  isClinicalSyncModeChosen,
  setClinicalSyncModeLocalOnly,
  isLocalOnlyPlaceholderUsername,
  readRpcSettings,
  resolveClinicalClientId,
  needsClinicalLanProfileGate,
  markClinicalLanProfileGateComplete,
  ensureLanProfileGateDeviceReset,
  persistClinicalUserBinding
};
//# sourceMappingURL=/js/chunks/chunk-2VGC7OB3.js.map
