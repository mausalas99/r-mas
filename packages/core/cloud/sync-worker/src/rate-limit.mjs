import { SyncError } from './errors.js';

export const RATE_LIMIT_MAX = 10;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** @type {Map<string, { count: number, resetAt: number }>} */
const failureCounts = new Map();

/** @param {string} key */
export function checkRateLimit(key) {
  const now = Date.now();
  const entry = failureCounts.get(key);
  if (!entry || now >= entry.resetAt) {
    failureCounts.delete(key);
    return;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    throw new SyncError('invalid_credentials', 'Demasiados intentos. Espera unos minutos.');
  }
}

/** @param {string} key */
export function recordFailure(key) {
  const now = Date.now();
  const entry = failureCounts.get(key);
  if (!entry || now >= entry.resetAt) {
    failureCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

/** @param {string} key */
export function clearFailures(key) {
  failureCounts.delete(key);
}

/** @param {Request} request */
export function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/** @param {string} ip @param {string} [username] */
export function rateLimitKey(ip, username) {
  const user = String(username || '').trim().toLowerCase();
  const addr = String(ip || 'unknown');
  return user ? `${user}|${addr}` : `ip|${addr}`;
}
