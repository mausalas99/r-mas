import {
  markTabShortcutsAdopted
} from "/mobile/js/chunks/chunk-FYBAQWT2.js";
import {
  navigateProcedureAgendaWeek,
  resetProcedureAgendaWeek
} from "/mobile/js/chunks/chunk-SVFWAHAX.js";
import {
  getActiveInnerTab,
  getMedSubview,
  medOutputTab,
  openPaseSectionInNormal,
  setMedOutputTab,
  setMedSubview,
  setWorkModeFromHeader,
  switchAppTab,
  switchConsolidatedTab,
  switchInnerTab,
  toggleProfileSection
} from "/mobile/js/chunks/chunk-SEU6G44G.js";
import "/mobile/js/chunks/chunk-5YKJH4WM.js";
import "/mobile/js/chunks/chunk-6PV3IFTY.js";
import "/mobile/js/chunks/chunk-47I3U5Q6.js";
import "/mobile/js/chunks/chunk-5AXDVMXS.js";
import {
  openPatientDatosModal,
  rt
} from "/mobile/js/chunks/chunk-L3ORSVMJ.js";
import {
  consolidatedInnerTabButtonId,
  getConsolidatedTabs,
  migrateGranularInner
} from "/mobile/js/chunks/chunk-PMGUO7FX.js";
import "/mobile/js/chunks/chunk-F3XP3RDZ.js";
import "/mobile/js/chunks/chunk-G4WZFQ3W.js";
import "/mobile/js/chunks/chunk-2JKGABV2.js";
import "/mobile/js/chunks/chunk-LHVAG7SJ.js";
import "/mobile/js/chunks/chunk-MVTHEUBE.js";
import "/mobile/js/chunks/chunk-WSJX2ILZ.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-QTYZ6UDY.js";
import "/mobile/js/chunks/chunk-6UYQDHFN.js";
import "/mobile/js/chunks/chunk-3GQWNHJN.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-2RS4OG65.js";
import "/mobile/js/chunks/chunk-CWSU7RSL.js";
import "/mobile/js/chunks/chunk-MQFCEJVU.js";
import "/mobile/js/chunks/chunk-7M7KYIIH.js";
import "/mobile/js/chunks/chunk-5NXKHEZO.js";
import "/mobile/js/chunks/chunk-KYJHH3SC.js";
import "/mobile/js/chunks/chunk-ZSZOVFSK.js";
import "/mobile/js/chunks/chunk-APH32TZA.js";
import "/mobile/js/chunks/chunk-BCJKJMLF.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-BC7GPMEI.js";
import "/mobile/js/chunks/chunk-A5EHINXR.js";
import "/mobile/js/chunks/chunk-CE75LS7G.js";
import "/mobile/js/chunks/chunk-EQA33PSX.js";
import "/mobile/js/chunks/chunk-GHYXKSAH.js";
import "/mobile/js/chunks/chunk-OXMUDSQA.js";
import "/mobile/js/chunks/chunk-3ETJLEUF.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-VLTPCB4L.js";
import "/mobile/js/chunks/chunk-JB63TG4Y.js";
import "/mobile/js/chunks/chunk-BZPGDWNR.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-HKGXY6ZZ.js";
import "/mobile/js/chunks/chunk-FVMS5JSH.js";
import "/mobile/js/chunks/chunk-CYT2QRK7.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-F5H6MC3T.js";
import "/mobile/js/chunks/chunk-FHX6BQST.js";
import {
  isGuardiaMode,
  isPaseMode
} from "/mobile/js/chunks/chunk-HHFYYXCN.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-C345P2AA.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-KNHJBTZ6.js";
import "/mobile/js/chunks/chunk-AQOFRLU7.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-XJ7JWVS5.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-6CH64UGD.js";
import "/mobile/js/chunks/chunk-PJKQGVLW.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";
import "/mobile/js/chunks/chunk-P32NKBWE.js";

// public/js/app-shell-lazy-panels.mjs
function importLazyRoutes() {
  return import("/mobile/js/chunks/lazy-feature-routes-M6YXD76H.js");
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
  void import("/mobile/js/chunks/command-palette-5VLAIL5E.js").then(function(mod) {
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
    if (shellShortcutFromTypingField(e)) return false;
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runMedTabShortcut();
    return true;
  }
  if (key === "a") {
    if (shellShortcutFromTypingField(e)) return false;
    e.preventDefault();
    noteTabNavigationShortcutUsed();
    runAgendaTabShortcut();
    return true;
  }
  return false;
}
function handleShellExpedienteShortcut(e, key) {
  if (e.shiftKey || e.altKey || !isExpedienteShortcutKey(key)) return false;
  if (shellShortcutFromTypingField(e)) return false;
  e.preventDefault();
  noteTabNavigationShortcutUsed();
  runExpedienteShortcut(key);
  return true;
}
function handleShellNamedShortcut(e, key) {
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
  if (isGuardiaMode()) return;
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
export {
  initShellKeyboardShortcuts,
  runShellModifierKeydownForTests,
  shellWorkModeForKey,
  shellWorkModeShortcutMap
};
//# sourceMappingURL=/js/chunks/app-shell-keyboard-HMQFAEUQ.js.map
