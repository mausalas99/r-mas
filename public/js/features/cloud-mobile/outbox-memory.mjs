/** @typedef {{ clientMutationId: string, ops: unknown[], baseRevision?: number, enqueuedAt: number }} OutboxEntry */

/**
 * In-memory mutation outbox. Same API as `createOutbox()` — dedupes by `clientMutationId`
 * (last enqueue wins). No localStorage persistence.
 */
export function createMemoryOutbox() {
  /** @type {OutboxEntry[]} */
  let rows = [];

  /** @param {{ clientMutationId: string, ops: unknown[], baseRevision?: number }} item */
  function enqueue(item) {
    const clientMutationId = String(item?.clientMutationId || '').trim();
    if (!clientMutationId) return;

    rows = rows.filter((row) => row.clientMutationId !== clientMutationId);
    rows.push({
      clientMutationId,
      ops: Array.isArray(item.ops) ? item.ops : [],
      ...(item.baseRevision != null ? { baseRevision: Number(item.baseRevision) } : {}),
      enqueuedAt: Date.now(),
    });
  }

  /** @returns {OutboxEntry[]} */
  function list() {
    return rows.slice();
  }

  /** @param {string} clientMutationId */
  function remove(clientMutationId) {
    const id = String(clientMutationId || '').trim();
    if (!id) return;
    rows = rows.filter((row) => row.clientMutationId !== id);
  }

  function clear() {
    rows = [];
  }

  return { enqueue, list, remove, clear };
}
