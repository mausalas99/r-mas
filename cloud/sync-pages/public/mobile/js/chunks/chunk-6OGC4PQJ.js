import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-GRJDNRYE.js";

// public/js/features/cloud-sync/panel-clinical-context.mjs
function getClinicalSettings() {
  try {
    return JSON.parse(localStorage.getItem("rpc-settings") || "{}");
  } catch {
    return {};
  }
}
function getClinicalRank() {
  const s = getClinicalSettings();
  return String(s.clinicalRank || "").trim();
}
function getUserSala() {
  let fromSettings = "";
  let fromUser = "";
  try {
    const s = getClinicalSettings();
    fromSettings = String(s.clinicalSala || "").trim();
  } catch {
  }
  try {
    const user = typeof clinicalSessionContext !== "undefined" ? clinicalSessionContext.user : null;
    fromUser = String(user && user.sala ? user.sala : "").trim();
  } catch {
  }
  if (fromUser) return fromUser;
  return fromSettings;
}
function isClinicalRegistered() {
  const s = getClinicalSettings();
  return s.clinicalRegistered === true;
}
function getClinicalUserUserId() {
  try {
    const user = typeof clinicalSessionContext !== "undefined" ? clinicalSessionContext.user : null;
    return user ? String(user.user_id || "") : "";
  } catch {
    return "";
  }
}

export {
  getClinicalSettings,
  getClinicalRank,
  getUserSala,
  isClinicalRegistered,
  getClinicalUserUserId
};
//# sourceMappingURL=/js/chunks/chunk-6OGC4PQJ.js.map
