import {
  lanHostBasesSameMachine,
  normalizeLanHostBase
} from "/js/chunks/chunk-FII6Y5F2.js";

// public/js/lan-host-pin.mjs
var PINNED_HOST_KEY = "rpc-lan-pinned-host-url";
function getPinnedHostUrl() {
  try {
    return String(localStorage.getItem(PINNED_HOST_KEY) || "").trim().replace(/\/+$/, "");
  } catch (_e) {
    return "";
  }
}
function setPinnedHostUrl(hostUrl) {
  const url = String(hostUrl || "").trim().replace(/\/+$/, "");
  if (!url) {
    clearPinnedHostUrl();
    return;
  }
  try {
    localStorage.setItem(PINNED_HOST_KEY, url);
  } catch (_e) {
  }
}
function clearPinnedHostUrl() {
  try {
    localStorage.removeItem(PINNED_HOST_KEY);
  } catch (_e) {
  }
}
function isPinnedHostLocal(ownBaseUrl) {
  const pinned = getPinnedHostUrl();
  if (!pinned) return false;
  const own = normalizeLanHostBase(ownBaseUrl || "");
  if (!own) return false;
  return lanHostBasesSameMachine(pinned, own) || normalizeLanHostBase(pinned) === own;
}
function hasPinnedHostOverride() {
  return !!getPinnedHostUrl();
}

export {
  getPinnedHostUrl,
  setPinnedHostUrl,
  clearPinnedHostUrl,
  isPinnedHostLocal,
  hasPinnedHostOverride
};
//# sourceMappingURL=/js/chunks/chunk-QOWDHS6Z.js.map
