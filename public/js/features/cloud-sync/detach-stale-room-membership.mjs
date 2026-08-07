/**
 * Drop stale LAN LiveSync session when Nube is authoritative.
 */
export async function detachLanLiveSyncForNube() {
  try {
    const { clearRoomMembership } = await import('../../cloud-room-membership.mjs');
    clearRoomMembership();
  } catch {
    /* optional */
  }
}
