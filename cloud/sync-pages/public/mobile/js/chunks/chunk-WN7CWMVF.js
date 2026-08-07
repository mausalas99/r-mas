import {
  createMemoryOutbox
} from "/mobile/js/chunks/chunk-RFW76HSI.js";
import {
  OUTBOX_STORAGE_KEY
} from "/mobile/js/chunks/chunk-CE75LS7G.js";
import {
  applyCloudPullResult,
  startCloudSyncRuntime
} from "/mobile/js/chunks/chunk-YLVR4STO.js";
import {
  configureCloudMutateBridge,
  pushCloudCensusNow,
  scheduleCloudSyncPush
} from "/mobile/js/chunks/chunk-3NNHG3MC.js";
import {
  resolveClinicalClientId
} from "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-NMJNQQZG.js";

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
  if (!roomId || !deps.getCloudSyncToken()) return null;
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
    api: deps.getApi(),
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
    }
  });
  configureCloudMutateBridge({
    outbox: sharedOutbox,
    getRevision: deps.getCloudSyncRevision,
    // Same path as "Forzar sincronización": push outbox + pull peers (not push-only).
    flush: function() {
      if (typeof sharedRuntime?.noteLocalMutation === "function") {
        sharedRuntime.noteLocalMutation();
      }
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
      const { syncCloudClinicalOpsOnConnect } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-756KA6DY.js");
      await syncCloudClinicalOpsOnConnect();
    } catch {
    }
    try {
      const access = await import("/mobile/js/chunks/clinical-access-runtime-KABKCTTJ.js");
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
//# sourceMappingURL=/js/chunks/chunk-WN7CWMVF.js.map
