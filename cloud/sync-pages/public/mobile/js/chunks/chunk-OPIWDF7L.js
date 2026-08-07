import {
  readRpcSettings
} from "/mobile/js/chunks/chunk-6WZSBH4P.js";

// public/js/features/cloud-sync/cutover-flags.mjs
var CUTOVER_FLAG_KEY = "cloudSync79Cutover";
function getCutoverFlag() {
  const s = readRpcSettings();
  return String(s[CUTOVER_FLAG_KEY] || "");
}
function setCutoverFlag(value) {
  const s = readRpcSettings();
  s[CUTOVER_FLAG_KEY] = value;
  try {
    localStorage.setItem("rpc-settings", JSON.stringify(s));
  } catch {
  }
}
function is79CutoverVersion() {
  const v = String(
    typeof window !== "undefined" && window.__RPC_APP_VERSION__ || ""
  ).trim();
  if (getCutoverFlag() === "pending") return true;
  return /^7\.9(\.|$|-)/.test(v);
}
function isCutoverPending() {
  return getCutoverFlag() === "pending";
}
function isCutoverDone() {
  return getCutoverFlag() === "done";
}

export {
  getCutoverFlag,
  setCutoverFlag,
  is79CutoverVersion,
  isCutoverPending,
  isCutoverDone
};
//# sourceMappingURL=/js/chunks/chunk-OPIWDF7L.js.map
