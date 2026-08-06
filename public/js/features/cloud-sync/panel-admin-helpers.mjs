
/** Session-only admin key for bootstrap (not persisted). */
let sessionAdminKey = '';

export function getSessionAdminKey() {
  return sessionAdminKey;
}

export function setSessionAdminKey(key) {
  sessionAdminKey = String(key || '').trim();
}
import { esc } from '../../dom-escape.mjs';

export const ROLE_LABELS = {
  member: 'Miembro',
  admin: 'Admin',
  program_admin: 'Admin programa',
};

/** @param {string} role */
export function fmtRole(role) {
  return ROLE_LABELS[role] || role || '—';
}

/** @param {string} message */
export function confirmAction(message) {
  return window.confirm(message);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Array<{ label: string, key?: string, cell?: (row: Record<string, unknown>) => string }>} cols
 * @param {{ emptyHtml?: string }} [opts]
 */
export function adminTableHtml(rows, cols, opts = {}) {
  if (!rows.length) {
    return (
      opts.emptyHtml ||
      '<p class="cloud-sync-hint">Sin registros.</p>'
    );
  }
  const head = cols.map((c) => '<th>' + esc(c.label) + '</th>').join('');
  const body = rows
    .map((row) => {
      const tds = cols
        .map((c) => '<td>' + (c.cell ? c.cell(row) : esc(String(row[c.key] ?? ''))) + '</td>')
        .join('');
      return '<tr>' + tds + '</tr>';
    })
    .join('');
  return (
    '<div class="cloud-sync-admin-table-wrap"><table class="cloud-sync-admin-table">' +
    '<thead><tr>' +
    head +
    '</tr></thead><tbody>' +
    body +
    '</tbody></table></div>'
  );
}

/** @param {string} value */
export function normalizeUsernameConfirm(value) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}
