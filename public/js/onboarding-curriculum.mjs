export const CURRICULUM_VERSION = 7;

export const SALA_CHAPTERS = [
  {
    id: 'ch-patient-lab',
    title: 'Paciente y laboratorio',
    stepIds: [
      'map_sidebar',
      'map_tabs',
      'map_lab_teaser',
      'lab_parse',
      'lab_view',
      'servicio_default',
    ],
  },
  {
    id: 'ch-chart',
    title: 'Expediente · Clínico',
    stepIds: [
      'sala_expediente_tabs',
      'historia_clinica',
      'estado_actual',
      'estado_actual_registro',
      'estado_actual_snapshot',
      'estado_actual_charts',
      'estado_actual_historial',
      'eventualidades',
    ],
  },
  {
    id: 'ch-results',
    title: 'Resultados',
    stepIds: ['sala_tend', 'sala_tend_chart'],
  },
  {
    id: 'ch-salida',
    title: 'Medicamentos y salida',
    stepIds: ['sala_med', 'listado_problemas', 'sala_vpo', 'sala_receta_hu'],
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

/** Interconsulta: lab block first (sin Neo; sin servicio_default en v1). */
export const IC_CHAPTERS = [
  {
    id: 'ch-ic-lab',
    title: 'Paciente y laboratorio',
    stepIds: [
      'map_sidebar',
      'map_tabs',
      'map_lab_teaser',
      'lab_parse',
      'lab_view',
    ],
  },
  {
    id: 'ch-ic-chart',
    title: 'Expediente y clínico',
    stepIds: [
      'ic_expediente_tabs',
      'sala_tend',
      'sala_tend_chart',
      'sala_soap',
      'sala_med',
      'ic_nota',
      'ic_indica',
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

export const NEO_COMPANION = {
  companion: 'neo',
  title: 'Neo (app companion)',
  stepIds: ['sala_casiopea_lab', 'sala_casiopea_trends'],
};

export const HUB_MODULES = [
  { id: 'mod-ch1', chapterId: 'ch-patient-lab', label: 'Laboratorio y pacientes', branch: 'sala' },
  { id: 'mod-ch2', chapterId: 'ch-chart', label: 'Expediente · Clínico', branch: 'sala' },
  { id: 'mod-ch3', chapterId: 'ch-results', label: 'Resultados (tendencias)', branch: 'sala' },
  { id: 'mod-ch4', chapterId: 'ch-salida', label: 'Medicamentos y salida', branch: 'sala' },
  { id: 'mod-ch5', chapterId: 'ch-agenda', label: 'Agenda del turno', branch: 'sala' },
  { id: 'mod-ch6', chapterId: 'ch-team', label: 'Equipo (LiveSync + móvil)', branch: 'sala' },
  { id: 'neo-lab', companion: 'neo', label: 'Neo · Laboratorio', startStepId: 'sala_casiopea_lab', branch: 'sala' },
  { id: 'neo-trends', companion: 'neo', label: 'Neo · Tendencias', startStepId: 'sala_casiopea_trends', branch: 'sala' },
];

function chaptersForBranch(branch) {
  return branch === 'interconsulta' ? IC_CHAPTERS : SALA_CHAPTERS;
}

export function getSalaTourSteps() {
  return SALA_CHAPTERS.flatMap((c) => c.stepIds.slice());
}

export function getInterconsultaTourSteps() {
  return IC_CHAPTERS.flatMap((c) => c.stepIds.slice());
}

export function getNeoCompanionSteps() {
  return NEO_COMPANION.stepIds.slice();
}

export function getChapterForStep(stepId, branch) {
  const chapters = chaptersForBranch(branch);
  for (const ch of chapters) {
    if (ch.stepIds.includes(stepId)) return ch;
  }
  if (NEO_COMPANION.stepIds.includes(stepId)) return { id: 'ch-neo', title: NEO_COMPANION.title };
  return { id: 'unknown', title: '' };
}

export function getChapterProgressLabel(stepId, branch) {
  const ch = getChapterForStep(stepId, branch);
  const chapters = chaptersForBranch(branch);
  const chapter = chapters.find((c) => c.id === ch.id);
  if (!chapter) {
    const neoIdx = NEO_COMPANION.stepIds.indexOf(stepId);
    return {
      chapterTitle: NEO_COMPANION.title,
      stepInChapter: neoIdx + 1,
      chapterSteps: NEO_COMPANION.stepIds.length,
      chapterIndex: 0,
      chapterCount: 1,
      isCompanion: true,
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
  const ch = chaptersForBranch(branch).find((c) => c.id === chapterId);
  return ch && ch.stepIds.length ? ch.stepIds[0] : null;
}

export function isValidStepForBranch(stepId, branch, mode) {
  if (mode === 'neo') return NEO_COMPANION.stepIds.includes(stepId);
  const steps = branch === 'interconsulta' ? getInterconsultaTourSteps() : getSalaTourSteps();
  return steps.includes(stepId);
}
