import {
  applyCloudPullResult,
  createMemoryOutbox,
  startCloudSyncRuntime
} from "/mobile/js/chunks/chunk-DABJ4IMO.js";
import {
  configureCloudMutateBridge,
  scheduleInitialCloudSeed,
  withTombstoneCoalesce
} from "/mobile/js/chunks/chunk-WJVW5GRE.js";
import {
  resolveClinicalClientId
} from "/mobile/js/chunks/chunk-7TJEM4JY.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";
import {
  getCloudSyncUrl
} from "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/cloud-sync/outbox.mjs
var OUTBOX_STORAGE_KEY = "rpc-cloud-sync-outbox";

// public/js/features/cloud-sync/client-id.mjs
function getCloudSyncClientId() {
  try {
    return String(resolveClinicalClientId() || "").trim() || "local";
  } catch {
    return "local";
  }
}

// public/js/features/cloud-sync/panel-conexion-runtime.mjs
var sharedOutbox = null;
var sharedRuntime = null;
function ensureSharedOutbox() {
  if (sharedOutbox) return sharedOutbox;
  try {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
  } catch {
  }
  sharedOutbox = withTombstoneCoalesce(createMemoryOutbox());
  return sharedOutbox;
}
function startSharedNubeRuntime(deps) {
  const roomId = deps.getCloudSyncRoomId();
  const token = deps.getCloudSyncToken();
  if (!roomId || !token) return null;
  const api = deps.getApi();
  if (!api || typeof api.pull !== "function" || typeof api.push !== "function") return null;
  if (sharedRuntime) {
    sharedRuntime.stop();
    sharedRuntime = null;
  }
  ensureSharedOutbox();
  const toast = typeof deps.toast === "function" ? deps.toast : function() {
  };
  sharedRuntime = startCloudSyncRuntime({
    api,
    outbox: sharedOutbox,
    getRoomId: deps.getCloudSyncRoomId,
    getRevision: deps.getCloudSyncRevision,
    setRevision: deps.setCloudSyncRevision,
    onStatus: deps.onStatus || function() {
    },
    applyPullResult: async function(result) {
      try {
        await applyCloudPullResult(result);
      } catch {
        toast("No se pudieron aplicar los cambios de la nube.", "error");
      }
    },
    liveRoomWs: {
      getBaseUrl: getCloudSyncUrl,
      getToken: deps.getCloudSyncToken
    },
    deferBootCycle: true
  });
  configureCloudMutateBridge({
    outbox: sharedOutbox,
    getRevision: deps.getCloudSyncRevision,
    noteEditing: function() {
      sharedRuntime?.noteLocalMutation?.();
    },
    // Same path as "Forzar sincronización": push outbox + pull peers (not push-only).
    flush: function() {
      sharedRuntime?.noteLocalMutation?.();
      return sharedRuntime?.syncCycle();
    },
    getActorId: function() {
      return String(clinicalSessionContext.user?.user_id || getCloudSyncClientId() || "local");
    }
  });
  void import("/mobile/js/chunks/cloud-mobile-lan-strip-ZXR3OTYP.js").then(function(mod) {
    return mod.detachLanLiveSyncForNube();
  });
  void (async function runInitialCloudSyncAndPrune() {
    try {
      await sharedRuntime?.syncCycle();
    } catch {
    }
    try {
      await scheduleInitialCloudSeed();
    } catch {
    }
    try {
      await new Promise(function(resolve) {
        setTimeout(resolve, 4e3);
      });
      const { syncCloudClinicalOpsOnConnect } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-SWM445J2.js");
      await syncCloudClinicalOpsOnConnect();
    } catch {
    }
    try {
      const access = await import("/mobile/js/chunks/clinical-access-runtime-7PNW7XFE.js");
      const pruned = access.prunePatientsOutsideClinicalScope?.() || 0;
      if (pruned > 0 && typeof access.refreshDesktopPatientListAfterScopePrune === "function") {
        await access.refreshDesktopPatientListAfterScopePrune();
      }
    } catch {
    }
  })();
  return sharedRuntime;
}
function stopSharedNubeRuntime() {
  if (sharedRuntime) {
    sharedRuntime.stop();
    sharedRuntime = null;
  }
}
function getSharedNubeRuntime() {
  return sharedRuntime;
}
function getSharedNubeOutbox() {
  return sharedOutbox;
}
function createNubeRuntime(deps) {
  function stopRuntime() {
    stopSharedNubeRuntime();
  }
  function startRuntime() {
    startSharedNubeRuntime(deps);
  }
  return { startRuntime, stopRuntime };
}

export {
  OUTBOX_STORAGE_KEY,
  getCloudSyncClientId,
  startSharedNubeRuntime,
  stopSharedNubeRuntime,
  getSharedNubeRuntime,
  getSharedNubeOutbox,
  createNubeRuntime
};
//# sourceMappingURL=/js/chunks/chunk-PZSHDWKY.js.map
