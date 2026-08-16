import {
  OUTBOX_STORAGE_KEY,
  startSharedNubeRuntime
} from "/mobile/js/chunks/chunk-ANI5HGUB.js";
import "/mobile/js/chunks/chunk-6YERAGXK.js";
import {
  createCloudSyncApi
} from "/mobile/js/chunks/chunk-KYGE5G3V.js";
import "/mobile/js/chunks/chunk-VDEKDLYX.js";
import "/mobile/js/chunks/chunk-CPLU2I7R.js";
import "/mobile/js/chunks/chunk-U3XNJFTE.js";
import "/mobile/js/chunks/chunk-7TWBBTNK.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-YUEMH3I3.js";
import "/mobile/js/chunks/chunk-IGOCX3DQ.js";
import "/mobile/js/chunks/chunk-AVZ5WV63.js";
import "/mobile/js/chunks/chunk-NPWWQWKW.js";
import "/mobile/js/chunks/chunk-KESF4FLC.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-3PL7T3ZN.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-7FIP2ETS.js";
import "/mobile/js/chunks/chunk-CZ2M277B.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-JBHSWL2Z.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-BUGU4R5K.js";
import "/mobile/js/chunks/chunk-4SMSHN53.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-P7EHNYUF.js";
import "/mobile/js/chunks/chunk-S2E4QGRL.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-NC6VRD7M.js";
import "/mobile/js/chunks/chunk-5RUR3UQW.js";
import {
  setCloudRoomConnected
} from "/mobile/js/chunks/chunk-C4OBKXWW.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-VVADIT4K.js";
import "/mobile/js/chunks/chunk-HDD2EUC6.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-VRNWC4P2.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-KZT7D6I2.js";
import "/mobile/js/chunks/chunk-EE5CSOUC.js";
import "/mobile/js/chunks/chunk-WTVHUFEL.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-75QM3TGW.js";
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
} from "/mobile/js/chunks/chunk-NPUSZB5W.js";

// public/js/features/cloud-sync/autostart.mjs
function canAutostartCloudSync() {
  if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) return false;
  return !!getCloudSyncToken();
}
async function autostartCloudSyncIfConfigured(opts) {
  if (!canAutostartCloudSync()) return null;
  const { getUserSala } = await import("/mobile/js/chunks/panel-clinical-context-G6MXII5U.js");
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
  const { ensureTurnRoom } = await import("/mobile/js/chunks/ensure-turn-room-LH5JI4KU.js");
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
//# sourceMappingURL=/js/chunks/autostart-P2DKHQBJ.js.map
