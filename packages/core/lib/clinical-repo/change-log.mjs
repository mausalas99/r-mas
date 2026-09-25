import { randomUUID } from 'node:crypto';

/** @param {string} registro */
export function registroBlobKey(registro) {
  const r = String(registro || '').trim();
  return r ? `__reg:${r}` : '';
}

/** @param {unknown} raw */
export function parseBlobKeysAndRegistro(raw) {
  /** @type {string[]} */
  let keys = [];
  if (Array.isArray(raw)) {
    keys = raw.map((k) => String(k || '').trim()).filter(Boolean);
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        keys = parsed.map((k) => String(k || '').trim()).filter(Boolean);
      }
    } catch {
      /* ignore */
    }
  }
  let registro = '';
  /** @type {string[]} */
  const blobKeys = [];
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i];
    if (k.startsWith('__reg:')) {
      registro = k.slice('__reg:'.length);
      continue;
    }
    blobKeys.push(k);
  }
  return { blobKeys, registro };
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{
 *   commandType: string,
 *   blobKeys: string[],
 *   patientId?: string | null,
 *   actorId?: string | null,
 *   origin?: string | null,
 *   registro?: string | null,
 * }} row
 * @returns {string} change_id
 */
export function appendClinicalChangeLog(db, row) {
  const changeId = 'chg_' + randomUUID().replace(/-/g, '');
  const createdAt = new Date().toISOString();
  const origin = row.origin != null && String(row.origin).trim() ? String(row.origin).trim() : 'ui';
  const blobKeys = Array.isArray(row.blobKeys) ? [...row.blobKeys] : [];
  const regKey = registroBlobKey(row.registro);
  if (regKey) blobKeys.push(regKey);
  db.prepare(
    `INSERT INTO clinical_change_log
      (change_id, command_type, blob_keys, patient_id, actor_id, origin, created_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`
  ).run(
    changeId,
    String(row.commandType || ''),
    JSON.stringify(blobKeys),
    row.patientId != null ? String(row.patientId) : null,
    row.actorId != null ? String(row.actorId) : null,
    origin,
    createdAt
  );
  return changeId;
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeChangeIds(raw) {
  if (!Array.isArray(raw)) return [];
  /** @type {string[]} */
  const out = [];
  for (let i = 0; i < raw.length; i += 1) {
    const id = String(raw[i] || '').trim();
    if (id) out.push(id);
  }
  return out;
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ limit?: number, changeIds?: string[] } | number} [opts]
 */
export function listUnsyncedClinicalChanges(db, opts = 100) {
  const parsed = opts && typeof opts === 'object' ? opts : { limit: opts };
  const changeIds = normalizeChangeIds(parsed.changeIds);
  const select = `SELECT change_id, command_type, blob_keys, patient_id, actor_id, origin, created_at
       FROM clinical_change_log
       WHERE synced_at IS NULL`;
  if (changeIds.length) {
    const placeholders = changeIds.map(() => '?').join(',');
    return db
      .prepare(`${select} AND change_id IN (${placeholders}) ORDER BY id ASC`)
      .all(...changeIds);
  }
  const lim = Math.max(1, Math.min(500, Number(parsed.limit) || 100));
  return db.prepare(`${select} ORDER BY id ASC LIMIT ?`).all(lim);
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string[]} changeIds
 * @param {string} syncedAt
 */
export function markClinicalChangesSynced(db, changeIds, syncedAt) {
  const ids = (Array.isArray(changeIds) ? changeIds : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean);
  if (!ids.length) return 0;
  const stmt = db.prepare(
    `UPDATE clinical_change_log SET synced_at = ? WHERE change_id = ? AND synced_at IS NULL`
  );
  const run = db.transaction(() => {
    let n = 0;
    for (const id of ids) {
      const info = stmt.run(syncedAt, id);
      n += info.changes;
    }
    return n;
  });
  return run();
}
