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
function shouldClaimClinicalUsername(currentHandle, desiredHandle, clientId) {
  const current = normalizeUsername(currentHandle);
  const desired = normalizeUsername(desiredHandle);
  if (current !== desired) return true;
  if (!isValidUsernameFormat(current)) return true;
  if (isLegacyMachineUsername(current, String(clientId || ""))) return true;
  if (/^local_[a-z0-9_]+$/.test(current)) return true;
  return false;
}

export {
  normalizeUsername,
  isValidUsernameFormat,
  isLegacyMachineUsername,
  shouldClaimClinicalUsername
};
//# sourceMappingURL=/js/chunks/chunk-LQTSNMET.js.map
