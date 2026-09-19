/** Renderer copy of lib/db/clinical-username.mjs — parity in clinical-username.test.mjs */
const USERNAME_RE = /^[a-z][a-z0-9_]{2,31}$/;

export function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
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

/** Machine or LAN-stub handle — valid syntax but not a claimed @usuario for the directory. */
export function isDirectoryPendingUsername(raw) {
  const handle = normalizeUsername(raw || '');
  if (!handle) return true;
  if (!isValidUsernameFormat(handle)) return true;
  if (/^lc_[a-z0-9_]+$/.test(handle)) return true;
  if (/^peer_[a-z0-9_]+$/.test(handle)) return true;
  return false;
}

/**
 * Completed clinical registration: claimed @usuario or saved nombre clínico.
 * @param {{ username?: string, clinical_name?: string } | null | undefined} row
 */
export function isRegisteredClinicalUser(row) {
  const handle = normalizeUsername(row?.username || '');
  if (isValidUsernameFormat(handle) && !isDirectoryPendingUsername(handle)) return true;
  return !!String(row?.clinical_name || '').trim();
}

/**
 * Whether @usuario must be claimed on the current session row before profile save.
 * @param {string} currentHandle
 * @param {string} desiredHandle
 * @param {string} [clientId]
 */
export function shouldClaimClinicalUsername(currentHandle, desiredHandle, clientId) {
  const current = normalizeUsername(currentHandle);
  const desired = normalizeUsername(desiredHandle);
  if (current !== desired) return true;
  if (!isValidUsernameFormat(current)) return true;
  if (isLegacyMachineUsername(current, String(clientId || ''))) return true;
  if (/^local_[a-z0-9_]+$/.test(current)) return true;
  return false;
}
