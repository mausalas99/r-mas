import {
  setCloudRoomConnected
} from "/mobile/js/chunks/chunk-ZWVJD7AP.js";
import {
  isCloudSala,
  normalizeCloudSala
} from "/mobile/js/chunks/chunk-AETSFPDT.js";

// public/js/features/cloud-sync/ensure-turn-room.mjs
function applyEnsureTurnSuccess(deps, room) {
  if (typeof deps.setCloudSyncRoomSnapshot === "function") {
    deps.setCloudSyncRoomSnapshot(room);
  } else {
    deps.setCloudSyncRoomId(String(room.id));
    deps.setCloudSyncRevision(Number(room.revision) || 0);
  }
  setCloudRoomConnected(true);
  deps.onConnected?.(room);
  deps.startSyncRuntime?.();
  deps.toast?.("Sala nube lista", "success");
}
async function ensureTurnRoom(deps) {
  const sala = normalizeCloudSala(deps.getSala());
  if (!isCloudSala(sala)) return null;
  if (!deps.getToken()) return null;
  try {
    const data = await deps.api.ensureTurn({ sala });
    const room = data?.room;
    if (!room?.id) throw new Error("Respuesta inv\xE1lida del servidor.");
    applyEnsureTurnSuccess(deps, room);
    return room;
  } catch (err) {
    deps.toast?.(
      err?.data?.message || err?.message || "No se pudo preparar la sala nube.",
      "error"
    );
    return null;
  }
}
async function ensureTurnRoomAfterTeamJoin(toast) {
  const [settings, { createCloudSyncApi }] = await Promise.all([
    import("/mobile/js/chunks/settings-TWTQ6DDF.js"),
    import("/mobile/js/chunks/api-client-OD2WW23Z.js")
  ]);
  const api = createCloudSyncApi({
    getBaseUrl: settings.getCloudSyncUrl,
    getToken: settings.getCloudSyncToken
  });
  const { getUserSala } = await import("/mobile/js/chunks/panel-clinical-context-5C27EM4D.js");
  return ensureTurnRoom({
    api,
    getSala: getUserSala,
    getToken: settings.getCloudSyncToken,
    setCloudSyncRoomId: settings.setCloudSyncRoomId,
    setCloudSyncRoomSnapshot: settings.setCloudSyncRoomSnapshot,
    setCloudSyncRevision: settings.setCloudSyncRevision,
    toast
  });
}

export {
  ensureTurnRoom,
  ensureTurnRoomAfterTeamJoin
};
//# sourceMappingURL=/js/chunks/chunk-L4O3KENZ.js.map
