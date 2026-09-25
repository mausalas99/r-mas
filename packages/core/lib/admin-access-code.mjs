/**
 * Program-admin access code. Set and changed by the owner in the app;
 * stored only as a salted scrypt hash in app_meta. Main process only.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getAppMeta, setAppMeta } from './db/db-manager-app-meta.mjs';

const META_KEY = 'admin_access_code_hash';
export const ADMIN_CODE_MIN_LENGTH = 6;

function hashCode(code, salt = randomBytes(16)) {
  return `scrypt$${salt.toString('hex')}$${scryptSync(code, salt, 32).toString('hex')}`;
}

export function hasAdminAccessCode(db) {
  return !!getAppMeta(db, META_KEY);
}

/** @param {unknown} input */
export function verifyAdminAccessCode(db, input) {
  const code = String(input ?? '').trim();
  const [scheme, saltHex, hashHex] = String(getAppMeta(db, META_KEY) || '').split('$');
  if (!code || scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(code, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

/** First code: any user while no admin exists, else an existing admin. */
function canSetFirstCode(db, userId) {
  const anyAdmin = db.prepare('SELECT 1 FROM users WHERE is_program_admin = 1 LIMIT 1').get();
  if (!anyAdmin) return true;
  const row = db
    .prepare('SELECT is_program_admin FROM users WHERE user_id = ?')
    .get(String(userId || ''));
  return row?.is_program_admin === 1;
}

/** Changing an existing code always needs the current one. */
export function setAdminAccessCode(db, { userId, currentCode, newCode }) {
  const next = String(newCode ?? '').trim();
  if (next.length < ADMIN_CODE_MIN_LENGTH) {
    throw new Error(`El código debe tener al menos ${ADMIN_CODE_MIN_LENGTH} caracteres.`);
  }
  if (hasAdminAccessCode(db)) {
    if (!verifyAdminAccessCode(db, currentCode)) throw new Error('Código actual incorrecto.');
  } else if (!canSetFirstCode(db, userId)) {
    throw new Error('Solo un administrador puede crear el código.');
  }
  setAppMeta(db, META_KEY, hashCode(next));
}
