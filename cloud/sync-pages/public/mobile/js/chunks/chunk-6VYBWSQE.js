import {
  getCloudSyncRoomId
} from "/mobile/js/chunks/chunk-BRT2MMPP.js";

// public/js/features/cloud-sync/sala-allowlist.mjs
var CLOUD_SALAS = Object.freeze([
  "Sala 1",
  "Sala 2",
  "Sala E",
  "Torre HU",
  "Interconsultas",
  "UX",
  "Eme",
  "\xC1rea A/Pensionistas"
]);
function normalizeCloudSala(raw) {
  const s = String(raw || "").trim();
  const key = s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const salaUnit = key.match(/^sala\s*([12e])$/);
  if (salaUnit) {
    const unit = salaUnit[1] === "e" ? "E" : salaUnit[1];
    return `Sala ${unit}`;
  }
  if (key === "torre hu" || key === "torre-hu" || key === "torrehu") return "Torre HU";
  if (key.includes("interconsult")) return "Interconsultas";
  if (key === "ux") return "UX";
  if (key === "eme") return "Eme";
  if (key.includes("area a") || key.includes("pension")) return "\xC1rea A/Pensionistas";
  return s;
}
function displayCloudSalaLabel(clinicalRaw, roomSala) {
  const clinical = String(clinicalRaw || "").trim();
  if (clinical) {
    const n = normalizeCloudSala(clinical);
    if (CLOUD_SALAS.includes(n)) return n;
    return clinical;
  }
  const room = String(roomSala || "").trim();
  return room || "\u2014";
}
function isCloudSala(raw) {
  return CLOUD_SALAS.includes(normalizeCloudSala(raw));
}

// public/js/features/cloud-sync/lan-override.mjs
var _cloudRoomConnected = false;
function setCloudRoomConnected(connected) {
  _cloudRoomConnected = !!connected;
}
function isCloudSyncActive() {
  if (_cloudRoomConnected) return true;
  return !!getCloudSyncRoomId();
}
function shouldShowNubePanel(profileSala) {
  return isCloudSala(profileSala);
}
function shouldUseNubeNotLan(profileSala, cloudRoomConnected) {
  if (!isCloudSala(profileSala)) return false;
  if (cloudRoomConnected != null) return !!cloudRoomConnected;
  return isCloudSyncActive();
}

export {
  normalizeCloudSala,
  displayCloudSalaLabel,
  isCloudSala,
  setCloudRoomConnected,
  isCloudSyncActive,
  shouldShowNubePanel,
  shouldUseNubeNotLan
};
//# sourceMappingURL=/js/chunks/chunk-6VYBWSQE.js.map
