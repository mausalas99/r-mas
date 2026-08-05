// public/js/features/cloud-sync/detach-lan-for-nube.mjs
async function detachLanLiveSyncForNube() {
  try {
    const { clearRoomMembership } = await import("/mobile/js/chunks/live-sync-membership-3KIVAEA5.js");
    clearRoomMembership();
  } catch {
  }
  try {
    const { clearActiveLiveSyncRoom, lanClient } = await import("/mobile/js/chunks/runtime-WQ4GQLZJ.js");
    clearActiveLiveSyncRoom();
    if (lanClient && typeof lanClient.disconnectLiveChannel === "function") {
      lanClient.disconnectLiveChannel();
    }
  } catch {
  }
}
export {
  detachLanLiveSyncForNube
};
//# sourceMappingURL=/js/chunks/detach-lan-for-nube-QAKQF2FB.js.map
