import {
  createMemoryOutbox
} from "/mobile/js/chunks/chunk-65TYIGXN.js";
import {
  OUTBOX_STORAGE_KEY
} from "/mobile/js/chunks/chunk-GUZBLPYB.js";
import {
  applyCloudPullResult,
  startCloudSyncRuntime
} from "/mobile/js/chunks/chunk-HQZG5N6A.js";
import {
  configureCloudMutateBridge,
  pushCloudCensusNow,
  scheduleCloudSyncPush
} from "/mobile/js/chunks/chunk-GGQQKZC2.js";
import {
  getLanClientId
} from "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-TSLGFHIE.js";

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
    flush: function() {
      return sharedRuntime?.flushOutbox();
    },
    getActorId: function() {
      return String(clinicalSessionContext.user?.user_id || getLanClientId() || "local");
    }
  });
  void (async function runInitialCloudSyncAndPrune() {
    try {
      await sharedRuntime?.syncCycle();
    } catch {
    }
    try {
      const access = await import("/mobile/js/chunks/clinical-access-runtime-AH4HT4U3.js");
      const pruned = access.prunePatientsOutsideClinicalScope?.() || 0;
      if (pruned > 0 && typeof access.refreshDesktopPatientListAfterScopePrune === "function") {
        await access.refreshDesktopPatientListAfterScopePrune();
      }
    } catch {
    }
  })();
  scheduleCloudSyncPush();
  void pushCloudCensusNow();
  return sharedRuntime;
}
function stopSharedNubeRuntime() {
  if (sharedRuntime) {
    sharedRuntime.stop();
    sharedRuntime = null;
  }
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
  createNubeRuntime
};
//# sourceMappingURL=/js/chunks/chunk-6WGKVNXP.js.map
