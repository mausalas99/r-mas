import {
  startSharedNubeRuntime
} from "/mobile/js/chunks/chunk-XI7RW5Z4.js";
import "/mobile/js/chunks/chunk-65TYIGXN.js";
import {
  OUTBOX_STORAGE_KEY
} from "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-MJCSL5KX.js";
import "/mobile/js/chunks/chunk-ZOXS3A7B.js";
import "/mobile/js/chunks/chunk-AZX47ZAL.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-7R6RY2VN.js";
import "/mobile/js/chunks/chunk-V7RKRU36.js";
import "/mobile/js/chunks/chunk-I7TKUVLA.js";
import "/mobile/js/chunks/chunk-OZWIHN57.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-RI6AP5AE.js";
import {
  pushCloudCensusNow
} from "/mobile/js/chunks/chunk-WWZFTPFJ.js";
import "/mobile/js/chunks/chunk-L2AHBXEQ.js";
import "/mobile/js/chunks/chunk-YAV7LD7W.js";
import "/mobile/js/chunks/chunk-FQRMD6ZB.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-MI3IWYVD.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-DVAK5LQO.js";
import "/mobile/js/chunks/chunk-NFDNC4E2.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-DYX4ICUP.js";
import "/mobile/js/chunks/chunk-IVC2VWFL.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-7V3KAWVG.js";
import "/mobile/js/chunks/chunk-VQEQYC4S.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-5X65DZ36.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-SI7XDBY4.js";
import "/mobile/js/chunks/chunk-MWVG4DXC.js";
import "/mobile/js/chunks/chunk-I4NFL7CB.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-CR432C3M.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-JSBTNZIE.js";
import "/mobile/js/chunks/chunk-IIOGZLID.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-R6TRWWWV.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-73TLMPZ4.js";
import "/mobile/js/chunks/chunk-W6RRSTLS.js";
import "/mobile/js/chunks/chunk-6WZSBH4P.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import {
  setCloudRoomConnected
} from "/mobile/js/chunks/chunk-ZWVJD7AP.js";
import {
  isCloudSala
} from "/mobile/js/chunks/chunk-AETSFPDT.js";
import {
  getCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRevision,
  setCloudSyncRoomId,
  setCloudSyncRoomSnapshot
} from "/mobile/js/chunks/chunk-YYAEPGIH.js";
import "/mobile/js/chunks/chunk-GZVXFENQ.js";
import "/mobile/js/chunks/chunk-QPJXCZUR.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/features/cloud-sync/autostart.mjs
function canAutostartCloudSync() {
  if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) return false;
  return !!getCloudSyncToken();
}
async function autostartCloudSyncIfConfigured(opts) {
  if (!canAutostartCloudSync()) return null;
  const { getUserSala } = await import("/mobile/js/chunks/panel-clinical-context-5C27EM4D.js");
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
  const { ensureTurnRoom } = await import("/mobile/js/chunks/ensure-turn-room-IIL6YYO7.js");
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
  void import("/mobile/js/chunks/detach-lan-for-nube-QAKQF2FB.js").then(function(mod) {
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
      const { syncCloudClinicalOpsOnConnect } = await import("/mobile/js/chunks/cloud-clinical-ops-sala-OIZMGMMD.js");
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
//# sourceMappingURL=/js/chunks/autostart-LAKGX5MY.js.map
