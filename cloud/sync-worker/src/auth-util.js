import { SyncError } from './errors.js';

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/i;
const MIN_PASSWORD_LEN = 10;

/** @param {string} u */
export function normalizeUsername(u) {
  return String(u ?? '').trim().toLowerCase();
}

/** @param {string} username */
export function validateUsername(username) {
  if (!USERNAME_RE.test(username)) {
    throw new SyncError(
      'invalid_request',
      'Usuario inválido: 3–32 caracteres, letras, números, . _ -'
    );
  }
}

/** @param {string} password */
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LEN) {
    throw new SyncError('invalid_request', `Contraseña debe tener al menos ${MIN_PASSWORD_LEN} caracteres.`);
  }
}

/**
 * Nube's own version floor — separate from the app-wide min-version.json gate,
 * which blocks the whole app for everyone. This one only blocks login/register,
 * so a doctor not using Nube isn't forced to update. Bump this alongside any
 * future change to the room-key/DEK format, same as this 8.2.0 room-code switch.
 */
export const MIN_NUBE_APP_VERSION = '8.2.0';

/** @param {unknown} v */
export function sanitizeAppVersion(v) {
  return String(v ?? '').trim().slice(0, 32);
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} -1/0/1, or 0 if either isn't parseable (never blocks on unknown strings)
 */
export function compareSemver(a, b) {
  const parse = (v) => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v ?? '').trim());
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

/**
 * Throws if the client's reported app version is missing or below
 * MIN_NUBE_APP_VERSION. A missing appVersion means a pre-8.2.0 build (older
 * clients never send this field), so absence is treated as "too old", not
 * "unknown" — same block as an explicit old version number.
 * @param {unknown} appVersion
 */
export function assertNubeAppVersion(appVersion) {
  const v = sanitizeAppVersion(appVersion);
  if (v && compareSemver(v, MIN_NUBE_APP_VERSION) >= 0) return;
  throw new SyncError(
    'update_required',
    `Actualiza R+ a la versión ${MIN_NUBE_APP_VERSION} o más reciente para usar Nube.`
  );
}

/** @param {unknown} val */
export function dbBlobToHex(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  const bytes = val instanceof ArrayBuffer ? new Uint8Array(val) : /** @type {Uint8Array} */ (val);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** @param {{ id: string, username: string, display_name: string, active_room_id?: string|null }} row */
export function userPayload(row) {
  const payload = {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? '',
  };
  const activeRoomId = String(row.active_room_id || '').trim();
  if (activeRoomId) payload.activeRoomId = activeRoomId;
  return payload;
}

/** @param {Request} request */
export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SyncError('invalid_request', 'JSON inválido.');
  }
}
