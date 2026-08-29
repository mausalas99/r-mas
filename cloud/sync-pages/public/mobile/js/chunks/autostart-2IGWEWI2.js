import {
  OUTBOX_STORAGE_KEY,
  startSharedNubeRuntime
} from "/mobile/js/chunks/chunk-FN6TV54N.js";
import "/mobile/js/chunks/chunk-A3RN2FNA.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-ATT36THA.js";
import "/mobile/js/chunks/chunk-O5BLBOGB.js";
import "/mobile/js/chunks/chunk-PVAHDYTI.js";
import "/mobile/js/chunks/chunk-7E4ACOES.js";
import "/mobile/js/chunks/chunk-EP7FYMO7.js";
import "/mobile/js/chunks/chunk-HHBM77OL.js";
import "/mobile/js/chunks/chunk-CBI7THZ4.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-JGESXDLG.js";
import "/mobile/js/chunks/chunk-SHV4FR3K.js";
import "/mobile/js/chunks/chunk-6P7TSNN6.js";
import "/mobile/js/chunks/chunk-JNMJGW22.js";
import "/mobile/js/chunks/chunk-WEWTMUQK.js";
import "/mobile/js/chunks/chunk-PJD3LECG.js";
import "/mobile/js/chunks/chunk-LN2N4VIO.js";
import "/mobile/js/chunks/chunk-2GD37PRJ.js";
import "/mobile/js/chunks/chunk-5CRK7XGO.js";
import "/mobile/js/chunks/chunk-4EH4XZVS.js";
import "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import "/mobile/js/chunks/chunk-PLO52CII.js";
import "/mobile/js/chunks/chunk-WEOKZTSW.js";
import "/mobile/js/chunks/chunk-7XJNQXQX.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-VAFCBXBV.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-QLSLJE42.js";
import "/mobile/js/chunks/chunk-EASTAY6S.js";
import "/mobile/js/chunks/chunk-B7NNRK4H.js";
import "/mobile/js/chunks/chunk-ZDAIWZ25.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-MLLRKYO6.js";
import "/mobile/js/chunks/chunk-2SJQGKPU.js";
import "/mobile/js/chunks/chunk-EZ7GA6IL.js";
import {
  setCloudRoomConnected
} from "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-K4PQIQOH.js";
import "/mobile/js/chunks/chunk-BTIFFDH4.js";
import "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-Y2YRXJMM.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-XV2TMACY.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
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
} from "/mobile/js/chunks/chunk-FLGCYVFI.js";

// public/js/features/cloud-sync/autostart.mjs
function canAutostartCloudSync() {
  if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) return false;
  return !!getCloudSyncToken();
}
async function autostartCloudSyncIfConfigured(opts) {
  if (!canAutostartCloudSync()) return null;
  const { getUserSala } = await import("/mobile/js/chunks/panel-clinical-context-545LAUM4.js");
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
  const { ensureTurnRoom } = await import("/mobile/js/chunks/ensure-turn-room-57XFBPZG.js");
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
  return startSharedNubeRuntime({
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
}
export {
  autostartCloudSyncIfConfigured,
  canAutostartCloudSync
};
//# sourceMappingURL=/js/chunks/autostart-2IGWEWI2.js.map
