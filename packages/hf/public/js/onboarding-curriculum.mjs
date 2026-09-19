export const CURRICULUM_VERSION = 18;

export const SALA_CHAPTERS = [
  {
    id: 'ch-map',
    title: 'Cómo está armada R+',
    stepIds: [
      'map_tabs',
      'map_sidebar',
      'map_add_patient',
      'map_incomplete',
      'servicio_default',
    ],
  },
  {
    id: 'ch-patient-lab',
    title: 'Laboratorio',
    stepIds: [
      'map_lab_teaser',
      'lab_parse',
      'lab_view',
      'sala_tend',
      'sala_tend_chart',
    ],
  },
  {
    id: 'ch-chart',
    title: 'Paciente · Clínico',
    stepIds: [
      'sala_expediente_tabs',
      'evaluacion_inicial',
      'estado_actual',
      'estado_actual_registro',
      'estado_actual_review',
      'eventualidades',
    ],
  },
  {
    id: 'ch-salida',
    title: 'Medicamentos y salida',
    stepIds: ['sala_med', 'sala_hoja_ic'],
  },
  {
    id: 'ch-agenda',
    title: 'Agenda',
    stepIds: ['sala_agenda'],
  },
  {
    id: 'ch-team',
    title: 'Equipo',
    stepIds: ['livesync_desktop', 'livesync_mobile', 'wrap'],
  },
];

/** Interconsulta: mapa de la app primero; laboratorio incluye tendencias. */
export const IC_CHAPTERS = [
  {
    id: 'ch-ic-map',
    title: 'Cómo está armada R+',
    stepIds: [
      'map_tabs',
      'map_sidebar',
      'map_add_patient',
      'map_incomplete',
    ],
  },
  {
    id: 'ch-ic-lab',
    title: 'Laboratorio',
    stepIds: [
      'map_lab_teaser',
      'lab_parse',
      'lab_view',
      'sala_tend',
      'sala_tend_chart',
    ],
  },
  {
    id: 'ch-ic-chart',
    title: 'Paciente y clínico',
    stepIds: [
      'ic_expediente_tabs',
      'sala_med',
      'consulta_ic',
    ],
  },
  {
    id: 'ch-ic-settings',
    title: 'Ajustes y perfil',
    stepIds: ['ic_exports', 'profile'],
  },
  {
    id: 'ch-ic-team',
    title: 'Equipo',
    stepIds: ['livesync_desktop', 'livesync_mobile', 'wrap'],
  },
];

export const QUICK_ROUTE_CHAPTERS = [
  {
    id: 'ch-quick-route',
    title: 'Ruta rápida',
    stepIds: [
      'map_tabs',
      'map_add_patient',
      'lab_parse',
      'livesync_desktop',
      'quick_wrap',
    ],
  },
];

export const QUICK_ROUTE_HUB_MODULE = {
  id: 'ch-quick-route',
  label: 'Ruta rápida · mapa, alta y turno',
  chapterId: 'ch-quick-route',
  branch: 'quick-route',
  stepCount: QUICK_ROUTE_CHAPTERS[0].stepIds.length,
};

export const SALA_HUB_MODULES = [
  { id: 'mod-ch1', chapterId: 'ch-map', label: 'Cómo está armada R+', branch: 'sala' },
  { id: 'mod-ch2', chapterId: 'ch-patient-lab', label: 'Laboratorio (Labs · Tendencias · Cultivos)', branch: 'sala' },
  { id: 'mod-ch3', chapterId: 'ch-chart', label: 'Paciente · Clínico', branch: 'sala' },
  { id: 'mod-ch4', chapterId: 'ch-salida', label: 'Medicamentos y salida', branch: 'sala' },
  { id: 'mod-ch5', chapterId: 'ch-agenda', label: 'Agenda del turno', branch: 'sala' },
  { id: 'mod-ch6', chapterId: 'ch-team', label: 'Equipo (R+ Cloud + móvil)', branch: 'sala' },
];

export const IC_HUB_MODULES = IC_CHAPTERS.map((ch) => ({
  id: ch.id,
  label: ch.title,
  chapterId: ch.id,
  branch: 'interconsulta',
  stepCount: ch.stepIds.length,
}));

/** @deprecated Use SALA_HUB_MODULES — kept for legacy imports */
export const HUB_MODULES = SALA_HUB_MODULES;

function chaptersForBranch(branch) {
  if (branch === 'interconsulta') return IC_CHAPTERS;
  if (branch === 'quick-route') return QUICK_ROUTE_CHAPTERS;
  return SALA_CHAPTERS;
}

export function getSalaTourSteps() {
  return SALA_CHAPTERS.flatMap((c) => c.stepIds.slice());
}

export function getInterconsultaTourSteps() {
  return IC_CHAPTERS.flatMap((c) => c.stepIds.slice());
}

export function getQuickRouteTourSteps() {
  return QUICK_ROUTE_CHAPTERS.flatMap((c) => c.stepIds.slice());
}

export function getChapterForStep(stepId, branch) {
  const chapters = chaptersForBranch(branch);
  for (const ch of chapters) {
    if (ch.stepIds.includes(stepId)) return ch;
  }
  return { id: 'unknown', title: '' };
}

export function getChapterProgressLabel(stepId, branch) {
  if (branch === 'quick-route') {
    const steps = getQuickRouteTourSteps();
    const idx = steps.indexOf(stepId);
    const ch = QUICK_ROUTE_CHAPTERS[0];
    return {
      chapterTitle: ch?.title || 'Ruta rápida',
      stepInChapter: idx >= 0 ? idx + 1 : 1,
      chapterSteps: steps.length,
      chapterIndex: 1,
      chapterCount: 1,
      isCompanion: false,
    };
  }

  const ch = getChapterForStep(stepId, branch);
  const chapters = chaptersForBranch(branch);
  const chapter = chapters.find((c) => c.id === ch.id);
  if (!chapter) {
    const linear =
      branch === 'interconsulta' ? getInterconsultaTourSteps() : getSalaTourSteps();
    const linearIdx = linear.indexOf(stepId);
    return {
      chapterTitle: ch.title || '',
      stepInChapter: linearIdx >= 0 ? linearIdx + 1 : 1,
      chapterSteps: linear.length,
      chapterIndex: 1,
      chapterCount: chapters.length,
      isCompanion: false,
    };
  }
  const stepInChapter = chapter.stepIds.indexOf(stepId) + 1;
  return {
    chapterTitle: chapter.title,
    stepInChapter,
    chapterSteps: chapter.stepIds.length,
    chapterIndex: chapters.findIndex((c) => c.id === chapter.id) + 1,
    chapterCount: chapters.length,
    isCompanion: false,
  };
}

export function getFirstStepIdForChapter(chapterId, branch) {
  const ch = getChapterById(chapterId, branch);
  return ch && ch.stepIds.length ? ch.stepIds[0] : null;
}

export function getChapterById(chapterId, branch) {
  return chaptersForBranch(branch).find((c) => c.id === chapterId) || null;
}

export function getTourStepsForChapter(chapterId, branch) {
  const ch = getChapterById(chapterId, branch);
  return ch ? ch.stepIds.slice() : [];
}

export function isValidStepForBranch(stepId, branch, _mode) {
  if (branch === 'quick-route') return getQuickRouteTourSteps().includes(stepId);
  const steps = branch === 'interconsulta' ? getInterconsultaTourSteps() : getSalaTourSteps();
  return steps.includes(stepId);
}

/** Maps legacy tour step ids after curriculum merges. */
export function migrateTourStepId(stepId, _branch) {
  if (
    stepId === 'estado_actual_snapshot' ||
    stepId === 'estado_actual_charts' ||
    stepId === 'estado_actual_historial'
  ) {
    return 'estado_actual_review';
  }
  if (stepId === 'sala_soap') return 'sala_med';
  if (stepId === 'historia_clinica') return 'estado_actual';
  if (
    stepId === 'listado_problemas' ||
    stepId === 'sala_vpo' ||
    stepId === 'sala_receta_hu'
  ) {
    return 'sala_hoja_ic';
  }
  if (stepId === 'ic_nota' || stepId === 'ic_indica') return 'consulta_ic';
  return stepId;
}
