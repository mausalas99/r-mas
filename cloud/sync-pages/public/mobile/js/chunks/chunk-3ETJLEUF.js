// public/js/features/cloud-sync/push-mutation-id.mjs
function resolveCloudPushMutationId(entry) {
  const base = String(entry?.clientMutationId || "").trim();
  const stamp = Number(entry?.enqueuedAt) || Date.now();
  if (!base) return `cloud-push:${stamp}`;
  return `${base}:${stamp}`;
}

export {
  resolveCloudPushMutationId
};
//# sourceMappingURL=/js/chunks/chunk-3ETJLEUF.js.map
