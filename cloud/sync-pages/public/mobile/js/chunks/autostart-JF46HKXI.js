import {
  startSharedNubeRuntime
} from "/mobile/js/chunks/chunk-WN7CWMVF.js";
import "/mobile/js/chunks/chunk-RFW76HSI.js";
import {
  OUTBOX_STORAGE_KEY
} from "/mobile/js/chunks/chunk-CE75LS7G.js";
import "/mobile/js/chunks/chunk-YLVR4STO.js";
import "/mobile/js/chunks/chunk-MRCCGBKF.js";
import "/mobile/js/chunks/chunk-OXMUDSQA.js";
import "/mobile/js/chunks/chunk-3ETJLEUF.js";
import "/mobile/js/chunks/chunk-FHDPZLZP.js";
import "/mobile/js/chunks/chunk-N74FWNUD.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-T5EKEMCK.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-M75YYGQZ.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-56R66ES7.js";
import {
  pushCloudCensusNow
} from "/mobile/js/chunks/chunk-3NNHG3MC.js";
import "/mobile/js/chunks/chunk-PD77VH7Y.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-TWV6UAYK.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-WXZVVY5M.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import "/mobile/js/chunks/chunk-J76D6PFX.js";
import {
  setCloudRoomConnected
} from "/mobile/js/chunks/chunk-WUQ6BLHZ.js";
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
import "/mobile/js/chunks/chunk-ARAHUBAM.js";
import "/mobile/js/chunks/chunk-NMJNQQZG.js";
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
  const { getUserSala } = await import("/mobile/js/chunks/panel-clinical-context-VWF552S6.js");
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
  const { ensureTurnRoom } = await import("/mobile/js/chunks/ensure-turn-room-WY2PQ5VC.js");
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
  void import("/mobile/js/chunks/cloud-mobile-lan-strip-ZXR3OTYP.js").then(function(mod) {
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
      const { syncCloudClinicalOpsOnConnect } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-756KA6DY.js");
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
//# sourceMappingURL=/js/chunks/autostart-JF46HKXI.js.map
