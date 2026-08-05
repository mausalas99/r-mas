/**
 * Drop stale LAN LiveSync session when Nube is authoritative (avoids dual push/reconcile).
 * Kept until nothing re-attaches LAN for cloud salas (Phase 2 skips LAN boot; remove later).
 */
export async function detachLanLiveSyncForNube() {
  try {
    const { clearRoomMembership } = await import('../../live-sync-membership.mjs');
    clearRoomMembership();
  } catch {
    /* optional */
  }
  try {
    const { clearActiveLiveSyncRoom, lanClient } = await import('../lan/runtime.mjs');
    clearActiveLiveSyncRoom();
    if (lanClient && typeof lanClient.disconnectLiveChannel === 'function') {
      lanClient.disconnectLiveChannel();
    }
  } catch {
    /* optional */
  }
}
