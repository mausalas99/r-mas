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

// public/js/mobile-lan-query-persist.mjs
function isMobileWebModePersisted() {
  try {
    return localStorage.getItem("rpc-mobile-web-mode") === "1";
  } catch {
    return false;
  }
}

// public/js/mobile-web.mjs
function mobileRuntimeGlobal2() {
  if (typeof globalThis !== "undefined") return globalThis;
  if (typeof window !== "undefined") return window;
  return null;
}
function isMobileWeb2() {
  return isMobileWeb() || isMobileWebModePersisted();
}
function activateMobileWebRoot() {
  var g = mobileRuntimeGlobal2();
  if (g) g.__RPC_MOBILE_WEB__ = true;
  if (typeof document === "undefined") return;
  document.documentElement.classList.add("rpc-mobile-web");
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
var MOBILE_MAIN_APP_TABS = ["lab", "nota"];
function normalizeMobileAppTab(tab) {
  if (!isMobileWeb2()) return tab;
  if (tab === "lan") tab = "lab";
  if (tab === "lab" || tab === "nota") return tab;
  if (tab === "med" || tab === "agenda") return "nota";
  return "lab";
}
function hideMobileChromeByIds(ids) {
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}
function dismissMobileLearningChrome() {
  var learnBackdrop = document.getElementById("learn-hub-backdrop");
  if (learnBackdrop) {
    learnBackdrop.classList.remove("open");
    learnBackdrop.setAttribute("aria-hidden", "true");
  }
  var tourDock = document.getElementById("tour-dock");
  if (tourDock) tourDock.classList.remove("tour-dock-visible");
  var introBackdrop = document.getElementById("onboarding-intro-backdrop");
  if (introBackdrop) introBackdrop.classList.remove("open");
}
function ensureMobileAppTabAllowed() {
  void import("/mobile/js/chunks/pase-board-runtime-SCM2GQCL.js").then(function(mod) {
    var rt = mod.rt;
    if (!rt || typeof rt.getActiveAppTab !== "function") return;
    var cur = rt.getActiveAppTab();
    var tabKey = cur === "lan" ? "lab" : cur;
    var normalized = normalizeMobileAppTab(tabKey);
    if (normalized === tabKey) return;
    return import("/mobile/js/chunks/pase-board-app-tabs-QHB642YX.js").then(function(tabs) {
      if (typeof tabs.switchAppTab === "function") tabs.switchAppTab(normalized);
    });
  }).catch(function() {
  });
}
function syncMobileBarebonesChrome() {
  if (!isMobileWeb2() || typeof document === "undefined") return;
  var hideIds = [
    "btn-export-censo-header",
    "profile-toggle-btn",
    "btn-open-settings",
    "itab-salida",
    "sidebar-censo-export-wrap",
    "btn-header-team-sync",
    "lab-input-section",
    "lab-diagrams-section",
    "lab-banner",
    "btn-header-cmdk",
    "btn-header-shortcuts",
    "btn-open-learn",
    "help-learn-hub",
    "learn-hub-backdrop",
    "tour-dock",
    "onboarding-intro-backdrop",
    "apptab-med",
    "apptab-agenda",
    "appcontent-med",
    "appcontent-agenda"
  ];
  hideMobileChromeByIds(hideIds);
  dismissMobileLearningChrome();
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
  var todayDate = document.getElementById("today-date");
  if (todayDate) todayDate.style.display = "none";
  var headerPath = document.getElementById("header-context-path");
  if (headerPath) headerPath.style.display = "none";
  syncMobileLabReferenceChrome();
  ensureMobileAppTabAllowed();
}
function syncMobileLabReferenceHeaderState() {
  var selectEl = document.getElementById("lab-history-date-select");
  var cardHeader = document.querySelector("#lab-output-section > .card-header");
  var picker = document.querySelector(".lab-history-date-picker");
  var pickerLabel = document.querySelector(".lab-history-date-picker-label");
  var cardTitle = document.querySelector("#lab-output-section .lab-output-card-title");
  var hasStudies = !!(selectEl && !selectEl.hidden);
  if (cardTitle) {
    cardTitle.setAttribute("aria-hidden", "true");
    cardTitle.style.display = "none";
  }
  if (cardHeader) {
    cardHeader.style.display = hasStudies ? "" : "none";
    cardHeader.style.flexDirection = "column";
  }
  if (picker) picker.style.display = hasStudies ? "" : "none";
  if (pickerLabel) {
    pickerLabel.textContent = "Estudio";
    pickerLabel.classList.add("visually-hidden");
  }
  var outSec = document.getElementById("lab-output-section");
  if (outSec) outSec.classList.toggle("is-mobile-lab-empty", !hasStudies);
}
function syncMobileLabReferenceChrome() {
  if (!isMobileWeb2() || typeof document === "undefined") return;
  document.documentElement.classList.add("rpc-mobile-lab-reference");
  ["lab-input-section", "lab-diagrams-section", "lab-banner"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
  var outSec = document.getElementById("lab-output-section");
  if (outSec) {
    outSec.style.display = "flex";
    outSec.style.flexDirection = "column";
  }
  syncMobileLabReferenceHeaderState();
  hideMobileLabWorkbenchChrome();
}
function refreshMobileLabReferencePanel() {
  if (!isMobileWeb2()) return;
  syncMobileLabReferenceChrome();
  void import("/mobile/js/chunks/lazy-feature-routes-Q6ZFNJCB.js").then(function(routes) {
    return routes.ensureLabsLoaded();
  }).then(function(mod) {
    if (mod && typeof mod.renderLabHistoryPanel === "function") {
      mod.renderLabHistoryPanel();
    }
  }).catch(function() {
  });
}
function hideMobileLabWorkbenchChrome() {
  var moreMenu = document.querySelector(".lab-output-more");
  if (moreMenu) moreMenu.hidden = true;
  var copyFab = document.getElementById("lab-copy-fab");
  if (copyFab) {
    copyFab.hidden = true;
    copyFab.style.display = "none";
  }
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
  activateMobileWebRoot,
  blockIfMobileDocExport,
  mobileDocExportToast,
  MOBILE_MAIN_APP_TABS,
  normalizeMobileAppTab,
  syncMobileBarebonesChrome,
  syncMobileLabReferenceChrome,
  refreshMobileLabReferencePanel
};
//# sourceMappingURL=/js/chunks/chunk-XWOEH37S.js.map
