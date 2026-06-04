// public/js/clinical-settings.mjs
var CLINICAL_LAN_PROFILE_GATE_VERSION = "5.5.7";
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
  CLINICAL_LAN_PROFILE_GATE_VERSION,
  readRpcSettings,
  resolveClinicalClientId,
  needsClinicalLanProfileGate,
  markClinicalLanProfileGateComplete,
  persistClinicalUserBinding
};
//# sourceMappingURL=/js/chunks/chunk-ZYO74J2K.js.map
