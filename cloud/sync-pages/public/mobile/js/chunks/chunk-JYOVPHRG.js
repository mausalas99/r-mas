import {
  isGuardiaMode
} from "/mobile/js/chunks/chunk-YAV7LD7W.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-IVC2VWFL.js";

// public/js/keyboard-shortcuts-nudge.mjs
var TAB_SHORTCUTS_ADOPTED_LS_KEY = "rpc-keyboard-tab-shortcuts-adopted";
var MOUSE_TAB_SWITCH_THRESHOLD = 5;
var nudgeWired = false;
var nudgeShownThisSession = false;
var mouseTabClickCount = 0;
var TAB_CLICK_SELECTOR = "#app-main-tablist .app-tab,.exp-consolidated-tab,.exp-segment-btn,#med-subview-tabs-bar .inner-tab,.med-output-tab";
function isTabShortcutsAdopted() {
  try {
    return localStorage.getItem(TAB_SHORTCUTS_ADOPTED_LS_KEY) === "1";
  } catch (_e) {
    return false;
  }
}
function markTabShortcutsAdopted() {
  try {
    localStorage.setItem(TAB_SHORTCUTS_ADOPTED_LS_KEY, "1");
  } catch (_e) {
    void _e;
  }
  nudgeShownThisSession = true;
}
function shouldOfferTabShortcutsNudge(state) {
  if (state.adopted) return false;
  if (state.nudgeShownThisSession) return false;
  return state.mouseTabClickCount >= MOUSE_TAB_SWITCH_THRESHOLD;
}
function nextMouseTabClickCount(count) {
  return Math.max(0, Number(count) || 0) + 1;
}
function modKeyLabel() {
  if (typeof navigator !== "undefined" && navigator.platform && /Mac/i.test(navigator.platform)) {
    return "\u2318";
  }
  return "Ctrl";
}
function openAtajosHelp() {
  void import("/mobile/js/chunks/help-content-IJHKS2RY.js").then(function(mod) {
    if (typeof mod.openQuickHelp === "function") mod.openQuickHelp("atajos");
  });
}
function maybeShowTabShortcutsNudge(showToast) {
  if (typeof showToast !== "function") return;
  if (isMobileWeb() || isGuardiaMode()) return;
  if (!shouldOfferTabShortcutsNudge({
    adopted: isTabShortcutsAdopted(),
    nudgeShownThisSession,
    mouseTabClickCount
  })) {
    return;
  }
  nudgeShownThisSession = true;
  var mod = modKeyLabel();
  showToast(
    "\xBFMuchos clics entre pesta\xF1as? Repite " + mod + "+2 para cambiar secci\xF3n del expediente.",
    "info",
    {
      durationMs: 6500,
      onClick: openAtajosHelp,
      action: { label: "Ver atajos", onClick: openAtajosHelp }
    }
  );
}
function onDocumentTabClick(ev) {
  if (isMobileWeb() || isGuardiaMode() || isTabShortcutsAdopted()) return;
  var target = ev.target;
  if (!target || typeof target.closest !== "function") return;
  if (!target.closest(TAB_CLICK_SELECTOR)) return;
  mouseTabClickCount = nextMouseTabClickCount(mouseTabClickCount);
  maybeShowTabShortcutsNudge(
    typeof window !== "undefined" && typeof window.showToast === "function" ? window.showToast : null
  );
}
function initKeyboardShortcutsNudge(_showToast) {
  if (nudgeWired || typeof document === "undefined") return;
  nudgeWired = true;
  document.addEventListener("click", onDocumentTabClick, true);
}
function resetTabShortcutsNudgeStateForTests() {
  nudgeShownThisSession = false;
  mouseTabClickCount = 0;
}

export {
  TAB_SHORTCUTS_ADOPTED_LS_KEY,
  MOUSE_TAB_SWITCH_THRESHOLD,
  isTabShortcutsAdopted,
  markTabShortcutsAdopted,
  shouldOfferTabShortcutsNudge,
  nextMouseTabClickCount,
  initKeyboardShortcutsNudge,
  resetTabShortcutsNudgeStateForTests
};
//# sourceMappingURL=/js/chunks/chunk-JYOVPHRG.js.map
