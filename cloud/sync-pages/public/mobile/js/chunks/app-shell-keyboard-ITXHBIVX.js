import {
  markTabShortcutsAdopted
} from "/mobile/js/chunks/chunk-AK37E7UB.js";
import {
  navigateProcedureAgendaWeek,
  resetProcedureAgendaWeek
} from "/mobile/js/chunks/chunk-OFGUK3YC.js";
import {
  getActiveInnerTab,
  getMedSubview,
  medOutputTab,
  openPaseSectionInNormal,
  rt,
  setMedOutputTab,
  setMedSubview,
  setWorkModeFromHeader,
  switchAppTab,
  switchConsolidatedTab,
  switchInnerTab,
  toggleProfileSection
} from "/mobile/js/chunks/chunk-AHPMOEZZ.js";
import "/mobile/js/chunks/chunk-XKT4MCFM.js";
import "/mobile/js/chunks/chunk-YVSFHJPU.js";
import "/mobile/js/chunks/chunk-4DQVQVZW.js";
import {
  consolidatedInnerTabButtonId,
  getConsolidatedTabs,
  migrateGranularInner
} from "/mobile/js/chunks/chunk-UCLZORRW.js";
import "/mobile/js/chunks/chunk-H7HPBMWH.js";
import "/mobile/js/chunks/chunk-2ZXFDPTM.js";
import "/mobile/js/chunks/chunk-F3XP3RDZ.js";
import "/mobile/js/chunks/chunk-36OM7STI.js";
import "/mobile/js/chunks/chunk-RGW4I6Z6.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-2JKGABV2.js";
import "/mobile/js/chunks/chunk-MVTHEUBE.js";
import "/mobile/js/chunks/chunk-2RS4OG65.js";
import "/mobile/js/chunks/chunk-WSJX2ILZ.js";
import "/mobile/js/chunks/chunk-WMYXHSAE.js";
import "/mobile/js/chunks/chunk-RARSRFYU.js";
import "/mobile/js/chunks/chunk-5QPKU4WX.js";
import "/mobile/js/chunks/chunk-SLEQU5CJ.js";
import "/mobile/js/chunks/chunk-CNQU7XB3.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-WOI2MHQW.js";
import "/mobile/js/chunks/chunk-NMO3BDA4.js";
import "/mobile/js/chunks/chunk-ZKUQGQZX.js";
import "/mobile/js/chunks/chunk-VHAGBDAV.js";
import "/mobile/js/chunks/chunk-FGKC3QPA.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-W5HGKDOD.js";
import "/mobile/js/chunks/chunk-H22VI5GA.js";
import "/mobile/js/chunks/chunk-CULVJM5A.js";
import "/mobile/js/chunks/chunk-O7LRWY7C.js";
import "/mobile/js/chunks/chunk-CE75LS7G.js";
import "/mobile/js/chunks/chunk-YLVR4STO.js";
import "/mobile/js/chunks/chunk-MRCCGBKF.js";
import "/mobile/js/chunks/chunk-OXMUDSQA.js";
import "/mobile/js/chunks/chunk-3ETJLEUF.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-UX725VAF.js";
import "/mobile/js/chunks/chunk-VL5J4B3E.js";
import "/mobile/js/chunks/chunk-Q2YIMSEE.js";
import "/mobile/js/chunks/chunk-FHDPZLZP.js";
import "/mobile/js/chunks/chunk-N74FWNUD.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-T5EKEMCK.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-M75YYGQZ.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-56R66ES7.js";
import "/mobile/js/chunks/chunk-3NNHG3MC.js";
import {
  isGuardiaMode,
  isPaseMode
} from "/mobile/js/chunks/chunk-PD77VH7Y.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-TWV6UAYK.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-WXZVVY5M.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import "/mobile/js/chunks/chunk-J76D6PFX.js";
import "/mobile/js/chunks/chunk-WUQ6BLHZ.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-ARAHUBAM.js";
import "/mobile/js/chunks/chunk-NMJNQQZG.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";
import "/mobile/js/chunks/chunk-FORXNEKH.js";

// public/js/app-shell-lazy-panels.mjs
function importLazyRoutes() {
  return import("/mobile/js/chunks/lazy-feature-routes-3GHGAM6B.js");
}
function shellCloseSettingsDropdown() {
  void importLazyRoutes().then(function(routes) {
    routes.shellCloseSettingsDropdown();
  });
}
function shellToggleSettingsDropdown() {
  void importLazyRoutes().then(function(routes) {
    routes.shellToggleSettingsDropdown();
  });
}
function openCommandPaletteFromShell() {
  void import("/mobile/js/chunks/command-palette-D3EUUEOS.js").then(function(mod) {
    mod.openCommandPalette();
  });
}

// public/js/app-shell-expediente-shortcuts.mjs
var EXPEDIENTE_SHORTCUT_KEYS = { e: 1, t: 1, d: 1 };
var expedienteShortcutKeys = Object.freeze(["e", "t", "d"]);
function isExpedienteShortcutKey(key) {
  return !!EXPEDIENTE_SHORTCUT_KEYS[String(key || "").toLowerCase()];
}
function resolveExpedienteShortcutTarget(key, currentInner, settings) {
  var k = String(key || "").toLowerCase();
  if (!EXPEDIENTE_SHORTCUT_KEYS[k]) return null;
  var st = settings || {};
  var inner = migrateGranularInner(currentInner || "todo", st);
  if (k === "e") {
    if (inner === "estadoActual") {
      return isModeSala(st) ? "eventualidades" : "estadoActual";
    }
    if (inner === "eventualidades") return "estadoActual";
    return "estadoActual";
  }
  if (k === "t") {
    if (inner === "tend") return "cult";
    if (inner === "cult") return "tend";
    return "tend";
  }
  if (k === "d") return "datos";
  return null;
}
function runExpedienteShortcut(key) {
  var settings = typeof rt.getSettings === "function" ? rt.getSettings() : {};
  var current = getActiveInnerTab();
  var target = resolveExpedienteShortcutTarget(key, current, settings);
  if (!target) return false;
  if (target === migrateGranularInner(current || "todo", settings)) return true;
  switchInnerTab(target);
  return true;
}

// public/js/app-shell-tab-shortcuts.mjs
var DIGIT_APP_TABS = {
  1: "lab",
  2: "nota",
  3: "med",
  4: "agenda",
  5: "agenda"
};
var PASE_DIGIT_SECTIONS = {
  1: "labs",
  2: "expediente",
  3: "med",
  4: "agenda",
  5: "agenda"
};
function digitKeyAppTab(key) {
  return DIGIT_APP_TABS[key] || null;
}
function nextConsolidatedCompositeTab(currentComposite, visibleTabs) {
  var tabs = Array.isArray(visibleTabs) ? visibleTabs : [];
  if (!tabs.length) return null;
  var idx = tabs.indexOf(currentComposite);
  if (idx < 0) return tabs[0];
  return tabs[(idx + 1) % tabs.length];
}
function nextMedSubview(current) {
  return current === "perfil" ? "receta" : "perfil";
}
function nextMedOutputTab(current) {
  return current === "simple" ? "full" : "simple";
}
function currentExpedienteComposite(settings) {
  var inner = migrateGranularInner(getActiveInnerTab() || "todo", settings);
  return consolidatedInnerTabButtonId(inner, settings).replace(/^itab-/, "");
}
function openDigitTabFirst(key) {
  if (isPaseMode()) {
    var section = PASE_DIGIT_SECTIONS[key];
    if (section) openPaseSectionInNormal(section);
    return;
  }
  var tab = digitKeyAppTab(key);
  if (tab) switchAppTab(tab);
}
function cycleExpedienteComposite() {
  var settings = typeof rt.getSettings === "function" ? rt.getSettings() : {};
  var tabs = getConsolidatedTabs(settings);
  var current = currentExpedienteComposite(settings);
  var next = nextConsolidatedCompositeTab(current, tabs);
  if (!next) return;
  switchConsolidatedTab(next);
}
function cycleMedSubview() {
  var next = nextMedSubview(getMedSubview());
  setMedSubview(next);
}
function cycleMedOutputFormat() {
  if (getMedSubview() !== "receta") return;
  setMedOutputTab(nextMedOutputTab(medOutputTab));
}
function isOnDigitAppTab(key) {
  var tab = digitKeyAppTab(key);
  if (!tab) return false;
  var active = typeof rt.getActiveAppTab === "function" ? rt.getActiveAppTab() : "";
  if (active === "lan") active = "lab";
  return active === tab;
}
function runTabDigitShortcut(key) {
  if (!digitKeyAppTab(key)) return false;
  if (isOnDigitAppTab(key)) {
    if (key === "1") return true;
    if (key === "2") {
      cycleExpedienteComposite();
      return true;
    }
    if (key === "3") {
      cycleMedSubview();
      return true;
    }
    if (key === "4" || key === "5") {
      resetProcedureAgendaWeek();
      return true;
    }
    return true;
  }
  openDigitTabFirst(key);
  return true;
}
function runMedOutputTabShortcut() {
  if (typeof rt.getActiveAppTab === "function" && rt.getActiveAppTab() !== "med") {
    switchAppTab("med");
    return true;
  }
  if (getMedSubview() !== "receta") {
    setMedSubview("receta");
    return true;
  }
  cycleMedOutputFormat();
  return true;
}
function runMedTabShortcut() {
  return runTabDigitShortcut("3");
}
function runAgendaTabShortcut() {
  return runTabDigitShortcut("4");
}
function runAgendaWeekNavShortcut(delta) {
  if (typeof rt.getActiveAppTab === "function" && rt.getActiveAppTab() !== "agenda") {
    switchAppTab("agenda");
    return true;
  }
  navigateProcedureAgendaWeek(delta);
  return true;
}

// public/js/app-shell-keyboard.mjs
var shellKeyboardWired = false;
var WORK_MODE_SHORTCUTS = {
  g: "guardia",
  i: "interconsulta",
  p: "pase",
  s: "sala"
};
var shellWorkModeShortcutMap = Object.freeze({ ...WORK_MODE_SHORTCUTS });
function shellWorkModeForKey(key) {
  return WORK_MODE_SHORTCUTS[String(key || "").toLowerCase()] || null;
}
function shellShortcutFromTypingField(e) {
  var tag = e.target && e.target.tagName ? e.target.tagName.toUpperCase() : "";
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target && e.target.isContentEditable;
}
function noteTabNavigationShortcutUsed() {
  markTabShortcutsAdopted();
}
function handleShellSettingsCommaShortcut() {
  var bg = document.getElementById("settings-dropdown-backdrop");
  if (bg && bg.classList.contains("open")) shellCloseSettingsDropdown();
  else shellToggleSettingsDropdown();
}
function handleShellImportOverwriteShortcut(showToast) {
  window.__rpcPreferImportOverwrite = !window.__rpcPreferImportOverwrite;
  showToast(
    window.__rpcPreferImportOverwrite ? "Importaci\xF3n: conflictos \u2192 sobrescribir (\u2318\u21E7, o Ctrl+Shift+, de nuevo para apagar)." : "Importaci\xF3n: se preguntar\xE1 en cada conflicto.",
    window.__rpcPreferImportOverwrite ? "success" : "info"
  );
}
function handleShellWorkModeShortcut(key) {
  var mode = shellWorkModeForKey(key);
  if (!mode) return false;
  setWorkModeFromHeader(mode);
  return true;
}
function handleShellNamedShortcut(e, key) {
  if (key === "k" && !e.shiftKey && !e.altKey) {
    e.preventDefault();
    openCommandPaletteFromShell();
    return true;
  }
  if (key === "p" && e.shiftKey && !e.altKey) {
    e.preventDefault();
    toggleProfileSection();
    return true;
  }
  if (!e.shiftKey && !e.altKey && key === "m") {
    if (shellShortcutFromTypingField(e)) return false;
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runMedTabShortcut();
    return true;
  }
  if (!e.shiftKey && !e.altKey && key === "a") {
    if (shellShortcutFromTypingField(e)) return false;
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runAgendaTabShortcut();
    return true;
  }
  if (!e.shiftKey && !e.altKey && handleShellWorkModeShortcut(key)) {
    e.preventDefault();
    e.stopPropagation();
    return true;
  }
  if (!e.shiftKey && !e.altKey && isExpedienteShortcutKey(key)) {
    if (shellShortcutFromTypingField(e)) return false;
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runExpedienteShortcut(key);
    return true;
  }
  return false;
}
function handleShellCommaShortcut(e, showToast) {
  if (e.key !== ",") return false;
  if (shellShortcutFromTypingField(e)) return true;
  e.preventDefault();
  if (!e.shiftKey && !e.altKey) handleShellSettingsCommaShortcut();
  else if (e.shiftKey && !e.altKey) handleShellImportOverwriteShortcut(showToast);
  return true;
}
function onShellModifierKeydown(e, showToast) {
  if (isGuardiaMode()) return;
  var key = e.key.toLowerCase();
  if (e.shiftKey && !e.altKey && key === "3") {
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runMedOutputTabShortcut();
    return;
  }
  if (!e.shiftKey && !e.altKey && (key === "[" || key === "]")) {
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runAgendaWeekNavShortcut(key === "[" ? -1 : 1);
    return;
  }
  if (key === "1" || key === "2" || key === "3" || key === "4" || key === "5") {
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runTabDigitShortcut(key);
    return;
  }
  if (handleShellNamedShortcut(e, key)) return;
  handleShellCommaShortcut(e, showToast);
}
function initShellKeyboardShortcuts(showToast) {
  if (shellKeyboardWired) return;
  shellKeyboardWired = true;
  document.addEventListener(
    "keydown",
    function(e) {
      if (e.metaKey || e.ctrlKey) onShellModifierKeydown(e, showToast);
    },
    true
  );
}
function runShellModifierKeydownForTests(e, showToast) {
  onShellModifierKeydown(e, showToast);
}
export {
  initShellKeyboardShortcuts,
  runShellModifierKeydownForTests,
  shellWorkModeForKey,
  shellWorkModeShortcutMap
};
//# sourceMappingURL=/js/chunks/app-shell-keyboard-ITXHBIVX.js.map
