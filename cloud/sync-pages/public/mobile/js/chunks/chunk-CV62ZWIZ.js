import {
  CLOUD_BATCH_MUTATION_ID
} from "/mobile/js/chunks/chunk-LYZOIXV3.js";

// public/js/features/cloud-sync/push-mutation-id.mjs
function resolveCloudPushMutationId(entry) {
  const base = String(entry?.clientMutationId || "").trim();
  if (base === CLOUD_BATCH_MUTATION_ID) {
    const stamp = Number(entry?.enqueuedAt) || Date.now();
    return `${base}:${stamp}`;
  }
  return base || `cloud-push:${Date.now()}`;
}

export {
  resolveCloudPushMutationId
};
//# sourceMappingURL=/js/chunks/chunk-CV62ZWIZ.js.map
