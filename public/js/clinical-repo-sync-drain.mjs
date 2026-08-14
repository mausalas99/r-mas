/**
 * Drain clinical_change_log projections into the cloud outbox (P2).
 */
import {
  canProjectClinicalChanges,
  markClinicalChangesSynced,
  projectUnsyncedClinicalChanges,
} from './clinical-repo-client.mjs';
import {
  enqueueCloudMutation,
  flushCloudSyncOutbox,
  isCloudMutateBridgeConfigured,
} from './features/cloud-sync/mutate-bridge.mjs';

/**
 * Collect unsynced change_log → enqueue outbox → mark synced_at → flush.
 * Pass `changeIds` to project only those rows (UI persist must not drain the
 * full backlog — persistSnapshot blobs freeze the renderer for seconds).
 * @param {{ actorId?: string, limit?: number, changeIds?: string[] }} [opts]
 */
export async function drainClinicalSyncProjector(opts = {}) {
  if (!canProjectClinicalChanges()) {
    return { ok: false, error: 'ipc_unavailable', projected: 0 };
  }
  if (!isCloudMutateBridgeConfigured()) {
    return { ok: false, error: 'bridge_inactive', projected: 0 };
  }

  const preview = await projectUnsyncedClinicalChanges({
    actorId: opts.actorId,
    limit: opts.limit,
    changeIds: opts.changeIds,
  });
  if (!preview.ok) {
    return { ok: false, error: preview.error || 'project_failed', projected: 0 };
  }

  const mutations = Array.isArray(preview.mutations) ? preview.mutations : [];
  const skipIds = Array.isArray(preview.skipIds) ? preview.skipIds : [];

  for (let i = 0; i < mutations.length; i += 1) {
    const item = mutations[i];
    enqueueCloudMutation(item.clientMutationId, item.ops);
  }

  const changeIds = [
    ...mutations.map((m) => m.clientMutationId),
    ...skipIds,
  ];
  if (changeIds.length) {
    const marked = await markClinicalChangesSynced({
      changeIds,
      syncedAt: new Date().toISOString(),
    });
    if (!marked.ok) {
      return {
        ok: false,
        error: marked.error || 'mark_failed',
        projected: mutations.length,
      };
    }
  }

  if (mutations.length) {
    await flushCloudSyncOutbox();
  }

  return { ok: true, projected: mutations.length, skipped: skipIds.length };
}
