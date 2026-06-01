/** Renderer mirror of lib/db/clinical-username.mjs */
const USERNAME_RE = /^[a-z][a-z0-9_]{2,31}$/;

export function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase();
}

export function isValidUsernameFormat(raw) {
  return USERNAME_RE.test(normalizeUsername(raw));
}

/** @param {string} username @param {string} clientId */
export function isLegacyMachineUsername(username, clientId) {
  const u = String(username || '');
  const c = String(clientId || '');
  if (!u) return true;
  if (c && u === c) return true;
  return /^lc_[a-z0-9_]+$/i.test(u);
}
