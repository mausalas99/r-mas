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
    const enqueuedAt =
      item.enqueuedAt != null && Number.isFinite(Number(item.enqueuedAt))
        ? Number(item.enqueuedAt)
        : Date.now();
    rows.push({
      clientMutationId,
      ops: Array.isArray(item.ops) ? item.ops : [],
      ...(item.baseRevision != null ? { baseRevision: Number(item.baseRevision) } : {}),
      enqueuedAt,
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

  /** @param {OutboxEntry[]} nextRows */
  function replaceAll(nextRows) {
    rows = Array.isArray(nextRows) ? nextRows.slice() : [];
  }

  return { enqueue, list, remove, clear, replaceAll };
}
