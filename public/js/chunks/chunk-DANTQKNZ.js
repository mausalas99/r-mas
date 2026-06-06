// public/js/onboarding-curriculum.mjs
var CURRICULUM_VERSION = 9;
var SALA_CHAPTERS = [
  {
    id: "ch-patient-lab",
    title: "Paciente y laboratorio",
    stepIds: [
      "map_sidebar",
      "map_tabs",
      "map_lab_teaser",
      "lab_parse",
      "lab_view",
      "servicio_default"
    ]
  },
  {
    id: "ch-chart",
    title: "Expediente \xB7 Cl\xEDnico",
    stepIds: [
      "sala_expediente_tabs",
      "historia_clinica",
      "estado_actual",
      "estado_actual_registro",
      "estado_actual_review",
      "eventualidades"
    ]
  },
  {
    id: "ch-results",
    title: "Resultados",
    stepIds: ["sala_tend", "sala_tend_chart"]
  },
  {
    id: "ch-salida",
    title: "Medicamentos y salida",
    stepIds: ["sala_med", "listado_problemas", "sala_vpo", "sala_receta_hu"]
  },
  {
    id: "ch-agenda",
    title: "Agenda",
    stepIds: ["sala_agenda"]
  },
  {
    id: "ch-team",
    title: "Equipo",
    stepIds: ["livesync_desktop", "livesync_mobile", "wrap"]
  }
];
var IC_CHAPTERS = [
  {
    id: "ch-ic-lab",
    title: "Paciente y laboratorio",
    stepIds: [
      "map_sidebar",
      "map_tabs",
      "map_lab_teaser",
      "lab_parse",
      "lab_view"
    ]
  },
  {
    id: "ch-ic-chart",
    title: "Expediente y cl\xEDnico",
    stepIds: [
      "ic_expediente_tabs",
      "sala_tend",
      "sala_tend_chart",
      "sala_soap",
      "sala_med",
      "ic_nota",
      "ic_indica"
    ]
  },
  {
    id: "ch-ic-settings",
    title: "Ajustes y perfil",
    stepIds: ["ic_exports", "profile"]
  },
  {
    id: "ch-ic-team",
    title: "Equipo",
    stepIds: ["livesync_desktop", "livesync_mobile", "wrap"]
  }
];
var NEO_COMPANION = {
  companion: "neo",
  title: "Neo (app companion)",
  stepIds: ["sala_casiopea_lab", "sala_casiopea_trends"]
};
var GUARDIA_V7_CHAPTERS = [
  {
    id: "ch-guardia-modo",
    title: "Modo Guardia",
    stepIds: [
      "gv7_guardia_chip",
      "gv7_guardia_tab",
      "gv7_guardia_scope",
      "gv7_guardia_toggle",
      "gv7_guardia_exit"
    ]
  },
  {
    id: "ch-guardia-censo",
    title: "Censo y alcance",
    stepIds: ["gv7_censo_r1", "gv7_censo_r4", "gv7_censo_sync"]
  },
  {
    id: "ch-guardia-entrega",
    title: "Modo Entrega",
    stepIds: [
      "gv7_entrega_phase",
      "gv7_entrega_patient",
      "gv7_entrega_roster",
      "gv7_entrega_pendientes"
    ]
  },
  {
    id: "ch-guardia-lan",
    title: "LAN y equipos",
    stepIds: [
      "gv7_lan_wifi",
      "gv7_lan_pin",
      "gv7_lan_directorio",
      "gv7_lan_rotacion"
    ]
  },
  {
    id: "ch-guardia-movil",
    title: "iPad y m\xF3vil",
    stepIds: ["gv7_mobile_link", "gv7_mobile_scope", "gv7_mobile_vs_sala"]
  }
];
var QUICK_ROUTE_CHAPTERS = [
  {
    id: "ch-quick-route",
    title: "Ruta r\xE1pida",
    stepIds: [
      "map_lab_teaser",
      "lab_parse",
      "gv7_guardia_chip",
      "gv7_lan_wifi",
      "gv7_entrega_phase",
      "quick_wrap"
    ]
  }
];
var QUICK_ROUTE_HUB_MODULE = {
  id: "ch-quick-route",
  label: "Ruta r\xE1pida \xB7 turno en 5 min",
  chapterId: "ch-quick-route",
  branch: "quick-route",
  stepCount: QUICK_ROUTE_CHAPTERS[0].stepIds.length
};
var GUARDIA_V7_HUB_MODULES = GUARDIA_V7_CHAPTERS.map((ch) => ({
  id: ch.id,
  label: ch.title,
  chapterId: ch.id,
  branch: "guardia-v7",
  stepCount: ch.stepIds.length
}));
var HUB_MODULES = [
  { id: "mod-ch1", chapterId: "ch-patient-lab", label: "Laboratorio y pacientes", branch: "sala" },
  { id: "mod-ch2", chapterId: "ch-chart", label: "Expediente \xB7 Cl\xEDnico", branch: "sala" },
  { id: "mod-ch3", chapterId: "ch-results", label: "Resultados (tendencias)", branch: "sala" },
  { id: "mod-ch4", chapterId: "ch-salida", label: "Medicamentos y salida", branch: "sala" },
  { id: "mod-ch5", chapterId: "ch-agenda", label: "Agenda del turno", branch: "sala" },
  { id: "mod-ch6", chapterId: "ch-team", label: "Equipo (LiveSync + m\xF3vil)", branch: "sala" },
  { id: "neo-lab", companion: "neo", label: "Neo \xB7 Laboratorio", startStepId: "sala_casiopea_lab", branch: "sala" },
  { id: "neo-trends", companion: "neo", label: "Neo \xB7 Tendencias", startStepId: "sala_casiopea_trends", branch: "sala" }
];
function chaptersForBranch(branch) {
  if (branch === "interconsulta") return IC_CHAPTERS;
  if (branch === "guardia-v7") return GUARDIA_V7_CHAPTERS;
  if (branch === "quick-route") return QUICK_ROUTE_CHAPTERS;
  return SALA_CHAPTERS;
}
function getSalaTourSteps() {
  return SALA_CHAPTERS.flatMap((c) => c.stepIds.slice());
}
function getInterconsultaTourSteps() {
  return IC_CHAPTERS.flatMap((c) => c.stepIds.slice());
}
function getGuardiaV7TourSteps() {
  return GUARDIA_V7_CHAPTERS.flatMap((c) => c.stepIds.slice());
}
function getQuickRouteTourSteps() {
  return QUICK_ROUTE_CHAPTERS.flatMap((c) => c.stepIds.slice());
}
function getNeoCompanionSteps() {
  return NEO_COMPANION.stepIds.slice();
}
function getChapterForStep(stepId, branch) {
  const chapters = chaptersForBranch(branch);
  for (const ch of chapters) {
    if (ch.stepIds.includes(stepId)) return ch;
  }
  if (NEO_COMPANION.stepIds.includes(stepId)) return { id: "ch-neo", title: NEO_COMPANION.title };
  return { id: "unknown", title: "" };
}
function getChapterProgressLabel(stepId, branch) {
  if (branch === "quick-route") {
    const steps = getQuickRouteTourSteps();
    const idx = steps.indexOf(stepId);
    const ch2 = QUICK_ROUTE_CHAPTERS[0];
    return {
      chapterTitle: ch2?.title || "Ruta r\xE1pida",
      stepInChapter: idx >= 0 ? idx + 1 : 1,
      chapterSteps: steps.length,
      chapterIndex: 1,
      chapterCount: 1,
      isCompanion: false
    };
  }
  const ch = getChapterForStep(stepId, branch);
  const chapters = chaptersForBranch(branch);
  const chapter = chapters.find((c) => c.id === ch.id);
  if (!chapter) {
    const neoIdx = NEO_COMPANION.stepIds.indexOf(stepId);
    if (neoIdx >= 0) {
      return {
        chapterTitle: NEO_COMPANION.title,
        stepInChapter: neoIdx + 1,
        chapterSteps: NEO_COMPANION.stepIds.length,
        chapterIndex: 0,
        chapterCount: 1,
        isCompanion: true
      };
    }
    const linear = branch === "guardia-v7" ? getGuardiaV7TourSteps() : branch === "interconsulta" ? getInterconsultaTourSteps() : getSalaTourSteps();
    const linearIdx = linear.indexOf(stepId);
    return {
      chapterTitle: ch.title || "",
      stepInChapter: linearIdx >= 0 ? linearIdx + 1 : 1,
      chapterSteps: linear.length,
      chapterIndex: 1,
      chapterCount: chapters.length,
      isCompanion: false
    };
  }
  const stepInChapter = chapter.stepIds.indexOf(stepId) + 1;
  return {
    chapterTitle: chapter.title,
    stepInChapter,
    chapterSteps: chapter.stepIds.length,
    chapterIndex: chapters.findIndex((c) => c.id === chapter.id) + 1,
    chapterCount: chapters.length,
    isCompanion: false
  };
}
function getFirstStepIdForChapter(chapterId, branch) {
  const ch = getChapterById(chapterId, branch);
  return ch && ch.stepIds.length ? ch.stepIds[0] : null;
}
function getChapterById(chapterId, branch) {
  return chaptersForBranch(branch).find((c) => c.id === chapterId) || null;
}
function getTourStepsForChapter(chapterId, branch) {
  const ch = getChapterById(chapterId, branch);
  return ch ? ch.stepIds.slice() : [];
}
function isValidStepForBranch(stepId, branch, mode) {
  if (mode === "neo") return NEO_COMPANION.stepIds.includes(stepId);
  if (branch === "guardia-v7") return getGuardiaV7TourSteps().includes(stepId);
  if (branch === "quick-route") return getQuickRouteTourSteps().includes(stepId);
  const steps = branch === "interconsulta" ? getInterconsultaTourSteps() : getSalaTourSteps();
  return steps.includes(stepId);
}
function migrateTourStepId(stepId, branch) {
  if (stepId === "estado_actual_snapshot" || stepId === "estado_actual_charts" || stepId === "estado_actual_historial") {
    return "estado_actual_review";
  }
  return stepId;
}

export {
  CURRICULUM_VERSION,
  SALA_CHAPTERS,
  NEO_COMPANION,
  GUARDIA_V7_CHAPTERS,
  QUICK_ROUTE_HUB_MODULE,
  GUARDIA_V7_HUB_MODULES,
  HUB_MODULES,
  getSalaTourSteps,
  getInterconsultaTourSteps,
  getGuardiaV7TourSteps,
  getQuickRouteTourSteps,
  getNeoCompanionSteps,
  getChapterForStep,
  getChapterProgressLabel,
  getFirstStepIdForChapter,
  getTourStepsForChapter,
  isValidStepForBranch,
  migrateTourStepId
};
//# sourceMappingURL=/js/chunks/chunk-DANTQKNZ.js.map
