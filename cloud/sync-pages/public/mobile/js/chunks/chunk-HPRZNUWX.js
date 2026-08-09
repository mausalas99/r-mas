import {
  applyCloudPullResult,
  createMemoryOutbox,
  startCloudSyncRuntime,
  stopCloudSyncRuntime
} from "/mobile/js/chunks/chunk-JHCY7JRY.js";
import {
  configureCloudMutateBridge
} from "/mobile/js/chunks/chunk-QJ4AKPQ5.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-KYGE5G3V.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-QHIEC6QJ.js";
import {
  getCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRevision
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";

// public/js/features/cloud-mobile/mutation-gate.mjs
var ALLOWED = [
  /^entries\/[^/]+\/monitoreo$/,
  /^entries\/[^/]+\/estadoActual$/,
  /^entries\/[^/]+\/note$/,
  /^entries\/[^/]+\/indicaciones$/,
  /^todos\/[^/]+$/
];
function isAllowedCloudMobilePath(path) {
  const p = String(path || "").trim();
  if (!p) return false;
  return ALLOWED.some((re) => re.test(p));
}
function filterOpsForCloudMobile(ops) {
  if (!Array.isArray(ops)) return [];
  return ops.filter((op) => {
    if (!op || typeof op !== "object") return false;
    const row = op;
    return isAllowedCloudMobilePath(String(row.path || ""));
  });
}

// public/js/features/cloud-mobile/runtime.mjs
var _runtime = null;
async function refreshCloudMobileCensusUi() {
  try {
    const access = await import("/mobile/js/chunks/clinical-access-runtime-YYVZUHX5.js");
    if (typeof access.finalizeMobileLanPatientCensus === "function") {
      await access.finalizeMobileLanPatientCensus();
    }
  } catch {
  }
}
function startCloudMobileRuntime({ onStatus, toast }) {
  stopCloudMobileRuntime();
  const roomId = getCloudSyncRoomId();
  const token = getCloudSyncToken();
  if (!roomId || !token) return null;
  const api = createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken
  });
  const outbox = createMemoryOutbox();
  const wrappedOutbox = {
    enqueue(item) {
      const ops = filterOpsForCloudMobile(item?.ops || []);
      if (!ops.length) return;
      outbox.enqueue({ ...item, ops });
    },
    list: outbox.list,
    remove: outbox.remove,
    clear: outbox.clear
  };
  const runtime = startCloudSyncRuntime({
    api,
    outbox: wrappedOutbox,
    getRoomId: getCloudSyncRoomId,
    getRevision: getCloudSyncRevision,
    setRevision: setCloudSyncRevision,
    onStatus,
    pollMobile: true,
    applyPullResult: async (result) => {
      try {
        await applyCloudPullResult(result);
        await refreshCloudMobileCensusUi();
        try {
          const { showCloudMobileEmptyCensusBanner } = await import("/mobile/js/chunks/resolve-active-room-XEAS2W2L.js");
          showCloudMobileEmptyCensusBanner();
          const patientsMod = await import("/mobile/js/chunks/patients-B236M2LH.js");
          patientsMod.renderPatientList();
          const { refreshMobileLabReferencePanel } = await import("/mobile/js/chunks/mobile-web-HAFF4AEM.js");
          refreshMobileLabReferencePanel();
        } catch {
        }
      } catch {
        toast?.("No se pudieron aplicar los cambios de la nube.", "error");
      }
    },
    liveRoomWs: {
      getBaseUrl: getCloudSyncUrl,
      getToken: getCloudSyncToken
    }
  });
  configureCloudMutateBridge({
    outbox: wrappedOutbox,
    getRevision: getCloudSyncRevision,
    noteEditing: () => runtime?.noteLocalMutation?.(),
    flush: () => {
      runtime?.noteLocalMutation?.();
      return runtime?.syncCycle();
    },
    getActorId: () => String(
      clinicalSessionContext.user?.user_id || clinicalSessionContext.user?.username || "mobile"
    )
  });
  void runtime.syncCycle();
  _runtime = runtime;
  return runtime;
}
function stopCloudMobileRuntime() {
  stopCloudSyncRuntime();
  _runtime = null;
}
function getCloudMobileRuntime() {
  return _runtime;
}

export {
  startCloudMobileRuntime,
  stopCloudMobileRuntime,
  getCloudMobileRuntime
};
//# sourceMappingURL=/js/chunks/chunk-HPRZNUWX.js.map
