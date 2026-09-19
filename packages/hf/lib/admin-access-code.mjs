import crypto from 'node:crypto';
import { getAppMeta, setAppMeta } from './db/db-manager-app-meta.mjs';

const ADMIN_ACCESS_CODE_META_KEY = 'admin_access_code_hash';

/** Seed value used only the first time a database has no stored code yet. */
export const DEFAULT_ADMIN_ACCESS_CODE = 'Msg170699';

function hashAdminAccessCode(code) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(code), salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function matchesHash(code, stored) {
  const [saltHex, hashHex] = String(stored || '').split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(code), salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function getOrSeedAdminAccessCodeHash(db) {
  const existing = getAppMeta(db, ADMIN_ACCESS_CODE_META_KEY);
  if (existing) return existing;
  const seeded = hashAdminAccessCode(DEFAULT_ADMIN_ACCESS_CODE);
  setAppMeta(db, ADMIN_ACCESS_CODE_META_KEY, seeded);
  return seeded;
}

/**
 * Código personal para activar privilegios de administración del programa.
 * Almacenado (hasheado) en app_meta, local a esta base de datos — no hardcodeado.
 * @param {import('better-sqlite3').Database} db
 * @param {unknown} input
 */
export function verifyAdminAccessCode(db, input) {
  const code = String(input ?? '').trim();
  if (!code) return false;
  return matchesHash(code, getOrSeedAdminAccessCodeHash(db));
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {unknown} currentCode
 * @param {unknown} newCode
 */
export function setAdminAccessCode(db, currentCode, newCode) {
  if (!verifyAdminAccessCode(db, currentCode)) {
    throw new Error('Código de administración actual incorrecto.');
  }
  const next = String(newCode ?? '').trim();
  if (next.length < 6) {
    throw new Error('El nuevo código debe tener al menos 6 caracteres.');
  }
  setAppMeta(db, ADMIN_ACCESS_CODE_META_KEY, hashAdminAccessCode(next));
}
