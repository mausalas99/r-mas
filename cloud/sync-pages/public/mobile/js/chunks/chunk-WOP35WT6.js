import {
  isMobileWebModePersisted
} from "/mobile/js/chunks/chunk-XO7Z5S3R.js";

// public/js/mobile-web-detect.mjs
function mobileRuntimeGlobal() {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof window !== "undefined") return window;
  return null;
}
function isMobileWeb() {
  var g = mobileRuntimeGlobal();
  if (!g) return false;
  return !!(g.__RPC_MOBILE_WEB__ || typeof document !== "undefined" && document.documentElement && document.documentElement.classList.contains("rpc-mobile-web"));
}

// public/js/mobile-web.mjs
function isMobileWeb2() {
  return isMobileWeb() || isMobileWebModePersisted();
}
function blockIfMobileDocExport() {
  if (!isMobileWeb2()) return false;
  return true;
}
function mobileDocExportToast(showToastFn) {
  if (typeof showToastFn === "function") {
    showToastFn(
      "En R+ M\xF3vil no se generan documentos (.docx). Usa la app de escritorio para Word y salida r\xE1pida.",
      "error"
    );
  }
}
function syncMobileBarebonesChrome() {
  if (!isMobileWeb2() || typeof document === "undefined") return;
  var hideIds = [
    "btn-export-censo-header",
    "profile-toggle-btn",
    "btn-open-settings",
    "itab-salida",
    "sidebar-censo-export-wrap",
    "btn-header-team-sync"
  ];
  hideIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  var salidaBar = document.getElementById("exp-segment-salida");
  if (salidaBar) salidaBar.style.display = "none";
  var brand = document.getElementById("app-brand");
  if (brand) {
    brand.removeAttribute("onclick");
    brand.removeAttribute("onkeydown");
    brand.removeAttribute("role");
    brand.removeAttribute("tabindex");
    brand.title = "R+ M\xF3vil";
    brand.setAttribute("aria-label", "R+ M\xF3vil");
  }
  closeSettingsDropdownIfPresent();
  closeProfileModalIfPresent();
}
function closeSettingsDropdownIfPresent() {
  var bg = document.getElementById("settings-dropdown-backdrop");
  var dd = document.getElementById("settings-dropdown");
  if (bg) bg.classList.remove("open");
  if (dd) dd.classList.remove("open");
  document.body.classList.remove("settings-dropdown-open");
}
function closeProfileModalIfPresent() {
  var modal = document.getElementById("profile-modal");
  if (modal) modal.classList.remove("open");
}

export {
  isMobileWeb2 as isMobileWeb,
  blockIfMobileDocExport,
  mobileDocExportToast,
  syncMobileBarebonesChrome
};
//# sourceMappingURL=/js/chunks/chunk-WOP35WT6.js.map
