import {
  startSharedNubeRuntime
} from "/mobile/js/chunks/chunk-GETCIOCD.js";
import "/mobile/js/chunks/chunk-65TYIGXN.js";
import {
  OUTBOX_STORAGE_KEY
} from "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-RAQX5OVN.js";
import "/mobile/js/chunks/chunk-CV62ZWIZ.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-7R6RY2VN.js";
import "/mobile/js/chunks/chunk-OJH7L2CJ.js";
import "/mobile/js/chunks/chunk-YREK4H2V.js";
import "/mobile/js/chunks/chunk-HVHVRFSH.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-K7TUQM3L.js";
import "/mobile/js/chunks/chunk-NW6K73WP.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-F55OGCCZ.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-C6TP3H7V.js";
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-OJF7SMWI.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-GJUAH75C.js";
import "/mobile/js/chunks/chunk-WOP35WT6.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-ALW2M5BA.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import {
  pushCloudCensusNow
} from "/mobile/js/chunks/chunk-MBEH6ZUQ.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import "/mobile/js/chunks/chunk-JZ2SPQIK.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-IAZG4W3U.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import "/mobile/js/chunks/chunk-76D6GOCM.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-YAGCGSLT.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-XO7Z5S3R.js";
import "/mobile/js/chunks/chunk-GWKS66VB.js";
import "/mobile/js/chunks/chunk-3566DTDN.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import {
  isCloudSala,
  setCloudRoomConnected
} from "/mobile/js/chunks/chunk-6VYBWSQE.js";
import {
  getCloudSyncRevision,
  getCloudSyncRoomId,
  getCloudSyncToken,
  getCloudSyncUrl,
  setCloudSyncRevision,
  setCloudSyncRoomId,
  setCloudSyncRoomSnapshot
} from "/mobile/js/chunks/chunk-BRT2MMPP.js";
import "/mobile/js/chunks/chunk-HMTHREEE.js";
import "/mobile/js/chunks/chunk-CRJYUJ23.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import "/mobile/js/chunks/chunk-OEEP3MSI.js";
import "/mobile/js/chunks/chunk-LMOJUVZ4.js";

// public/js/features/cloud-sync/autostart.mjs
function canAutostartCloudSync() {
  if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) return false;
  return !!getCloudSyncToken();
}
async function autostartCloudSyncIfConfigured(opts) {
  if (!canAutostartCloudSync()) return null;
  const { getUserSala } = await import("/mobile/js/chunks/panel-clinical-context-3M2UOAHI.js");
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
  const { ensureTurnRoom } = await import("/mobile/js/chunks/ensure-turn-room-UOECMQXJ.js");
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
        return;
      }
      if (result?.reason === "no_local_patients" || result?.reason === "bridge_inactive") return;
    }
    console.warn("[R+] Nube: no se pudo subir el censo tras varios intentos.");
  })();
  return runtime;
}
export {
  autostartCloudSyncIfConfigured,
  canAutostartCloudSync
};
//# sourceMappingURL=/js/chunks/autostart-F2ZIU5OC.js.map
