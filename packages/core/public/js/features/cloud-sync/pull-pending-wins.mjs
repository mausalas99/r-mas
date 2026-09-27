/**
 * A pull must not overwrite a chart field this device still has a newer, unsent
 * write for in the outbox. Without this, a pull that lands between a save and its
 * push (a pull in flight, or the stale-retry pull inside a push) puts the room's
 * older value back on screen — and if the push re-collects from local state, the
 * edit is gone for good.
 *
 * Only whole-value fields with no merge of their own. `fields` merges per field
 * clock; monitoreo/eventualidades merge and re-push; labs never drop local sets.
 * An incoming value newer than the pending one still applies: the Worker will
 * reject our push as stale, so the room's value is the one that wins.
 */
const PENDING_WINS_FIELDS = ['note', 'indicaciones', 'medReceta', 'vpo', 'listadoProblemas', 'medPharmProfile'];
const ENTRY_FIELD_PATH = /^entries\/[^/]+\/([^/]+)$/;

/** @param {Array<{ ops?: unknown[] }>} outboxRows @returns {Map<string, string>} path → newest pending updatedAt */
function pendingAtByPath(outboxRows) {
  const out = new Map();
  for (const row of outboxRows || []) {
    for (const op of Array.isArray(row?.ops) ? row.ops : []) {
      const path = String(op?.path || '');
      const m = ENTRY_FIELD_PATH.exec(path);
      if (!m || !PENDING_WINS_FIELDS.includes(m[1])) continue;
      const at = String(op.updatedAt || '');
      if (at > (out.get(path) || '')) out.set(path, at);
    }
  }
  return out;
}

/**
 * Drop pulled values older than a pending local write, in place (ops and snapshot).
 * @param {{ ops?: unknown[], state?: { entries?: unknown[], entityVersions?: Record<string, { updatedAt?: string }> } } | null} result
 * @param {Array<{ ops?: unknown[] }>} outboxRows
 * @returns {number} values dropped
 */
export function dropPullValuesOlderThanPending(result, outboxRows) {
  const pending = pendingAtByPath(outboxRows);
  if (!pending.size || !result || typeof result !== 'object') return 0;
  const olderThanPending = (path, at) => pending.has(path) && String(at || '') < pending.get(path);
  let dropped = 0;
  if (Array.isArray(result.ops)) {
    const before = result.ops.length;
    result.ops = result.ops.filter((op) => !olderThanPending(String(op?.path || ''), op?.updatedAt));
    dropped = before - result.ops.length;
  }
  return dropped + dropSnapshotFieldsOlderThanPending(result.state, olderThanPending);
}

/**
 * @param {{ entries?: unknown[], entityVersions?: Record<string, { updatedAt?: string }> } | undefined} state
 * @param {(path: string, at: unknown) => boolean} olderThanPending
 */
function dropSnapshotFieldsOlderThanPending(state, olderThanPending) {
  let dropped = 0;
  const entries = Array.isArray(state?.entries) ? state.entries : [];
  const versions = state?.entityVersions || {};
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    for (const field of PENDING_WINS_FIELDS) {
      const path = `entries/${entry.id}/${field}`;
      // No version on record → keep today's behavior and apply it.
      if (!Object.hasOwn(entry, field) || !versions[path]) continue;
      if (!olderThanPending(path, versions[path].updatedAt)) continue;
      // Absent key = "not in this pull" for pull-apply (hasOwnProperty guards).
      delete entry[field];
      dropped += 1;
    }
  }
  return dropped;
}
