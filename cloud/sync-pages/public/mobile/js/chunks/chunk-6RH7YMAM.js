import {
  lanHostBasesSameMachine,
  normalizeLanHostBase
} from "/mobile/js/chunks/chunk-WONKP6NU.js";

// public/js/lan-host-pin.mjs
var PINNED_HOST_KEY = "rpc-lan-pinned-host-url";
function getPinnedHostUrl() {
  try {
    return String(localStorage.getItem(PINNED_HOST_KEY) || "").trim().replace(/\/+$/, "");
  } catch {
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
    void _e;
  }
}
function clearPinnedHostUrl() {
  try {
    localStorage.removeItem(PINNED_HOST_KEY);
  } catch (_e) {
    void _e;
  }
}
function isPinnedHostLocal(ownBaseUrl) {
  const pinned = getPinnedHostUrl();
  if (!pinned) return false;
  const own = normalizeLanHostBase(ownBaseUrl || "");
  if (!own) return false;
  return lanHostBasesSameMachine(pinned, own) || normalizeLanHostBase(pinned) === own;
}
function isPinnedHostRemote(ownBaseUrl) {
  const pinned = getPinnedHostUrl();
  if (!pinned) return false;
  return !isPinnedHostLocal(ownBaseUrl);
}
function hasPinnedHostOverride() {
  return !!getPinnedHostUrl();
}

export {
  getPinnedHostUrl,
  setPinnedHostUrl,
  clearPinnedHostUrl,
  isPinnedHostLocal,
  isPinnedHostRemote,
  hasPinnedHostOverride
};
//# sourceMappingURL=/js/chunks/chunk-6RH7YMAM.js.map
