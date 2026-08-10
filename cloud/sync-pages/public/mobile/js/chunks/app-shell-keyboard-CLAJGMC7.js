import {
  markTabShortcutsAdopted
} from "/mobile/js/chunks/chunk-LHMN2PQX.js";
import {
  navigateProcedureAgendaWeek,
  resetProcedureAgendaWeek
} from "/mobile/js/chunks/chunk-KVG56MEH.js";
import {
  getActiveInnerTab,
  getMedSubview,
  medOutputTab,
  openPaseSectionInNormal,
  openPatientDatosModal,
  setMedOutputTab,
  setMedSubview,
  setWorkModeFromHeader,
  switchAppTab,
  switchConsolidatedTab,
  switchInnerTab,
  toggleProfileSection
} from "/mobile/js/chunks/chunk-SUHVKV2B.js";
import "/mobile/js/chunks/chunk-FQAQAHCP.js";
import "/mobile/js/chunks/chunk-DXT4XQM7.js";
import "/mobile/js/chunks/chunk-AGTBFRLI.js";
import "/mobile/js/chunks/chunk-R6FEF2OL.js";
import "/mobile/js/chunks/chunk-KWIGON6B.js";
import "/mobile/js/chunks/chunk-SERPYDDG.js";
import "/mobile/js/chunks/chunk-SPXDZARY.js";
import {
  consolidatedInnerTabButtonId,
  getConsolidatedTabs,
  migrateGranularInner
} from "/mobile/js/chunks/chunk-QGQYHCCP.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-OPWB7OTD.js";
import "/mobile/js/chunks/chunk-FGXLPOV7.js";
import "/mobile/js/chunks/chunk-YQDSERQQ.js";
import "/mobile/js/chunks/chunk-FRFJRB37.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-PZEHK5VE.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-3QKGKUYY.js";
import "/mobile/js/chunks/chunk-WF64SOAI.js";
import "/mobile/js/chunks/chunk-V25HP6NK.js";
import "/mobile/js/chunks/chunk-23D7ZB6I.js";
import "/mobile/js/chunks/chunk-3I74GVWN.js";
import "/mobile/js/chunks/chunk-VL2HB7CD.js";
import "/mobile/js/chunks/chunk-OGX35Y32.js";
import {
  isGuardiaMode,
  isPaseMode,
  toggleGuardiaMode
} from "/mobile/js/chunks/chunk-3O4YWJHW.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-EHHIMUZG.js";
import "/mobile/js/chunks/chunk-H66E52WF.js";
import "/mobile/js/chunks/chunk-IWCUDCPM.js";
import "/mobile/js/chunks/chunk-HNK3CY62.js";
import "/mobile/js/chunks/chunk-KYGE5G3V.js";
import "/mobile/js/chunks/chunk-D3ZABJHJ.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-F52EEXUB.js";
import "/mobile/js/chunks/chunk-GJK2JHBF.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-YSMCQRZC.js";
import "/mobile/js/chunks/chunk-AWQNHSEL.js";
import "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-BBXERARG.js";
import {
  rt
} from "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-3VLOKES3.js";
import "/mobile/js/chunks/chunk-TGGEFYRH.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";

// public/js/app-shell-lazy-panels.mjs
function importLazyRoutes() {
  return import("/mobile/js/chunks/lazy-feature-routes-7T2CWP4D.js");
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
  void import("/mobile/js/chunks/command-palette-B2I5M6JF.js").then(function(mod) {
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
  var k = String(key || "").toLowerCase();
  if (isGuardiaMode()) {
    toggleGuardiaMode();
    switchAppTab("nota");
  }
  var settings = typeof rt.getSettings === "function" ? rt.getSettings() : {};
  var current = getActiveInnerTab();
  var target = resolveExpedienteShortcutTarget(k, current, settings);
  if (!target) return false;
  if (k === "d") {
    openPatientDatosModal();
    return true;
  }
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
function leaveGuardiaForStandardNavigation() {
  if (!isGuardiaMode()) return;
  toggleGuardiaMode();
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
  leaveGuardiaForStandardNavigation();
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
  leaveGuardiaForStandardNavigation();
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
  leaveGuardiaForStandardNavigation();
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
function isShellSlashShortcut(e, key) {
  if (key === "/" || key === "?") return true;
  var code = e && e.code ? String(e.code) : "";
  return code === "Slash" || code === "NumpadDivide";
}
function noteTabNavigationShortcutUsed() {
  markTabShortcutsAdopted();
}
function openShortcutsModalFromShortcut() {
  void import("/mobile/js/chunks/shortcuts-modal-AAMJL5KS.js").then(function(mod) {
    if (typeof mod.openShortcutsModal === "function") mod.openShortcutsModal();
  });
}
function handleShellShortcutsSlashShortcut(e, key) {
  if (!isShellSlashShortcut(e, key)) return false;
  if (e.altKey) return false;
  e.preventDefault();
  openShortcutsModalFromShortcut();
  return true;
}
function handleShellSettingsCommaShortcut() {
  var bg = document.getElementById("settings-dropdown-backdrop");
  if (bg && bg.classList.contains("open")) shellCloseSettingsDropdown();
  else shellToggleSettingsDropdown();
}
function handleShellImportOverwriteShortcut(showToast) {
  window.__rpcPreferImportOverwrite = !window.__rpcPreferImportOverwrite;
  showToast(
    window.__rpcPreferImportOverwrite ? "Importaci\xF3n: conflictos \u2192 sobrescribir (\u2318\u21E7, o Ctrl+Shift+, de nuevo para apagar)." : "Importaci\xF3n: conflictos \u2192 se preguntar\xE1 en cada conflicto.",
    window.__rpcPreferImportOverwrite ? "success" : "info"
  );
}
function handleShellWorkModeShortcut(key) {
  var mode = shellWorkModeForKey(key);
  if (!mode) return false;
  setWorkModeFromHeader(mode);
  return true;
}
function handleShellPaletteShortcut(e, key) {
  if (key !== "k" || e.shiftKey || e.altKey) return false;
  e.preventDefault();
  openCommandPaletteFromShell();
  return true;
}
function handleShellProfileShortcut(e, key) {
  if (key !== "p" || !e.shiftKey || e.altKey) return false;
  e.preventDefault();
  toggleProfileSection();
  return true;
}
function handleShellTabLetterShortcut(e, key) {
  if (e.shiftKey || e.altKey) return false;
  if (key === "m") {
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runMedTabShortcut();
    return true;
  }
  if (key === "a") {
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runAgendaTabShortcut();
    return true;
  }
  return false;
}
function handleShellExpedienteShortcut(e, key) {
  if (e.shiftKey || e.altKey || !isExpedienteShortcutKey(key)) return false;
  e.preventDefault();
  noteTabNavigationShortcutUsed();
  runExpedienteShortcut(key);
  return true;
}
function handleShellNamedShortcut(e, key) {
  if (handleShellShortcutsSlashShortcut(e, key)) return true;
  if (handleShellPaletteShortcut(e, key)) return true;
  if (handleShellProfileShortcut(e, key)) return true;
  if (handleShellTabLetterShortcut(e, key)) return true;
  if (!e.shiftKey && !e.altKey && handleShellWorkModeShortcut(key)) {
    e.preventDefault();
    e.stopPropagation();
    return true;
  }
  return handleShellExpedienteShortcut(e, key);
}
function handleShellCommaShortcut(e, showToast) {
  if (e.key !== ",") return false;
  if (shellShortcutFromTypingField(e)) return true;
  e.preventDefault();
  if (!e.shiftKey && !e.altKey) handleShellSettingsCommaShortcut();
  else if (e.shiftKey && !e.altKey) handleShellImportOverwriteShortcut(showToast);
  return true;
}
function handleShellDigitTabShortcut(e, key) {
  if (e.shiftKey || e.altKey) return false;
  if (key !== "1" && key !== "2" && key !== "3" && key !== "4" && key !== "5") return false;
  e.preventDefault();
  noteTabNavigationShortcutUsed();
  runTabDigitShortcut(key);
  return true;
}
function handleShellAgendaNavShortcut(e, key) {
  if (e.shiftKey || e.altKey) return false;
  if (key !== "[" && key !== "]") return false;
  e.preventDefault();
  noteTabNavigationShortcutUsed();
  runAgendaWeekNavShortcut(key === "[" ? -1 : 1);
  return true;
}
function handleShellMedOutputShortcut(e, key) {
  if (!e.shiftKey || e.altKey || key !== "3") return false;
  e.preventDefault();
  noteTabNavigationShortcutUsed();
  runMedOutputTabShortcut();
  return true;
}
function onShellModifierKeydown(e, showToast) {
  var key = e.key.toLowerCase();
  if (handleShellMedOutputShortcut(e, key)) return;
  if (handleShellAgendaNavShortcut(e, key)) return;
  if (handleShellDigitTabShortcut(e, key)) return;
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
function isShellSlashShortcutForTests(e, key) {
  return isShellSlashShortcut(e, key);
}
export {
  initShellKeyboardShortcuts,
  isShellSlashShortcutForTests,
  runShellModifierKeydownForTests,
  shellWorkModeForKey,
  shellWorkModeShortcutMap
};
//# sourceMappingURL=/js/chunks/app-shell-keyboard-CLAJGMC7.js.map
