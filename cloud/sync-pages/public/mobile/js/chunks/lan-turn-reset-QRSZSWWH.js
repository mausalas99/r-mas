import {
  clearPinnedHostUrl
} from "/mobile/js/chunks/chunk-6RH7YMAM.js";
import {
  storage
} from "/mobile/js/chunks/chunk-MWVG4DXC.js";
import {
  clearWardHostRegistry,
  seedBundledWardConnectionPoints
} from "/mobile/js/chunks/chunk-I4NFL7CB.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-JSBTNZIE.js";
import "/mobile/js/chunks/chunk-IIOGZLID.js";
import "/mobile/js/chunks/chunk-6WZSBH4P.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/lan-turn-reset.mjs
var LAN_TURN_RESET_CLIENT_CONFIRM = "Saldr\xE1s de la sala \u21C4 y se limpiar\xE1 el anfitri\xF3n local fijado. Tu base cl\xEDnica y equipos no se borran. Despu\xE9s puedes volver a conectar R+ Cloud en \u21C4. \xBFRestablecer?";
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
//# sourceMappingURL=/js/chunks/lan-turn-reset-QRSZSWWH.js.map
