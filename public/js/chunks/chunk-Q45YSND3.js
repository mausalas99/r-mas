import {
  applyTourDemoPatientBundle,
  hideTourDock,
  hideTourIntroModal,
  isPresentationModeActive,
  publishTourGuardContext,
  registerTourDemoPatientHooks,
  resetAndStartOnboarding,
  resetTourUiBeforeResume,
  scheduleTourDemoPatientRegistrationFromLab,
  showTourDock,
  startOnboarding,
  startPresentationMode,
  stopPresentationMode,
  syncTourDockPlacement,
  tourBridge,
  tourState
} from "/js/chunks/chunk-5DCSUK5Q.js";
import {
  getFirstStepIdForChapter
} from "/js/chunks/chunk-QZXLPUPG.js";
import {
  settingsHelpBridge
} from "/js/chunks/chunk-6IT4VYWH.js";
import {
  closeSettingsDropdown,
  ensureSettingsDropdownOpen,
  expandSettingsAccordionBackupSync
} from "/js/chunks/chunk-I6ZAD2UB.js";
import {
  getSettingsHelpRuntime
} from "/js/chunks/chunk-6LZ7QLYS.js";

// public/js/features/settings-help/tour-mini.mjs
var rt = getSettingsHelpRuntime();
var SETTINGS_MINI_TOUR_STEPS = [
  {
    badge: "Ajustes \xB7 panel",
    body: "Abrimos el panel de <strong>Ajustes</strong> (icono \u2699 arriba a la derecha). Desde aqu\xED defines la <strong>carpeta de documentos</strong> y el <strong>formato de Salida r\xE1pida</strong> (docx / html / txt) para el paciente activo.",
    before: function() {
      ensureSettingsDropdownOpen();
    }
  },
  {
    badge: "Ajustes \xB7 respaldo",
    body: "<strong>Copias de seguridad</strong>: exporta todo, solo al paciente activo, un rango de fechas, o activa la <strong>copia autom\xE1tica</strong> (hasta 14 snapshots locales rotativos).",
    before: function() {
      ensureSettingsDropdownOpen();
      expandSettingsAccordionBackupSync();
    }
  },
  {
    badge: "Ajustes \xB7 sync",
    body: "Si usas R+ en m\xE1s de un equipo, el <strong>Paquete sync</strong> intercambia JSON cifrados con passphrase y combina cambios sin pisar lo que ya ten\xEDas.",
    before: function() {
      ensureSettingsDropdownOpen();
      expandSettingsAccordionBackupSync();
    }
  },
  {
    badge: "Ajustes \xB7 datos",
    body: "En <strong>Datos en esta computadora</strong> puedes abrir la carpeta del perfil donde Electron guarda pacientes y notas. No compartas esa carpeta si contiene informaci\xF3n sensible.",
    before: function() {
      ensureSettingsDropdownOpen();
    }
  },
  {
    badge: "Ajustes \xB7 aplicaci\xF3n",
    body: "Arriba del panel est\xE1 el acceso directo al <strong>centro de ayuda</strong>. En <strong>Aplicaci\xF3n</strong> (secci\xF3n inferior) ves la versi\xF3n y puedes <strong>buscar actualizaciones</strong>.",
    before: function() {
      ensureSettingsDropdownOpen();
    }
  }
];
var LAB_MINI_TOUR_STEPS = [
  {
    badge: "Laboratorio \xB7 pegar",
    body: "Est\xE1s en la pesta\xF1a <strong>Laboratorio</strong>. Pega el reporte del laboratorio en el cuadro de texto. R+ reconoce biometr\xEDa, qu\xEDmica, electrolitos, gasometr\xEDa, pruebas hep\xE1ticas y m\xE1s.",
    before: function() {
      rt.switchAppTab("lab");
    }
  },
  {
    badge: "Laboratorio \xB7 procesar",
    body: "Pulsa <strong>Procesar</strong>: R+ genera diagramas autom\xE1ticos (Gamble, BH, Qu\xEDmica, Coagulaci\xF3n\u2026) y una tabla de resultados con los valores alterados resaltados en rojo.",
    before: function() {
      rt.switchAppTab("lab");
    }
  },
  {
    badge: "Laboratorio \xB7 copiar",
    body: "Tras procesar, usa el bot\xF3n flotante <strong>Copiar</strong> o el de cada diagrama. Con paciente activo, los resultados quedan en historial y en el expediente.",
    before: function() {
      rt.switchAppTab("lab");
    },
    dockLeft: true
  },
  {
    badge: "Laboratorio \xB7 tendencias",
    body: "Cada laboratorio procesado con paciente activo se guarda con su fecha. Con dos o m\xE1s labs aparecen mini-gr\xE1ficas en <strong>Expediente \u2192 Tendencias</strong>.",
    before: function() {
      rt.switchAppTab("lab");
    }
  },
  {
    badge: "Laboratorio \xB7 historial",
    body: "En <strong>Resultados</strong>, el selector de fechas cambia entre env\xEDos guardados del paciente activo. El men\xFA <strong>\u22EF</strong> permite copiar varios d\xEDas, consolidar env\xEDos del mismo d\xEDa, reprocesar o eliminar una entrada.",
    before: function() {
      rt.switchAppTab("lab");
    }
  },
  {
    badge: "Evoluci\xF3n \xB7 SOAP y medicamentos",
    body: "En <strong>Expediente \u2192 Notas</strong> usa la <strong>plantilla SOAP</strong> para p\xE1rrafos estructurados. La pesta\xF1a <strong>Medicamentos</strong> importa la receta del hospital y puede mandar dosis a SOAP o al tratamiento.",
    before: function() {
      rt.switchAppTab("nota");
    }
  }
];
function startMiniTour(kind) {
  if (tourState.guidedTourActive) {
    rt.showToast("Finaliza el tutorial actual antes de iniciar un recorrido breve.", "error");
    return;
  }
  var steps = null;
  if (kind === "ajustes") steps = SETTINGS_MINI_TOUR_STEPS;
  else if (kind === "lab") steps = LAB_MINI_TOUR_STEPS;
  if (!steps || !steps.length) return;
  settingsHelpBridge.closeQuickHelp();
  tourState.miniTourActive = true;
  tourState.miniTourSteps = steps;
  tourState.miniTourIdx = 0;
  publishTourGuardContext();
  showTourDock();
  renderMiniTourStep();
}
function renderMiniTourStep() {
  if (!tourState.miniTourActive || !tourState.miniTourSteps) return;
  var step = tourState.miniTourSteps[tourState.miniTourIdx];
  if (!step) {
    endMiniTour();
    return;
  }
  if (typeof step.before === "function") {
    try {
      step.before();
    } catch (_err) {
    }
  }
  var badge = document.getElementById("tour-step-badge");
  var body = document.getElementById("tour-dock-body");
  var nextBtn = document.getElementById("tour-btn-next");
  var skipBtn = document.querySelector("#tour-dock .btn-tour-skip");
  if (badge) {
    badge.textContent = step.badge + " \xB7 " + (tourState.miniTourIdx + 1) + " / " + tourState.miniTourSteps.length;
  }
  if (body) body.innerHTML = step.body;
  if (nextBtn) {
    nextBtn.style.display = "";
    nextBtn.disabled = false;
    nextBtn.textContent = tourState.miniTourIdx === tourState.miniTourSteps.length - 1 ? "Finalizar" : "Siguiente";
  }
  if (skipBtn) skipBtn.textContent = "Cerrar recorrido";
  syncTourDockPlacement();
}
function miniTourNext() {
  if (!tourState.miniTourActive) return;
  if (tourState.miniTourIdx >= (tourState.miniTourSteps ? tourState.miniTourSteps.length : 0) - 1) {
    endMiniTour();
    return;
  }
  tourState.miniTourIdx++;
  renderMiniTourStep();
}
function endMiniTour() {
  tourState.miniTourActive = false;
  tourState.miniTourSteps = null;
  tourState.miniTourIdx = 0;
  publishTourGuardContext();
  hideTourDock();
  var skipBtn = document.querySelector("#tour-dock .btn-tour-skip");
  if (skipBtn) skipBtn.textContent = "Omitir tutorial";
}
function startHelpTourMain() {
  if (tourState.miniTourActive) endMiniTour();
  if (isPresentationModeActive()) {
    rt.showToast("Finaliza el modo presentaci\xF3n antes de iniciar el tutorial guiado.", "error");
    return;
  }
  settingsHelpBridge.closeQuickHelp();
  resetAndStartOnboarding();
}
function startTourModule(chapterId) {
  var cid = String(chapterId || "");
  if (cid === "ch-quick-route") {
    startQuickRouteTour();
    return;
  }
  var branch = cid.indexOf("ch-guardia-") === 0 ? "guardia-v7" : cid.indexOf("ch-ic") === 0 ? "interconsulta" : "sala";
  var stepId = getFirstStepIdForChapter(chapterId, branch);
  if (!stepId) return;
  if (tourState.guidedTourActive) {
    rt.showToast("Finaliza o pausa el tutorial actual primero.", "error");
    return;
  }
  if (tourState.miniTourActive) endMiniTour();
  if (isPresentationModeActive()) {
    rt.showToast("Finaliza el modo presentaci\xF3n antes de iniciar un m\xF3dulo.", "error");
    return;
  }
  tourState.guidedTourMode = "base";
  tourState.guidedTourChapterScope = cid;
  tourState.guidedTourModuleOnly = true;
  resetTourUiBeforeResume();
  startOnboarding(branch, { resumeStepId: stepId, skipIntro: true });
}
function startQuickRouteTour() {
  if (tourState.guidedTourActive) {
    rt.showToast("Finaliza o pausa el tutorial actual primero.", "error");
    return;
  }
  if (tourState.miniTourActive) endMiniTour();
  if (isPresentationModeActive()) {
    rt.showToast("Finaliza el modo presentaci\xF3n antes de iniciar la ruta r\xE1pida.", "error");
    return;
  }
  tourState.guidedTourMode = "base";
  tourState.guidedTourChapterScope = "ch-quick-route";
  tourState.guidedTourModuleOnly = true;
  resetTourUiBeforeResume();
  startOnboarding("quick-route", { skipIntro: true });
}
function startHelpTourInterconsulta() {
  if (tourState.guidedTourActive) {
    rt.showToast("Finaliza o pausa el tutorial actual primero.", "error");
    return;
  }
  if (tourState.miniTourActive) endMiniTour();
  if (isPresentationModeActive()) {
    rt.showToast("Finaliza el modo presentaci\xF3n antes de iniciar el tutorial.", "error");
    return;
  }
  settingsHelpBridge.closeQuickHelp();
  hideTourIntroModal();
  tourState.guidedTourMode = "base";
  startOnboarding("interconsulta", { skipIntro: true });
}
function togglePresentationModeFromHelp() {
  if (tourState.guidedTourActive) {
    rt.showToast("Finaliza el tutorial guiado antes del modo presentaci\xF3n.", "error");
    return;
  }
  if (tourState.miniTourActive) endMiniTour();
  settingsHelpBridge.closeQuickHelp();
  closeSettingsDropdown();
  if (isPresentationModeActive()) stopPresentationMode();
  else startPresentationMode();
}
registerTourDemoPatientHooks({
  isTourActive: function() {
    return tourState.guidedTourActive;
  },
  getTourStep: function() {
    return tourState.tourStepId;
  },
  applyBundle: applyTourDemoPatientBundle,
  scheduleLabPatientRegistration: scheduleTourDemoPatientRegistrationFromLab,
  switchAppTab: function(tab) {
    rt.switchAppTab(tab);
  },
  showToast: function(msg, type) {
    rt.showToast(msg, type);
  }
});

// public/js/features/settings-help/tour-runtime.mjs
tourBridge.miniTourNext = miniTourNext;
tourBridge.endMiniTour = endMiniTour;

export {
  startMiniTour,
  miniTourNext,
  endMiniTour,
  startHelpTourMain,
  startTourModule,
  startQuickRouteTour,
  startHelpTourInterconsulta,
  togglePresentationModeFromHelp
};
//# sourceMappingURL=/js/chunks/chunk-Q45YSND3.js.map
