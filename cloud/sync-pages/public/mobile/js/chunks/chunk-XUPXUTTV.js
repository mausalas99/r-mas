import {
  applyTourDemoPatientBundle,
  hideTourDock,
  resetAndStartOnboarding,
  resetTourUiBeforeResume,
  scheduleTourDemoPatientRegistrationFromLab,
  showTourDock,
  startOnboarding,
  syncTourDockPlacement,
  tourBridge
} from "/mobile/js/chunks/chunk-PGJAAO4L.js";
import {
  hideTourIntroModal
} from "/mobile/js/chunks/chunk-GLQUULAW.js";
import {
  getFirstStepIdForChapter
} from "/mobile/js/chunks/chunk-MB77G5WL.js";
import {
  settingsHelpBridge
} from "/mobile/js/chunks/chunk-WSJX2ILZ.js";
import {
  isPresentationModeActive,
  startPresentationMode,
  stopPresentationMode
} from "/mobile/js/chunks/chunk-BBS4PHSW.js";
import {
  switchLabInner
} from "/mobile/js/chunks/chunk-274LOGQG.js";
import {
  publishTourGuardContext,
  tourState
} from "/mobile/js/chunks/chunk-I4CCRDMI.js";
import {
  renderPatientList
} from "/mobile/js/chunks/chunk-YRTBWCMP.js";
import {
  getDemoPatients,
  setDemoPatients
} from "/mobile/js/chunks/chunk-D5FCWCGO.js";
import {
  closeSettingsDropdown,
  ensureSettingsDropdownOpen,
  expandSettingsAccordionBackupSync
} from "/mobile/js/chunks/chunk-3AR62DQ3.js";
import {
  getSettingsHelpRuntime
} from "/mobile/js/chunks/chunk-75WWBSFQ.js";
import {
  registerTourDemoPatientHooks
} from "/mobile/js/chunks/chunk-W7AKQPIM.js";
import {
  getPatients,
  persistClinicalState,
  setPatients
} from "/mobile/js/chunks/chunk-2LHILGVA.js";
import {
  storage
} from "/mobile/js/chunks/chunk-SJBIJKX4.js";

// public/js/tour-pitch-guardia-census.mjs
var DAY_MS = 24 * 60 * 60 * 1e3;
function todayAt(today, hour, minute) {
  const d = new Date(today.getTime());
  d.setHours(hour, minute, 0, 0);
  return d;
}
function vitalsEntry(id, recordedAt, vitals, alteredAt) {
  return {
    id,
    recordedAt: recordedAt.toISOString(),
    vitals,
    alteredAt: alteredAt || {}
  };
}
function pendienteBearingPatientSpecs(today) {
  return [
    {
      id: "pitch-gcx-01",
      nombre: "P\xC9REZ GARC\xCDA, JUAN M.",
      edad: "68",
      sexo: "M",
      cuarto: "214-B",
      cama: "2",
      vitals: { sat: 89, fc: 110 },
      alteredAt: { sat: todayAt(today, 8, 4).toISOString() },
      todo: { text: "Reponer potasio y control", overdue: true }
    },
    {
      id: "pitch-gcx-02",
      nombre: "RAM\xCDREZ SOTO, ANA",
      edad: "74",
      sexo: "F",
      cuarto: "219",
      cama: "1",
      vitals: { tas: 82, tad: 50, fc: 122 },
      alteredAt: { tas: todayAt(today, 8, 2).toISOString() },
      todo: { text: "Carga de volumen, revalorar", overdue: true },
      registeredAt: todayAt(today, 19, 20).toISOString()
    },
    {
      id: "pitch-gcx-03",
      nombre: "DOM\xCDNGUEZ LARA, MAR\xCDA",
      edad: "59",
      sexo: "F",
      cuarto: "217",
      cama: "3",
      vitals: { temp: 38.4, fc: 96 },
      alteredAt: { temp: todayAt(today, 7, 58).toISOString() },
      todo: { text: "Esquema de insulina c/4 h", inProgress: true }
    },
    {
      id: "pitch-gcx-04",
      nombre: "OLVERA RUIZ, PEDRO",
      edad: "81",
      sexo: "M",
      cuarto: "221",
      cama: "2",
      vitals: { fc: 118, sat: 92 },
      alteredAt: { fc: todayAt(today, 7, 40).toISOString() },
      todo: { text: "Transfusi\xF3n 1 CE, consentimiento", inProgress: true },
      registeredAt: todayAt(today, 23, 5).toISOString()
    },
    {
      id: "pitch-gcx-05",
      nombre: "S\xC1NCHEZ MORA, ELENA",
      edad: "66",
      sexo: "F",
      cuarto: "213",
      cama: "1",
      vitals: { tas: 118, tad: 72, fc: 82 },
      alteredAt: {},
      todo: { text: "Ajustar dosis por depuraci\xF3n" }
    },
    {
      id: "pitch-gcx-06",
      nombre: "TREJO ISLAS, ROBERTO",
      edad: "70",
      sexo: "M",
      cuarto: "216",
      cama: "4",
      vitals: { temp: 38.4, fc: 92 },
      alteredAt: { temp: todayAt(today, 5, 10).toISOString() },
      todo: { text: "Hemocultivos y control t\xE9rmico" }
    },
    {
      id: "pitch-gcx-07",
      nombre: "IBARRA CASTRO, DANIELA",
      edad: "54",
      sexo: "F",
      cuarto: "215",
      cama: "2",
      vitals: { tas: 116, tad: 70, fc: 78 },
      alteredAt: {},
      todo: { text: "Control de electrolitos" }
    },
    {
      id: "pitch-gcx-08",
      nombre: "MORENO DELGADO, CARLOS",
      edad: "77",
      sexo: "M",
      cuarto: "218",
      cama: "1",
      vitals: { tas: 122, tad: 74, fc: 80 },
      alteredAt: {},
      todo: { text: "Valorar egreso a piso" }
    },
    {
      id: "pitch-gcx-09",
      nombre: "CASTRO LE\xD3N, IRMA",
      edad: "62",
      sexo: "F",
      cuarto: "220",
      cama: "4",
      vitals: { tas: 150, tad: 96, fc: 88 },
      alteredAt: {},
      todo: { text: "Ajuste de dieta hipos\xF3dica" },
      registeredAt: todayAt(today, 3, 40).toISOString()
    }
  ];
}
function quietPatientSpecs(today) {
  const names = [
    "GUTI\xC9RREZ V\xC1ZQUEZ, LUIS",
    "NAVA CORT\xC9S, SOF\xCDA",
    "ESQUIVEL PONCE, JORGE",
    "VARGAS PE\xD1A, MARTHA",
    "ROJAS AGUILAR, FERNANDO",
    "HERRERA SOTO, PATRICIA",
    "CAMPOS RUIZ, ALEJANDRO",
    "LUNA MEDINA, GABRIELA",
    "AGUILAR TORRES, RICARDO",
    "MENDOZA CRUZ, LAURA",
    "FLORES ORTIZ, SERGIO",
    "V\xC1ZQUEZ ROMERO, CLAUDIA",
    "JIM\xC9NEZ SILVA, H\xC9CTOR",
    "REYES NAVARRO, BEATRIZ",
    "CORT\xC9S RAMOS, EDUARDO",
    "SALAZAR G\xD3MEZ, VER\xD3NICA"
  ];
  return names.map((nombre, i) => {
    const noVitalsToday = i === 1 || i === 2;
    return {
      id: `pitch-gcx-q${String(i + 1).padStart(2, "0")}`,
      nombre,
      edad: String(45 + i),
      sexo: i % 2 === 0 ? "F" : "M",
      cuarto: String(222 + Math.floor(i / 2)),
      cama: String(i % 2 + 1),
      vitals: noVitalsToday ? null : { tas: 116 + i % 5, tad: 70, fc: 76 + i % 6 },
      alteredAt: {},
      todo: null
    };
  });
}
function buildPatientFromSpec(spec, today) {
  const historial = spec.vitals ? [vitalsEntry(spec.id + "-v1", todayAt(today, 6, 0), { tas: 118, tad: 72, fc: 78 }, {})] : [];
  if (spec.vitals) {
    historial.push(vitalsEntry(spec.id + "-v2", todayAt(today, 8, 0), spec.vitals, spec.alteredAt || {}));
  }
  const patient = {
    id: spec.id,
    nombre: spec.nombre,
    registro: spec.id,
    edad: spec.edad,
    sexo: spec.sexo,
    area: "MEDICINA INTERNA",
    servicio: "MEDICINA INTERNA",
    cuarto: spec.cuarto,
    cama: spec.cama,
    monitoreo: { historial }
  };
  if (spec.registeredAt) patient.registeredAt = spec.registeredAt;
  return patient;
}
function buildPitchGuardiaCensusPatients(ref) {
  const today = ref instanceof Date ? ref : /* @__PURE__ */ new Date();
  const pending = pendienteBearingPatientSpecs(today).map((s) => buildPatientFromSpec(s, today));
  const quiet = quietPatientSpecs(today).slice(0, 15).map((s) => buildPatientFromSpec(s, today));
  return [...pending, ...quiet];
}
function pendienteTodoSpecsById(ref) {
  const today = ref instanceof Date ? ref : /* @__PURE__ */ new Date();
  const out = {};
  pendienteBearingPatientSpecs(today).forEach((s) => {
    if (s.todo) out[s.id] = s.todo;
  });
  return out;
}
function seedPitchGuardiaCensusTodos(ref) {
  const today = ref instanceof Date ? ref : /* @__PURE__ */ new Date();
  const specs = pendienteTodoSpecsById(today);
  Object.keys(specs).forEach((patientId) => {
    const spec = specs[patientId];
    const now = today.toISOString();
    const row = {
      id: patientId + "-todo",
      text: spec.text,
      completed: false,
      priority: "media",
      createdAt: now,
      updatedAt: now
    };
    if (spec.overdue) {
      row.dueDate = new Date(today.getTime() - DAY_MS).toISOString();
    } else if (!spec.inProgress) {
      row.dueDate = new Date(today.getTime() + 3 * DAY_MS).toISOString();
    }
    if (spec.inProgress) row.inProgress = true;
    storage.saveTodos(patientId, [row]);
  });
}
function extendPresentationModeWithGuardiaCensus(state, ref) {
  const today = ref instanceof Date ? ref : /* @__PURE__ */ new Date();
  const extra = buildPitchGuardiaCensusPatients(today);
  const existing = (state.getPatients() || []).filter(
    (p) => !extra.some((e) => e.id === p.id)
  );
  const merged = [...existing, ...extra];
  state.setPatients(merged);
  seedPitchGuardiaCensusTodos(today);
  state.persistClinicalState();
  state.renderPatientList();
}

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
    body: "Cada laboratorio procesado con paciente activo se guarda con su fecha. Con dos o m\xE1s labs aparecen mini-gr\xE1ficas en <strong>Laboratorio \u2192 Tendencias</strong>.",
    before: function() {
      rt.switchAppTab("lab");
      switchLabInner("tend");
    }
  },
  {
    badge: "Laboratorio \xB7 historial",
    body: "En <strong>Laboratorio \u2192 Labs</strong>, el selector de fechas cambia entre env\xEDos guardados del paciente activo. El men\xFA <strong>\u22EF</strong> permite copiar varios d\xEDas, consolidar env\xEDos del mismo d\xEDa, reprocesar o eliminar una entrada.",
    before: function() {
      rt.switchAppTab("lab");
      switchLabInner("labs");
    }
  },
  {
    badge: "Evoluci\xF3n y medicamentos",
    body: "En <strong>Paciente \u2192 Cl\xEDnico \u2192 Notas</strong> completa la evoluci\xF3n. En modo <strong>Sala</strong>, el texto estructurado se arma en <strong>Estado actual</strong>. La pesta\xF1a <strong>Manejo</strong> importa la receta del hospital.",
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
    } catch {
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
function seedPitchGuardiaCensusFromHelp() {
  if (tourState.guidedTourActive) {
    rt.showToast("Finaliza el tutorial guiado antes del censo de guardia demo.", "error");
    return;
  }
  if (!isPresentationModeActive()) startPresentationMode();
  extendPresentationModeWithGuardiaCensus({
    getPatients,
    setPatients,
    getDemoPatients,
    setDemoPatients,
    persistClinicalState,
    renderPatientList
  });
  rt.showToast("Censo de guardia demo: 25 pacientes", "info");
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
  togglePresentationModeFromHelp,
  seedPitchGuardiaCensusFromHelp
};
//# sourceMappingURL=/js/chunks/chunk-XUPXUTTV.js.map
