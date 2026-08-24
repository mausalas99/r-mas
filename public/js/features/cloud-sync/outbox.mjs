import { notifyCloudOutboxChanged } from './cloud-outbox-events.mjs';

export const OUTBOX_STORAGE_KEY = 'rpc-cloud-sync-outbox';
export { CLOUD_OUTBOX_CHANGED_EVENT, notifyCloudOutboxChanged } from './cloud-outbox-events.mjs';

/** @typedef {{ clientMutationId: string, ops: unknown[], baseRevision?: number, enqueuedAt: number }} OutboxEntry */

/**
 * Merge two op lists by `path` — ops in `newOps` win per path, but a path present
 * only in `oldOps` is kept. A re-enqueue that (e.g. because the census snapshot
 * momentarily couldn't build a signed field) has fewer paths than the batch
 * already queued must not erase the paths it doesn't mention.
 * @param {unknown[]} oldOps
 * @param {unknown[]} newOps
 * @returns {unknown[]}
 */
function mergeOpsByPath(oldOps, newOps) {
  const merged = new Map();
  for (const op of Array.isArray(oldOps) ? oldOps : []) {
    if (op && typeof op === 'object' && 'path' in op) merged.set(op.path, op);
  }
  for (const op of Array.isArray(newOps) ? newOps : []) {
    if (op && typeof op === 'object' && 'path' in op) merged.set(op.path, op);
  }
  return Array.from(merged.values());
}

/**
 * Persistent mutation outbox. Dedupes by `clientMutationId` — ops are merged by
 * `path` for the same id (rapid re-edits collapse to the latest value per path,
 * without a smaller re-enqueue dropping paths a fuller pending batch already had).
 *
 * @param {{ load?: () => OutboxEntry[], save?: (rows: OutboxEntry[]) => void }} [deps]
 */
export function createOutbox(deps = {}) {
  const load =
    deps.load ??
    (() => {
      try {
        const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    });

  const persist =
    deps.save ??
    ((rows) => {
      try {
        localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(rows));
      } catch (err) {
        if (err && /** @type {{ name?: string }} */ (err).name === 'QuotaExceededError') {
          try {
            localStorage.removeItem(OUTBOX_STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }
        throw err;
      }
    });

  /** @param {OutboxEntry[]} rows */
  function save(rows) {
    persist(rows);
    notifyCloudOutboxChanged();
  }

  /** @param {{ clientMutationId: string, ops: unknown[], baseRevision?: number }} item */
  function enqueue(item) {
    const clientMutationId = String(item?.clientMutationId || '').trim();
    if (!clientMutationId) return;

    const rows = load();
    const existing = rows.find((row) => row.clientMutationId === clientMutationId);
    const rest = rows.filter((row) => row.clientMutationId !== clientMutationId);
    const enqueuedAt =
      item.enqueuedAt != null && Number.isFinite(Number(item.enqueuedAt))
        ? Number(item.enqueuedAt)
        : Date.now();
    const incomingOps = Array.isArray(item.ops) ? item.ops : [];
    rest.push({
      clientMutationId,
      ops: existing ? mergeOpsByPath(existing.ops, incomingOps) : incomingOps,
      ...(item.baseRevision != null ? { baseRevision: Number(item.baseRevision) } : {}),
      enqueuedAt,
    });
    save(rest);
  }

  /** @returns {OutboxEntry[]} */
  function list() {
    return load().slice();
  }

  /** @param {string} clientMutationId */
  function remove(clientMutationId) {
    const id = String(clientMutationId || '').trim();
    if (!id) return;
    save(load().filter((row) => row.clientMutationId !== id));
  }

  function clear() {
    save([]);
  }

  /** @param {OutboxEntry[]} nextRows */
  function replaceAll(nextRows) {
    save(Array.isArray(nextRows) ? nextRows.slice() : []);
  }

  return { enqueue, list, remove, clear, replaceAll };
}
