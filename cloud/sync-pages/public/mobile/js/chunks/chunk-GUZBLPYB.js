// public/js/features/cloud-sync/outbox.mjs
var OUTBOX_STORAGE_KEY = "rpc-cloud-sync-outbox";
function createOutbox(deps = {}) {
  const load = deps.load ?? (() => {
    try {
      const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const save = deps.save ?? ((rows) => {
    try {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(rows));
    } catch (err) {
      if (err && /** @type {{ name?: string }} */
      err.name === "QuotaExceededError") {
        try {
          localStorage.removeItem(OUTBOX_STORAGE_KEY);
        } catch {
        }
      }
      throw err;
    }
  });
  function enqueue(item) {
    const clientMutationId = String(item?.clientMutationId || "").trim();
    if (!clientMutationId) return;
    const rows = load().filter((row) => row.clientMutationId !== clientMutationId);
    rows.push({
      clientMutationId,
      ops: Array.isArray(item.ops) ? item.ops : [],
      ...item.baseRevision != null ? { baseRevision: Number(item.baseRevision) } : {},
      enqueuedAt: Date.now()
    });
    save(rows);
  }
  function list() {
    return load().slice();
  }
  function remove(clientMutationId) {
    const id = String(clientMutationId || "").trim();
    if (!id) return;
    save(load().filter((row) => row.clientMutationId !== id));
  }
  function clear() {
    save([]);
  }
  return { enqueue, list, remove, clear };
}

export {
  OUTBOX_STORAGE_KEY,
  createOutbox
};
//# sourceMappingURL=/js/chunks/chunk-GUZBLPYB.js.map
