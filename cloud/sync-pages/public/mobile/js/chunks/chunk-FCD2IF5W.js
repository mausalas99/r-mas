import {
  createMemoryOutbox
} from "/mobile/js/chunks/chunk-65TYIGXN.js";
import {
  OUTBOX_STORAGE_KEY
} from "/mobile/js/chunks/chunk-GUZBLPYB.js";
import {
  applyCloudPullResult,
  startCloudSyncRuntime
} from "/mobile/js/chunks/chunk-RB43CK2I.js";
import {
  configureCloudMutateBridge,
  pushCloudCensusNow,
  scheduleCloudSyncPush
} from "/mobile/js/chunks/chunk-3WHKYJ7V.js";
import {
  getLanClientId
} from "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-TRTQ4CW2.js";

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
      return String(clinicalSessionContext.user?.user_id || getLanClientId() || "local");
    }
  });
  void import("/mobile/js/chunks/detach-lan-for-nube-QAKQF2FB.js").then(function(mod) {
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
      const { syncCloudClinicalOpsOnConnect } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-A7FFMSUY.js");
      await syncCloudClinicalOpsOnConnect();
    } catch {
    }
    try {
      const access = await import("/mobile/js/chunks/clinical-access-runtime-D63B6FH7.js");
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
//# sourceMappingURL=/js/chunks/chunk-FCD2IF5W.js.map
