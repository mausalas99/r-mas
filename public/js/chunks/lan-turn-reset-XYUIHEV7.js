import {
  clearPinnedHostUrl
} from "/js/chunks/chunk-GMVJRWWR.js";
import {
  clearWardHostRegistry
} from "/js/chunks/chunk-AOR2DWAW.js";
import "/js/chunks/chunk-EXMEBP6A.js";
import {
  storage
} from "/js/chunks/chunk-SIYQRRVR.js";
import "/js/chunks/chunk-OWSDDYBM.js";
import "/js/chunks/chunk-K2BMYY6G.js";
import "/js/chunks/chunk-VQ3KZLKM.js";

// public/js/lan-turn-reset.mjs
var LAN_TURN_RESET_CLIENT_CONFIRM = "Saldr\xE1s de la sala \u21C4, se quitar\xE1 el anfitri\xF3n fijado y esta Mac dejar\xE1 de actuar como servidor del turno. Tu base cl\xEDnica y equipos no se borran. Despu\xE9s ingresa el PIN del R4 o pega el enlace de invitaci\xF3n. \xBFRestablecer?";
var SPLIT_BRAIN_HINT_KEY = "rpc-lan-split-brain-hint-shown";
async function performLanTurnClientReset(deps) {
  if (typeof deps.leaveLiveSyncRoom === "function") {
    deps.leaveLiveSyncRoom({ silentLeave: true });
  }
  clearPinnedHostUrl();
  clearWardHostRegistry();
  if (typeof storage.saveLanUiRole === "function") storage.saveLanUiRole("client");
  if (typeof storage.saveLanConfig === "function") storage.saveLanConfig(null);
  try {
    if (deps.lanClient && typeof deps.lanClient.disconnect === "function") {
      deps.lanClient.disconnect();
    }
  } catch (_disc) {
  }
  try {
    sessionStorage.removeItem(SPLIT_BRAIN_HINT_KEY);
  } catch (_ss) {
  }
  return { mode: "client" };
}
export {
  LAN_TURN_RESET_CLIENT_CONFIRM,
  performLanTurnClientReset
};
//# sourceMappingURL=/js/chunks/lan-turn-reset-XYUIHEV7.js.map
