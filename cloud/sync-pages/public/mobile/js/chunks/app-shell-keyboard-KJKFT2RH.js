import {
  markTabShortcutsAdopted
} from "/mobile/js/chunks/chunk-MH45NP7L.js";
import {
  navigateProcedureAgendaWeek,
  resetProcedureAgendaWeek
} from "/mobile/js/chunks/chunk-PEXPCXQA.js";
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
} from "/mobile/js/chunks/chunk-46QO3ZUY.js";
import "/mobile/js/chunks/chunk-IXAK2IU3.js";
import "/mobile/js/chunks/chunk-AIIT754E.js";
import "/mobile/js/chunks/chunk-CXMRZLXS.js";
import "/mobile/js/chunks/chunk-AS6TAICA.js";
import "/mobile/js/chunks/chunk-K45GC3VK.js";
import "/mobile/js/chunks/chunk-VOW7QFKJ.js";
import "/mobile/js/chunks/chunk-RJIPR6CF.js";
import "/mobile/js/chunks/chunk-2JKGABV2.js";
import "/mobile/js/chunks/chunk-2VZA33PI.js";
import "/mobile/js/chunks/chunk-EPFF77ND.js";
import "/mobile/js/chunks/chunk-UTZ3BFGA.js";
import "/mobile/js/chunks/chunk-3RXBEWAZ.js";
import "/mobile/js/chunks/chunk-XS64SPAO.js";
import "/mobile/js/chunks/chunk-LOGJB72W.js";
import {
  currentLabInner,
  switchLabInner
} from "/mobile/js/chunks/chunk-44QBSWO4.js";
import {
  LAB_INNER_SECTIONS
} from "/mobile/js/chunks/chunk-KEFN326O.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-5DAE7PK3.js";
import "/mobile/js/chunks/chunk-6A62XDR6.js";
import "/mobile/js/chunks/chunk-MOSUQW6R.js";
import "/mobile/js/chunks/chunk-BGYDWUEW.js";
import {
  copyTableText
} from "/mobile/js/chunks/chunk-7EPXWU6A.js";
import "/mobile/js/chunks/chunk-JIKZNXZR.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-TR2JMMVG.js";
import "/mobile/js/chunks/chunk-23D7ZB6I.js";
import "/mobile/js/chunks/chunk-AYK2RJF5.js";
import "/mobile/js/chunks/chunk-7TWBBTNK.js";
import "/mobile/js/chunks/chunk-AA7ORONM.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-YUEMH3I3.js";
import "/mobile/js/chunks/chunk-IGOCX3DQ.js";
import "/mobile/js/chunks/chunk-M6MLPK4W.js";
import {
  openPatientDatosModal
} from "/mobile/js/chunks/chunk-4QI24DFU.js";
import {
  consolidatedInnerTabButtonId,
  getConsolidatedTabs,
  migrateGranularInner
} from "/mobile/js/chunks/chunk-ZVJAFSHG.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import {
  formatLabsForCensoCompact,
  formatPatientNameForCenso
} from "/mobile/js/chunks/chunk-AVZ5WV63.js";
import "/mobile/js/chunks/chunk-NPWWQWKW.js";
import "/mobile/js/chunks/chunk-KESF4FLC.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-3PL7T3ZN.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-7FIP2ETS.js";
import "/mobile/js/chunks/chunk-CZ2M277B.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-JBHSWL2Z.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-BUGU4R5K.js";
import {
  isGuardiaMode,
  isPaseMode,
  toggleGuardiaMode
} from "/mobile/js/chunks/chunk-4SMSHN53.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-P7EHNYUF.js";
import "/mobile/js/chunks/chunk-S2E4QGRL.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-NC6VRD7M.js";
import "/mobile/js/chunks/chunk-5RUR3UQW.js";
import "/mobile/js/chunks/chunk-C4OBKXWW.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-VVADIT4K.js";
import "/mobile/js/chunks/chunk-HDD2EUC6.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-VRNWC4P2.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-KZT7D6I2.js";
import {
  rt
} from "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-EE5CSOUC.js";
import "/mobile/js/chunks/chunk-WTVHUFEL.js";
import {
  getLabHistory,
  getPatients
} from "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-75QM3TGW.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-NPUSZB5W.js";

// public/js/app-shell-lazy-panels.mjs
function importLazyRoutes() {
  return import("/mobile/js/chunks/lazy-feature-routes-SSSCCZIU.js");
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
  void import("/mobile/js/chunks/command-palette-PZRZPN2J.js").then(function(mod) {
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
  if (k === "t") {
    switchLabInner(target);
    return true;
  }
  if (target === migrateGranularInner(current || "todo", settings)) return true;
  switchInnerTab(target);
  return true;
}

// public/js/app-shell-tab-shortcuts.mjs
var DIGIT_APP_TABS = {
  1: "nota",
  2: "lab",
  3: "med",
  4: "agenda",
  5: "agenda"
};
var PASE_DIGIT_SECTIONS = {
  1: "resumen",
  2: "labs",
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
function nextLabInnerSection(current) {
  var tabs = LAB_INNER_SECTIONS;
  var idx = tabs.indexOf(current);
  if (idx < 0) return tabs[0];
  return tabs[(idx + 1) % tabs.length];
}
function currentExpedienteComposite(settings) {
  var inner = migrateGranularInner(getActiveInnerTab() || "todo", settings);
  return consolidatedInnerTabButtonId(inner, settings).replace(/^itab-/, "");
}
function leaveGuardiaForStandardNavigation() {
  if (!isGuardiaMode()) return;
  toggleGuardiaMode();
}
function dismissOverlaysForResumenHome() {
  var win = typeof window !== "undefined" ? window : null;
  if (!win) return;
  if (typeof win.closeEstadoActualRegistroModal === "function") {
    win.closeEstadoActualRegistroModal();
  }
  if (typeof win.closeCommandPalette === "function") win.closeCommandPalette();
  if (typeof win.closeShortcutsModal === "function") win.closeShortcutsModal();
}
function runResumenHomeShortcut() {
  leaveGuardiaForStandardNavigation();
  dismissOverlaysForResumenHome();
  if (typeof document === "undefined") return true;
  if (isPaseMode()) {
    openPaseSectionInNormal("resumen");
    return true;
  }
  switchInnerTab("resumen");
  return true;
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
function cycleLabInner() {
  var next = nextLabInnerSection(currentLabInner());
  if (next) switchLabInner(next);
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
    if (key === "1") {
      cycleExpedienteComposite();
      return true;
    }
    if (key === "2") {
      cycleLabInner();
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
function runAgendaWeekNavShortcut(delta) {
  leaveGuardiaForStandardNavigation();
  if (typeof rt.getActiveAppTab === "function" && rt.getActiveAppTab() !== "agenda") {
    switchAppTab("agenda");
    return true;
  }
  navigateProcedureAgendaWeek(delta);
  return true;
}

// public/js/features/patients-list/copy-team-labs.mjs
function buildTeamLabsCopyText() {
  var pinned = getPatients().filter(function(p) {
    return p && p.pinned;
  });
  var blocks = [];
  pinned.forEach(function(p) {
    var lines = formatLabsForCensoCompact(getLabHistory(p.id) || []);
    if (!lines.length) return;
    blocks.push(formatPatientNameForCenso(p.nombre) + "\n" + lines.join("\n"));
  });
  return { text: blocks.join("\n\n"), patientCount: pinned.length, labCount: blocks.length };
}
function copyTeamLabsForToday(showToast) {
  var built = buildTeamLabsCopyText();
  if (!built.text) {
    showToast("No hay laboratorios de hoy en los pacientes fijados.", "info");
    return;
  }
  copyTableText(built.text, function(ok) {
    showToast(
      ok ? "Laboratorios copiados (" + built.labCount + " de " + built.patientCount + " fijados)." : "No se pudo copiar los laboratorios.",
      ok ? "success" : "error"
    );
  });
}

// public/js/app-shell-keyboard.mjs
var shellKeyboardWired = false;
var lastShellShortcutAt = 0;
var lastShellShortcutSig = "";
var CODE_TO_KEY = {
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Numpad1: "1",
  Numpad2: "2",
  Numpad3: "3",
  Numpad4: "4",
  Numpad5: "5",
  KeyE: "e",
  KeyT: "t",
  KeyD: "d",
  KeyM: "m",
  KeyG: "g",
  KeyI: "i",
  KeyP: "p",
  KeyS: "s",
  KeyK: "k",
  KeyN: "n",
  KeyC: "c",
  Slash: "/",
  Comma: ",",
  BracketLeft: "[",
  BracketRight: "]",
  Enter: "enter",
  NumpadEnter: "enter"
};
function normalizeShellShortcutKey(e) {
  var code = e && e.code ? String(e.code) : "";
  if (CODE_TO_KEY[code]) return CODE_TO_KEY[code];
  return String(e && e.key || "").toLowerCase();
}
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
  void import("/mobile/js/chunks/shortcuts-modal-B6KZ23A3.js").then(function(mod) {
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
function handleShellCopyTeamLabsShortcut(e, key, showToast) {
  if (key !== "c" || !e.shiftKey || e.altKey) return false;
  e.preventDefault();
  copyTeamLabsForToday(showToast);
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
function handleShellResumenHomeShortcut(e, key) {
  if (e.shiftKey || e.altKey) return false;
  if (key !== "enter") return false;
  e.preventDefault();
  e.stopPropagation();
  noteTabNavigationShortcutUsed();
  runResumenHomeShortcut();
  return true;
}
function onShellModifierKeydown(e, showToast) {
  var key = normalizeShellShortcutKey(e);
  if (!key) return;
  var sig = key + ":" + (e.shiftKey ? "1" : "0");
  var now = Date.now();
  if (sig === lastShellShortcutSig && now - lastShellShortcutAt < 80) return;
  lastShellShortcutAt = now;
  lastShellShortcutSig = sig;
  if (handleShellResumenHomeShortcut(e, key)) return;
  if (handleShellMedOutputShortcut(e, key)) return;
  if (handleShellAgendaNavShortcut(e, key)) return;
  if (handleShellDigitTabShortcut(e, key)) return;
  if (handleShellCopyTeamLabsShortcut(e, key, showToast)) return;
  if (handleShellNamedShortcut(e, key)) return;
  handleShellCommaShortcut(e, showToast);
}
function payloadToKeyEvent(payload) {
  return {
    key: payload && payload.key,
    code: payload && payload.code,
    metaKey: true,
    ctrlKey: !!(payload && payload.control),
    shiftKey: !!(payload && payload.shift),
    altKey: !!(payload && payload.alt),
    preventDefault: function() {
    },
    stopPropagation: function() {
    },
    target: typeof document !== "undefined" ? document.activeElement || document.body : {}
  };
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
  var api = typeof window !== "undefined" ? window.electronAPI : null;
  if (api && typeof api.onShellShortcut === "function") {
    api.onShellShortcut(function(payload) {
      onShellModifierKeydown(payloadToKeyEvent(payload), showToast);
    });
  }
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
  normalizeShellShortcutKey,
  runShellModifierKeydownForTests,
  shellWorkModeForKey,
  shellWorkModeShortcutMap
};
//# sourceMappingURL=/js/chunks/app-shell-keyboard-KJKFT2RH.js.map
