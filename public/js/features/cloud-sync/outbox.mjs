/** @typedef {{ clientMutationId: string, ops: unknown[], baseRevision?: number, enqueuedAt: number }} OutboxEntry */

export const OUTBOX_STORAGE_KEY = 'rpc-cloud-sync-outbox';

/**
 * Persistent mutation outbox. Dedupes by `clientMutationId` — **last enqueue wins**
 * for the same id (rapid re-edits collapse to the latest ops payload).
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

  const save =
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

  /** @param {{ clientMutationId: string, ops: unknown[], baseRevision?: number }} item */
  function enqueue(item) {
    const clientMutationId = String(item?.clientMutationId || '').trim();
    if (!clientMutationId) return;

    const rows = load().filter((row) => row.clientMutationId !== clientMutationId);
    rows.push({
      clientMutationId,
      ops: Array.isArray(item.ops) ? item.ops : [],
      ...(item.baseRevision != null ? { baseRevision: Number(item.baseRevision) } : {}),
      enqueuedAt: Date.now(),
    });
    save(rows);
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

  return { enqueue, list, remove, clear };
}
