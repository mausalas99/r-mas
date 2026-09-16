/**
 * Worker dedupes by (room_id, client_mutation_id) forever. Local outbox coalesces on the
 * bare `clientMutationId` (last enqueue wins); the wire id must include `enqueuedAt` so
 * re-edits of clinicalOps / todos / agenda / census actually commit a new mutation.
 *
 * @param {{ clientMutationId?: string, enqueuedAt?: number }} entry
 */
export function resolveCloudPushMutationId(entry) {
  const base = String(entry?.clientMutationId || '').trim();
  const stamp = Number(entry?.enqueuedAt) || Date.now();
  if (!base) return `cloud-push:${stamp}`;
  return `${base}:${stamp}`;
}

let wireIdNonce = 0;

/**
 * Suffix for a per-attempt wire id (`...:a{attempt}:{this}`). `Date.now()` alone repeats
 * within the same millisecond across two close-together drains (e.g. a failed cycle
 * retried right after), which would make the retry collide with the Worker's cached
 * response for the failed attempt. This counter guarantees every call gets a distinct
 * value even at identical Date.now(), so a retry is always seen as a new mutation.
 */
export function nextWireIdStamp() {
  wireIdNonce = (wireIdNonce + 1) % 1_000_000;
  return `${Date.now()}-${wireIdNonce}`;
}
