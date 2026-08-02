import { SyncError } from './errors.js';

/** @param {unknown} val */
export function dbBlobToHex(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  const bytes = val instanceof ArrayBuffer ? new Uint8Array(val) : /** @type {Uint8Array} */ (val);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** @param {{ id: string, username: string, display_name: string }} row */
export function userPayload(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? '',
  };
}

/** @param {Request} request */
export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SyncError('invalid_request', 'JSON inválido.');
  }
}
