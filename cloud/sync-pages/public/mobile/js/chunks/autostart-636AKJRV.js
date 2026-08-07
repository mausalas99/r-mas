import {
  startSharedNubeRuntime
} from "/mobile/js/chunks/chunk-YOJUD73P.js";
import "/mobile/js/chunks/chunk-RFW76HSI.js";
import {
  OUTBOX_STORAGE_KEY
} from "/mobile/js/chunks/chunk-CE75LS7G.js";
import "/mobile/js/chunks/chunk-S6K5O6BP.js";
import "/mobile/js/chunks/chunk-TBKNEONY.js";
import "/mobile/js/chunks/chunk-OXMUDSQA.js";
import "/mobile/js/chunks/chunk-BP4QC5UJ.js";
import "/mobile/js/chunks/chunk-2ZXFDPTM.js";
import "/mobile/js/chunks/chunk-3ETJLEUF.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-QQOJTZU6.js";
import "/mobile/js/chunks/chunk-N74FWNUD.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-LTZPVWLE.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-PEG2E4FB.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-IVOJHSUB.js";
import {
  pushCloudCensusNow
} from "/mobile/js/chunks/chunk-GTJXSHII.js";
import "/mobile/js/chunks/chunk-KPMBH6IG.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-LUBBZBEB.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-RU5G223P.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import "/mobile/js/chunks/chunk-B4Q7USSM.js";
import {
  setCloudRoomConnected
} from "/mobile/js/chunks/chunk-T2MO3KS5.js";
import {
  isCloudSala
} from "/mobile/js/chunks/chunk-N2POLXHZ.js";
import {
  getCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRevision,
  setCloudSyncRoomId,
  setCloudSyncRoomSnapshot
} from "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-MGEK6PHD.js";
import "/mobile/js/chunks/chunk-GRJDNRYE.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-FORXNEKH.js";

// public/js/features/cloud-sync/autostart.mjs
function canAutostartCloudSync() {
  if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) return false;
  return !!getCloudSyncToken();
}
async function autostartCloudSyncIfConfigured(opts) {
  if (!canAutostartCloudSync()) return null;
  const { getUserSala } = await import("/mobile/js/chunks/panel-clinical-context-G57A6L42.js");
  if (!isCloudSala(getUserSala())) return null;
  try {
    localStorage.removeItem(OUTBOX_STORAGE_KEY);
  } catch {
  }
  const toast = typeof opts?.toast === "function" ? opts.toast : function() {
  };
  const api = createCloudSyncApi({
    getBaseUrl: getCloudSyncUrl,
    getToken: getCloudSyncToken
  });
  const { ensureTurnRoom } = await import("/mobile/js/chunks/ensure-turn-room-WZ3BOB5F.js");
  await ensureTurnRoom({
    api,
    getSala: getUserSala,
    getToken: getCloudSyncToken,
    setCloudSyncRoomId,
    setCloudSyncRoomSnapshot,
    setCloudSyncRevision,
    onConnected: function() {
      setCloudRoomConnected(true);
    }
  });
  if (!getCloudSyncRoomId()) return null;
  setCloudRoomConnected(true);
  void import("/mobile/js/chunks/cloud-mobile-lan-strip-E46D6SPO.js").then(function(mod) {
    return mod.detachLanLiveSyncForNube();
  });
  const runtime = startSharedNubeRuntime({
    getApi: function() {
      return api;
    },
    getCloudSyncRoomId,
    getCloudSyncToken,
    getCloudSyncRevision,
    setCloudSyncRevision,
    onStatus: function() {
    },
    toast
  });
  void (async function seedCensusWithRetries() {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (attempt > 0) {
        await new Promise(function(resolve) {
          setTimeout(resolve, 2e3);
        });
      }
      const result = await pushCloudCensusNow();
      if (result?.ok) {
        console.info("[R+] Nube censo subido:", result.entryOps, "pacientes");
        break;
      }
      if (result?.reason === "no_local_patients" || result?.reason === "bridge_inactive") break;
      if (attempt === 7) {
        console.warn("[R+] Nube: no se pudo subir el censo tras varios intentos.");
      }
    }
    try {
      const { syncCloudClinicalOpsOnConnect } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-I6RKIORX.js");
      await syncCloudClinicalOpsOnConnect();
    } catch (err) {
      console.warn("[R+] Nube clinicalOps seed:", err?.message || err);
    }
  })();
  return runtime;
}
export {
  autostartCloudSyncIfConfigured,
  canAutostartCloudSync
};
//# sourceMappingURL=/js/chunks/autostart-636AKJRV.js.map
