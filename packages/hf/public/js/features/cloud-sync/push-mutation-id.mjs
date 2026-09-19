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
