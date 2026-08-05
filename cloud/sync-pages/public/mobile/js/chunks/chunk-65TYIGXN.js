// public/js/features/cloud-mobile/outbox-memory.mjs
function createMemoryOutbox() {
  let rows = [];
  function enqueue(item) {
    const clientMutationId = String(item?.clientMutationId || "").trim();
    if (!clientMutationId) return;
    rows = rows.filter((row) => row.clientMutationId !== clientMutationId);
    rows.push({
      clientMutationId,
      ops: Array.isArray(item.ops) ? item.ops : [],
      ...item.baseRevision != null ? { baseRevision: Number(item.baseRevision) } : {},
      enqueuedAt: Date.now()
    });
  }
  function list() {
    return rows.slice();
  }
  function remove(clientMutationId) {
    const id = String(clientMutationId || "").trim();
    if (!id) return;
    rows = rows.filter((row) => row.clientMutationId !== id);
  }
  function clear() {
    rows = [];
  }
  return { enqueue, list, remove, clear };
}

export {
  createMemoryOutbox
};
//# sourceMappingURL=/js/chunks/chunk-65TYIGXN.js.map
