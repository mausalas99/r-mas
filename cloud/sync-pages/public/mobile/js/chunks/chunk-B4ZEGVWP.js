import {
  createMemoryOutbox
} from "/mobile/js/chunks/chunk-RFW76HSI.js";
import {
  OUTBOX_STORAGE_KEY
} from "/mobile/js/chunks/chunk-CE75LS7G.js";
import {
  applyCloudPullResult,
  startCloudSyncRuntime
} from "/mobile/js/chunks/chunk-EQA33PSX.js";
import {
  configureCloudMutateBridge,
  pushCloudCensusNow,
  scheduleCloudSyncPush
} from "/mobile/js/chunks/chunk-FHX6BQST.js";
import {
  resolveClinicalClientId
} from "/mobile/js/chunks/chunk-QY3EXE2C.js";
import {
  getCloudSyncUrl
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-PJKQGVLW.js";

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
  if (!sharedOutbox) {
    try {
      localStorage.removeItem(OUTBOX_STORAGE_KEY);
    } catch {
    }
    sharedOutbox = createMemoryOutbox();
  }
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
    }
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
      await pushCloudCensusNow();
    } catch {
    }
    try {
      await sharedRuntime?.syncCycle();
    } catch {
    }
    try {
      const { syncCloudClinicalOpsOnConnect } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-3E432XUZ.js");
      await syncCloudClinicalOpsOnConnect();
    } catch {
    }
    try {
      const access = await import("/mobile/js/chunks/clinical-access-runtime-KAV32YSL.js");
      const pruned = access.prunePatientsOutsideClinicalScope?.() || 0;
      if (pruned > 0 && typeof access.refreshDesktopPatientListAfterScopePrune === "function") {
        await access.refreshDesktopPatientListAfterScopePrune();
      }
    } catch {
    }
  })();
  scheduleCloudSyncPush();
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
  startSharedNubeRuntime,
  stopSharedNubeRuntime,
  getSharedNubeRuntime,
  getSharedNubeOutbox,
  createNubeRuntime
};
//# sourceMappingURL=/js/chunks/chunk-B4ZEGVWP.js.map
