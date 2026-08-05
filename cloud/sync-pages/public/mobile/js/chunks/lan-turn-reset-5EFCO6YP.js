import {
  clearPinnedHostUrl
} from "/mobile/js/chunks/chunk-6RH7YMAM.js";
import {
  storage
} from "/mobile/js/chunks/chunk-76D6GOCM.js";
import {
  clearWardHostRegistry,
  seedBundledWardConnectionPoints
} from "/mobile/js/chunks/chunk-YAGCGSLT.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-3566DTDN.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import "/mobile/js/chunks/chunk-OEEP3MSI.js";
import "/mobile/js/chunks/chunk-LMOJUVZ4.js";

// public/js/lan-turn-reset.mjs
var LAN_TURN_RESET_CLIENT_CONFIRM = "Saldr\xE1s de la sala \u21C4, se quitar\xE1 el anfitri\xF3n fijado y esta Mac dejar\xE1 de actuar como servidor del turno. Tu base cl\xEDnica y equipos no se borran. Despu\xE9s buscaremos al anfitri\xF3n del turno en la Wi\u2011Fi. \xBFRestablecer?";
var SPLIT_BRAIN_HINT_KEY = "rpc-lan-split-brain-hint-shown";
async function performLanTurnClientReset(deps) {
  if (typeof deps.leaveLiveSyncRoom === "function") {
    deps.leaveLiveSyncRoom({ silentLeave: true });
  }
  clearPinnedHostUrl();
  clearWardHostRegistry();
  seedBundledWardConnectionPoints();
  if (typeof storage.saveLanUiRole === "function") storage.saveLanUiRole("client");
  if (typeof storage.saveLanConfig === "function") storage.saveLanConfig(null);
  try {
    if (deps.lanClient && typeof deps.lanClient.disconnect === "function") {
      deps.lanClient.disconnect();
    }
  } catch (_e) {
    void _e;
  }
  try {
    sessionStorage.removeItem(SPLIT_BRAIN_HINT_KEY);
  } catch (_e) {
    void _e;
  }
  return { mode: "client" };
}
export {
  LAN_TURN_RESET_CLIENT_CONFIRM,
  performLanTurnClientReset
};
//# sourceMappingURL=/js/chunks/lan-turn-reset-5EFCO6YP.js.map
