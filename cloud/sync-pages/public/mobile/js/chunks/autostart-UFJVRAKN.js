import {
  startSharedNubeRuntime
} from "/mobile/js/chunks/chunk-B4ZEGVWP.js";
import "/mobile/js/chunks/chunk-RFW76HSI.js";
import {
  OUTBOX_STORAGE_KEY
} from "/mobile/js/chunks/chunk-CE75LS7G.js";
import "/mobile/js/chunks/chunk-EQA33PSX.js";
import "/mobile/js/chunks/chunk-GHYXKSAH.js";
import "/mobile/js/chunks/chunk-OXMUDSQA.js";
import "/mobile/js/chunks/chunk-3ETJLEUF.js";
import "/mobile/js/chunks/chunk-JB63TG4Y.js";
import "/mobile/js/chunks/chunk-BZPGDWNR.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-HKGXY6ZZ.js";
import "/mobile/js/chunks/chunk-FVMS5JSH.js";
import "/mobile/js/chunks/chunk-CYT2QRK7.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-F5H6MC3T.js";
import {
  pushCloudCensusNow
} from "/mobile/js/chunks/chunk-FHX6BQST.js";
import "/mobile/js/chunks/chunk-HHFYYXCN.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-C345P2AA.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-XJ7JWVS5.js";
import {
  setCloudRoomConnected
} from "/mobile/js/chunks/chunk-CAVI7UGR.js";
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
import "/mobile/js/chunks/chunk-6CH64UGD.js";
import "/mobile/js/chunks/chunk-PJKQGVLW.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-P32NKBWE.js";

// public/js/features/cloud-sync/autostart.mjs
function canAutostartCloudSync() {
  if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) return false;
  return !!getCloudSyncToken();
}
async function autostartCloudSyncIfConfigured(opts) {
  if (!canAutostartCloudSync()) return null;
  const { getUserSala } = await import("/mobile/js/chunks/panel-clinical-context-UWGKN2R2.js");
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
  const { ensureTurnRoom } = await import("/mobile/js/chunks/ensure-turn-room-Q5PSI4QG.js");
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
      const { syncCloudClinicalOpsOnConnect } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-3E432XUZ.js");
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
//# sourceMappingURL=/js/chunks/autostart-UFJVRAKN.js.map
