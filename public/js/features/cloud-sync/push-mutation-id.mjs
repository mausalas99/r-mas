import { CLOUD_BATCH_MUTATION_ID } from './constants.mjs';

/**
 * Worker dedupes by (room_id, client_mutation_id) forever — batch pushes need a unique wire id
 * while the outbox still coalesces on CLOUD_BATCH_MUTATION_ID locally.
 *
 * @param {{ clientMutationId?: string, enqueuedAt?: number }} entry
 */
export function resolveCloudPushMutationId(entry) {
  const base = String(entry?.clientMutationId || '').trim();
  if (base === CLOUD_BATCH_MUTATION_ID) {
    const stamp = Number(entry?.enqueuedAt) || Date.now();
    return `${base}:${stamp}`;
  }
  return base || `cloud-push:${Date.now()}`;
}
