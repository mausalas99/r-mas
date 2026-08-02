import { SyncError } from './errors.js';
import {
  normalizeUsername,
  validatePassword,
  checkRateLimit,
  recordFailure,
  clearFailures,
} from './auth.js';
import { dbBlobToHex, userPayload, parseJsonBody } from './auth-util.js';
import { hashPassword } from './password.js';
import { hashRecoveryCode, verifyRecoveryCode, generateRecoveryCode } from './recovery-code.js';
import { createSession, userFromAuthHeader } from './session.js';

/** @param {string} username @param {string} ip */
function recoveryRateLimitKey(username, ip) {
  return `recover:${normalizeUsername(username)}|${ip}`;
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} userId */
export async function mintRecoveryForUser(db, userId) {
  const code = generateRecoveryCode();
  const { salt, hash } = await hashRecoveryCode(code);
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE users SET recovery_salt = ?, recovery_hash = ?, recovery_updated_at = ?, updated_at = ? WHERE id = ?`
    )
    .bind(salt, hash, now, now, userId)
    .run();
  return code;
}

/** @param {{ recovery_hash?: unknown } | null | undefined} row */
export function userNeedsRecoveryMint(row) {
  return !row?.recovery_hash;
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request @param {string} ip */
export async function handleRecover(db, request, ip) {
  const body = await parseJsonBody(request);
  const username = normalizeUsername(body?.username);
  const recoveryCode = body?.recoveryCode ?? '';
  const newPassword = body?.newPassword ?? '';

  if (!username || !recoveryCode || !newPassword) {
    throw new SyncError(
      'invalid_request',
      'Usuario, código de recuperación y contraseña nueva requeridos.'
    );
  }

  const rlKey = recoveryRateLimitKey(username, ip);
  checkRateLimit(rlKey);

  const row = await db
    .prepare(
      `SELECT id, username, display_name, password_salt, password_hash, recovery_salt, recovery_hash, disabled
       FROM users WHERE username = ? COLLATE NOCASE`
    )
    .bind(username)
    .first();

  const fail = () => {
    recordFailure(rlKey);
    throw new SyncError('invalid_credentials', 'Usuario o código incorrecto.');
  };

  if (!row || Number(row.disabled) !== 0 || !row.recovery_hash) {
    fail();
  }

  const recSaltHex = dbBlobToHex(row.recovery_salt);
  const recHashHex = dbBlobToHex(row.recovery_hash);
  const ok = await verifyRecoveryCode(recoveryCode, recSaltHex, recHashHex);
  if (!ok) {
    fail();
  }

  validatePassword(newPassword);

  const { salt, hash } = await hashPassword(newPassword);
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE users SET password_salt = ?, password_hash = ?, updated_at = ? WHERE id = ?`)
    .bind(salt, hash, now, row.id)
    .run();

  await db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(row.id).run();

  const newRecoveryCode = await mintRecoveryForUser(db, row.id);
  clearFailures(rlKey);

  const session = await createSession(db, row.id);
  return Response.json({
    ok: true,
    token: session.token,
    expiresAt: session.expiresAt,
    user: userPayload(row),
    recoveryCode: newRecoveryCode,
  });
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {Request} request */
export async function handleRegenerateRecovery(db, request) {
  const user = await userFromAuthHeader(db, request);
  if (!user) {
    throw new SyncError('auth_required', 'Sesión inválida o expirada.');
  }
  const recoveryCode = await mintRecoveryForUser(db, user.id);
  return Response.json({ ok: true, recoveryCode });
}
