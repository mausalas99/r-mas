import {
  loadSettings,
  registerDocumentExportRuntime,
  renderPatientList,
  renderRoundOverviewPanels,
  saveOutputDirSelection
} from "/mobile/js/chunks/chunk-46QO3ZUY.js";
import {
  renderGuardiaBoard,
  renderGuardiaCensusGrid,
  syncGuardiaCensusPanelVisibility,
  syncGuardiaModeButtonVisibility
} from "/mobile/js/chunks/chunk-AVZ5WV63.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-JBHSWL2Z.js";
import {
  isGuardiaMode,
  isPaseMode,
  syncHeaderModeSeg,
  syncPaseReturnHeaderBtn
} from "/mobile/js/chunks/chunk-4SMSHN53.js";
import {
  scheduleCloudSyncPush
} from "/mobile/js/chunks/chunk-P7EHNYUF.js";
import {
  getPatients,
  persistClinicalState
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  dateInputValueToAccesoFecha,
  ensurePatientAccesos,
  syncLegacyAccesoFields
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";

// public/js/app-shell-deferred.mjs
function importLazyRoutes() {
  return import("/mobile/js/chunks/lazy-feature-routes-SSSCCZIU.js");
}
function _rpcDeferInit(fn) {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(
      function() {
        try {
          fn();
        } catch (e) {
          console.error("deferInit error:", e && e.message);
        }
      },
      { timeout: 1500 }
    );
  } else {
    setTimeout(function() {
      try {
        fn();
      } catch (e) {
        console.error("deferInit error:", e && e.message);
      }
    }, 200);
  }
}
function installClinicalAppShell() {
  if (typeof window === "undefined") return;
  window.appShell = window.appShell || {};
  void importLazyRoutes().then(function(routes) {
    return routes.ensureEntregaLoaded();
  }).then(function(mod) {
    window.appShell.openEntregaModal = mod.openEntregaModal;
  });
}
function deferMobileWebBoot_() {
  void import("/mobile/js/chunks/app-shell-mobile-boot-SJ745BO7.js").then(function(mod) {
    return mod.initMobileWebBoot();
  });
}
function scheduleDeferredShellInits(_showToast) {
  _rpcDeferInit(installClinicalAppShell);
  _rpcDeferInit(function() {
    void import("/mobile/js/chunks/paste-smart-2NBVKEOY.js").then(function(mod) {
      mod.initPasteSmart();
    });
  });
  _rpcDeferInit(function() {
    void importLazyRoutes().then(function(routes) {
      return routes.ensurePlatformLoaded();
    }).then(function(mod) {
      mod.initGoalGFeatures();
    });
  });
  _rpcDeferInit(function() {
    void importLazyRoutes().then(function(routes) {
      return routes.ensureSettingsHelpLoaded();
    }).then(function(mod) {
      mod.initGuidedTourGate();
    });
  });
  if (isMobileWeb()) {
    deferMobileWebBoot_();
  } else {
    _rpcDeferInit(deferMobileWebBoot_);
  }
  _rpcDeferInit(function() {
    void importLazyRoutes().then(function(routes) {
      return routes.ensurePlatformLoaded();
    }).then(function(mod) {
      mod.initRpcServerHealthWatch();
      mod.initIdleLockFeature();
    });
  });
}
function scheduleDeferredUiInits(showToast2) {
  _rpcDeferInit(function() {
    void import("/mobile/js/chunks/productivity-RJD35GHI.js").then(function(mod) {
      mod.initProductivityKeyboardShortcuts();
    });
  });
  void import("/mobile/js/chunks/app-shell-keyboard-KJKFT2RH.js").then(function(mod) {
    mod.initShellKeyboardShortcuts(showToast2);
  });
  void import("/mobile/js/chunks/keyboard-shortcuts-nudge-FSEYYIHZ.js").then(function(mod) {
    mod.initKeyboardShortcutsNudge(showToast2);
  });
}

// public/js/app-shell-patient-update.mjs
function touchPatientLanUpdatedAt(pid) {
  const p = getPatients().find(function(row) {
    return String(row.id) === String(pid);
  });
  if (p) p.lanUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
}
function normalizePatientFieldValue(field, value) {
  if (field === "nombre" || field === "area" || field === "servicio") {
    return String(value || "").toUpperCase();
  }
  if (field === "sala") {
    return String(value || "").trim();
  }
  if (field === "fiuxFecha" || field === "fimiFecha") {
    return dateInputValueToAccesoFecha(value) || String(value || "").trim();
  }
  return value;
}
function applyPatientAccesoField(p, field, next) {
  if (field !== "viaAcceso" && field !== "accesoFecha") return;
  ensurePatientAccesos(p);
  var accRow = p.accesosList.find(function(a) {
    return String(a && a.via || "").trim();
  }) || p.accesosList[0];
  if (field === "viaAcceso") accRow.via = String(next || "").trim();
  else accRow.fecha = String(next || "").trim();
  syncLegacyAccesoFields(p);
}
function createPatientUpdateHandler(shellCtx2, syncWorkContextChrome2) {
  function refreshPatientChromeAfterUpdate() {
    persistClinicalState();
    renderPatientList();
    syncWorkContextChrome2();
    if (!isPaseMode()) return;
    void import("/mobile/js/chunks/pase-board-3ZLZ4D43.js").then(function(mod) {
      mod.renderPaseBoard();
    });
    renderRoundOverviewPanels();
    if (shellCtx2.getActiveAppTab() === "agenda") {
      void import("/mobile/js/chunks/agenda-FO5KIVZX.js").then(function(mod) {
        mod.renderProcedureAgendaPanel();
      });
    }
  }
  function updatePatient(field, value) {
    if (shellCtx2.getActiveId() == null) return;
    var pid = String(shellCtx2.getActiveId());
    var p = getPatients().find(function(pl) {
      return String(pl.id) === pid;
    });
    if (!p) return;
    var next = normalizePatientFieldValue(field, value);
    if (String(p[field] || "") === String(next || "")) return;
    p[field] = next;
    applyPatientAccesoField(p, field, next);
    touchPatientLanUpdatedAt(pid);
    refreshPatientChromeAfterUpdate();
    scheduleCloudSyncPush();
  }
  return { updatePatient };
}

// public/js/app-shell.mjs
var showToastImpl = null;
var showToastLoadPromise = null;
function loadShowToast() {
  if (showToastImpl) return Promise.resolve(showToastImpl);
  if (!showToastLoadPromise) {
    showToastLoadPromise = import("/mobile/js/chunks/ui-toast-CE4H4ZYJ.js").then(function(mod) {
      showToastImpl = mod.showToast;
      return showToastImpl;
    });
  }
  return showToastLoadPromise;
}
function showToast(msg, type) {
  if (showToastImpl) {
    showToastImpl(msg, type);
    return;
  }
  void loadShowToast().then(function(fn) {
    fn(msg, type);
  });
}
if (typeof window !== "undefined") {
  window.showToast = showToast;
  window.__hybridDemoSheet = function() {
    return import("/mobile/js/chunks/ui-overlay-JVLKSHDG.js").then(function(mod) {
      return mod.mountHybridDemoSheet();
    });
  };
}
var shellCtx = {
  getActiveId() {
    return null;
  },
  getActiveAppTab() {
    return "nota";
  },
  getActiveInner() {
    return "resumen";
  },
  getSettings() {
    return {};
  }
};
function initModalDismiss() {
  void import("/mobile/js/chunks/app-shell-modals-4IF3W5Z5.js").then(function(mod) {
    mod.initModalDismiss();
  });
}
function quickExportCurrentPatientLazy() {
  var args = arguments;
  void import("/mobile/js/chunks/clinical-quick-export-WW3J2LJA.js").then(function(mod) {
    mod.quickExportCurrentPatient.apply(null, args);
  });
}
function registerAppShellContext(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(shellCtx, ctx);
  void import("/mobile/js/chunks/command-palette-PZRZPN2J.js").then(function(mod) {
    mod.setCommandPaletteContext(shellCtx);
  });
  wireShellExportRuntimes();
}
function wireShellExportRuntimes() {
  registerDocumentExportRuntime({
    showToast,
    getSettings: function() {
      return shellCtx.getSettings();
    },
    loadSettings
  });
  void import("/mobile/js/chunks/clinical-quick-export-WW3J2LJA.js").then(function(mod) {
    mod.registerClinicalQuickExportRuntime({
      getActiveId: function() {
        return shellCtx.getActiveId();
      },
      getActiveInner: function() {
        return shellCtx.getActiveInner();
      },
      getSettings: function() {
        return shellCtx.getSettings();
      },
      showToast
    });
  });
}
function syncActivePatientContextBar() {
}
function syncMedPatientGate() {
  var empty = document.getElementById("med-empty-guided");
  var shell = document.getElementById("med-active-shell");
  if (!empty || !shell) return;
  var showEmpty = shellCtx.getActiveAppTab() === "med" && !shellCtx.getActiveId();
  empty.style.display = showEmpty ? "flex" : "none";
  shell.style.display = showEmpty ? "none" : "flex";
}
function setMedTabAttention(on) {
  var tab = document.getElementById("apptab-med");
  if (tab) tab.classList.toggle("app-tab-attention", !!on);
}
function syncWorkContextChrome() {
  syncActivePatientContextBar();
  syncHeaderModeSeg();
  syncMedPatientGate();
  syncPaseReturnHeaderBtn();
  syncGuardiaModeButtonVisibility();
  syncGuardiaCensusPanelVisibility(shellCtx.getSettings());
  renderGuardiaCensusGrid(shellCtx.getSettings());
  if (isGuardiaMode()) renderGuardiaBoard(shellCtx.getSettings());
  void import("/mobile/js/chunks/header-context-62X6LTTL.js").then(function(mod) {
    mod.syncHeaderContext(shellCtx);
  });
}
function chooseOutputDir() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
    showToast("Funci\xF3n no disponible en este entorno", "error");
    return;
  }
  window.electronAPI.selectOutputDir().then(function(dir) {
    if (!dir) return;
    saveOutputDirSelection(dir);
    showToast("Carpeta actualizada \u2713", "success");
  });
}
function onDefaultServicioBlur() {
  var el = document.getElementById("settings-default-servicio");
  if (!el) return;
  var v = (el.value || "").trim().toUpperCase();
  el.value = v;
  shellCtx.getSettings().defaultServicio = v;
  localStorage.setItem("rpc-settings", JSON.stringify(shellCtx.getSettings()));
  var w = document.getElementById("default-servicio-warning");
  var looksAbbrev = v.length > 0 && v.length <= 3 && /^[A-Z]+$/.test(v);
  if (w) w.style.display = looksAbbrev ? "block" : "none";
}
function onMedicoTemplateBlur() {
  var keys = ["profesor", "r4", "r2", "r1a", "r1b"];
  var tpl = {};
  keys.forEach(function(k) {
    var inp = document.getElementById("settings-medico-" + k);
    tpl[k] = inp ? (inp.value || "").trim() : "";
  });
  shellCtx.getSettings().medicosPlantilla = tpl;
  localStorage.setItem("rpc-settings", JSON.stringify(shellCtx.getSettings()));
}
var patientHandlers = createPatientUpdateHandler(shellCtx, syncWorkContextChrome);
function rpcPrefersReducedMotion() {
  try {
    return typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
var appShellWindowHandlers = {
  onDefaultServicioBlur,
  onMedicoTemplateBlur,
  chooseOutputDir,
  updatePatient: patientHandlers.updatePatient,
  quickExportCurrentPatient: quickExportCurrentPatientLazy
};
function scheduleDeferredShellInits2() {
  scheduleDeferredShellInits(showToast);
}
function scheduleDeferredUiInits2() {
  scheduleDeferredUiInits(showToast);
}

export {
  showToast,
  initModalDismiss,
  registerAppShellContext,
  setMedTabAttention,
  syncWorkContextChrome,
  rpcPrefersReducedMotion,
  appShellWindowHandlers,
  scheduleDeferredShellInits2 as scheduleDeferredShellInits,
  scheduleDeferredUiInits2 as scheduleDeferredUiInits
};
//# sourceMappingURL=/js/chunks/chunk-EWWNT4SH.js.map
