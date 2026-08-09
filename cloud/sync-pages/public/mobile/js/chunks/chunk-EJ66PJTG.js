import {
  CLINICAL_LS_KEYS
} from "/mobile/js/chunks/chunk-QHIEC6QJ.js";

// public/js/session-clinical-wipe.mjs
var SESSION_WEB_LS_KEYS = [
  "rplus.lan.bearer",
  "rpc-lan-config",
  "rpc-lan-shift-pin",
  "rpc-lan-ui-role",
  "rpc-lan-hide-disconnect-banner",
  "rpc-lan-room-snapshots",
  "rpc-lan-host-patient-map"
];
function wipeSessionClinicalStorage(opts) {
  if (typeof localStorage === "undefined") return 0;
  var includeLan = !opts || opts.includeLanSession !== false;
  var removed = 0;
  for (var i = 0; i < CLINICAL_LS_KEYS.length; i += 1) {
    var key = CLINICAL_LS_KEYS[i];
    if (localStorage.getItem(key) == null) continue;
    try {
      localStorage.removeItem(key);
      removed += 1;
    } catch (_e) {
      void _e;
    }
  }
  if (includeLan) {
    for (var j = 0; j < SESSION_WEB_LS_KEYS.length; j += 1) {
      var lanKey = SESSION_WEB_LS_KEYS[j];
      if (localStorage.getItem(lanKey) == null) continue;
      try {
        localStorage.removeItem(lanKey);
        removed += 1;
      } catch (_e) {
        void _e;
      }
    }
  }
  return removed;
}
function shouldInstallSessionClinicalWipe() {
  return isSessionScopedWebClient();
}
function hasSessionScopedWebRuntimeFlag() {
  const g = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : null;
  if (!g) return false;
  if (g.__RPC_MOBILE_WEB__ || g.__RPC_WEB_CLINICAL__) return true;
  if (typeof document !== "undefined" && document.documentElement && document.documentElement.classList.contains("rpc-mobile-web")) {
    return true;
  }
  return false;
}
function isSessionScopedWebClient() {
  if (typeof window === "undefined") return false;
  if (window.electronAPI && typeof window.electronAPI.dbClinicalLoadAll === "function") {
    return false;
  }
  return hasSessionScopedWebRuntimeFlag();
}
function installSessionClinicalWipeOnExit() {
  if (!shouldInstallSessionClinicalWipe()) return;
  var wipe = function() {
    wipeSessionClinicalStorage();
  };
  window.addEventListener("pagehide", wipe);
  window.addEventListener("beforeunload", wipe);
}

export {
  SESSION_WEB_LS_KEYS,
  wipeSessionClinicalStorage,
  shouldInstallSessionClinicalWipe,
  isSessionScopedWebClient,
  installSessionClinicalWipeOnExit
};
//# sourceMappingURL=/js/chunks/chunk-EJ66PJTG.js.map
