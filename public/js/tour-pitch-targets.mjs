/** Targets del tour pitch: selectores, spotlight y callouts para audiencia. */
import { getPitchTourSteps } from './tour-pitch-steps.mjs';

/** @type {Record<string, object>} */
export const PITCH_TARGETS = {
  pitch_intro: {
    selector: '#main-area',
    scrim: false,
    calloutLabel: '',
  },
  pitch_problem_laboratoriazo: {
    selector: '#main-area',
    scrim: false,
    calloutLabel: '',
  },
  map_sidebar: {
    selector: 'aside',
    secondarySelector: '#main-area',
    spotlight: 'primary',
    dockPrefer: 'right',
    calloutLabel: '① Lista de pacientes',
  },
  map_tabs: {
    selector: '#app-main-tablist',
    spotlight: 'primary',
    dockPrefer: 'below',
    calloutLabel: '② Pestañas principales',
  },
  pitch_mode_chips: {
    selector: '#header-app-mode-chip',
    spotlight: 'primary',
    calloutLabel: '③ Modo de trabajo',
  },
  map_lab_teaser: {
    appTab: 'lab',
    selector: '#lab-input',
    calloutLabel: '④ Cuadro SOME',
  },
  lab_bulk_separator: {
    appTab: 'lab',
    selector: '#btn-lab-patient-separator, #lab-input',
    scrollPolicy: 'none',
    calloutLabel: '⑤ Separador multipaciente',
  },
  pitch_lab_ready: {
    appTab: 'lab',
    selector: '#lab-output-section .lab-output-card-title, #lab-output-box',
    dockPrefer: 'left',
    calloutLabel: '⑥ Procesar y ver resultados',
  },
  sala_casiopea_lab: {
    appTab: 'lab',
    selector: '.lab-some-tables-modal',
    secondarySelector:
      '#lab-some-tables-modal-title, #lab-some-tables-modal-body .lab-some-table-wrap',
    spotlight: 'both',
    dockPrefer: 'left',
    dockFixedCorner: 'bottom-left',
    pitchModal: 'labSomeTables',
    scrollPolicy: 'none',
    calloutLabel: '⑦ Tablas SOME',
  },
  sala_expediente_tabs: {
    appTab: 'nota',
    selector: '.inner-tab-bar',
    calloutLabel: '⑧ Pestañas expediente',
  },
  pitch_cultivos: {
    appTab: 'nota',
    innerTab: 'cult',
    selector: '#cultivos-table-container .cultivos-table, #itab-cult',
    dockPrefer: 'right',
    calloutLabel: '⑨ Cultivos + antibiograma',
  },
  sala_tend: {
    appTab: 'nota',
    innerTab: 'tend',
    selector: '#tendencias-container',
    calloutLabel: '⑩ Tendencias',
  },
  sala_tend_chart: {
    appTab: 'nota',
    innerTab: 'tend',
    selector:
      '#tend-group-modal .tend-group-modal-head, #tend-group-modal .tend-group-plot-wrap, #tend-group-modal canvas',
    secondarySelector: '#tend-group-modal',
    spotlight: 'both',
    pitchModal: 'tendChart',
    dockPrefer: 'left',
    dockFixedCorner: 'top-left',
    scrollPolicy: 'none',
    calloutLabel: '⑪ Gráfica pantalla completa',
  },
  sala_casiopea_trends: {
    appTab: 'nota',
    innerTab: 'tend',
    selector: '[data-tour="casiopea-trends-send"]',
    calloutLabel: '⑫ Enviar a Neo (tendencias)',
  },
  estado_actual: {
    appTab: 'nota',
    innerTab: 'estadoActual',
    selector: '#itab-estadoActual, #estado-actual-panel',
    dockPrefer: 'left',
    calloutLabel: '⑬ Estado Actual',
  },
  pitch_pegar_monitoreo: {
    appTab: 'nota',
    innerTab: 'estadoActual',
    selector: '#ea-paste-backdrop.open .modal, #ea-paste-input',
    pitchModal: 'estadoPaste',
    dockPrefer: 'left',
    dockFixedCorner: 'bottom-left',
    scrollPolicy: 'none',
    calloutLabel: '⑭ Pegar monitoreo',
  },
  sala_med: {
    appTab: 'med',
    selector: '#med-input',
    calloutLabel: '⑮ Medicamentos',
  },
  listado_problemas: {
    appTab: 'nota',
    innerTab: 'listado',
    selector: '#btn-gen-listado, #itab-salida',
    dockPrefer: 'left',
    scrollPolicy: 'target',
    calloutLabel: '⑯ Listado de problemas',
  },
  pitch_modo_pase: {
    appTab: 'nota',
    selector: '#appcontent-pase, #pase-board-scroll',
    setDensity: 'pase',
    spotlight: 'primary',
    dockPrefer: 'right',
    scrollPolicy: 'target',
    calloutLabel: '⑰ Modo Pase',
  },
  pitch_switch_interconsulta: {
    selector: '#header-app-mode-chip',
    spotlight: 'primary',
    switchMode: 'interconsulta',
    dockPrefer: 'below',
    calloutLabel: '⑱ Cambio a Interconsulta',
  },
  ic_expediente_tabs: {
    appTab: 'nota',
    innerTab: 'notas',
    selector: '.inner-tab-bar, #btn-gen',
    spotlight: 'both',
    calloutLabel: '⑲ Expediente IC',
  },
  ic_nota: {
    appTab: 'nota',
    innerTab: 'notas',
    selector: '#btn-gen',
    dockPrefer: 'left',
    calloutLabel: '⑳ Generar Nota',
  },
  ic_indica: {
    appTab: 'nota',
    innerTab: 'indica',
    selector: '#btn-gen-ind',
    dockPrefer: 'left',
    calloutLabel: '㉑ Generar Indicaciones',
  },
  pitch_receta_hu: {
    appTab: 'nota',
    innerTab: 'recetaHu',
    selector: '#itab-receta-hu, #receta-hu-panel',
    calloutLabel: '㉒ Receta HU',
  },
  pitch_agenda: {
    appTab: 'agenda',
    selector: '#main-area',
    calloutLabel: '㉓ Agenda',
  },
  livesync_desktop: {
    selector: '#btn-header-team-sync',
    openConnection: true,
    calloutLabel: '㉔ Sala en vivo',
  },
  livesync_mobile: {
    selector: '#connection-dropdown',
    openConnection: true,
    calloutLabel: '㉕ R+ Móvil',
  },
  pitch_seguridad: {
    appTab: 'nota',
    selector: '#settings-dropdown.open, #settings-accordion-backup-sync',
    openSettings: true,
    dockPrefer: 'left',
    dockFixedCorner: 'bottom-left',
    calloutLabel: '㉖ Respaldos y datos',
  },
  wrap: {
    selector: '#main-area',
    scrim: false,
    calloutLabel: '',
  },
};

export function getPitchTourTarget(stepId) {
  return PITCH_TARGETS[stepId] || null;
}

export function resolvePitchScrollPolicy(stepId) {
  const t = getPitchTourTarget(stepId);
  if (!t) return 'target';
  return t.scrollPolicy || 'target';
}

/** En pitch siempre hay Siguiente; Word es opcional. */
export function pitchStepRequiresUserAction(_stepId) {
  return false;
}

export function assertPitchTargetsComplete() {
  const steps = getPitchTourSteps();
  const optionalCallout = new Set(['pitch_intro', 'pitch_problem_laboratoriazo', 'wrap']);
  for (const id of steps) {
    const t = getPitchTourTarget(id);
    if (!t) throw new Error('missing target: ' + id);
    if (!t.selector || String(t.selector).trim() === '') {
      throw new Error('empty selector: ' + id);
    }
    if (!optionalCallout.has(id)) {
      if (!t.calloutLabel || String(t.calloutLabel).trim() === '') {
        throw new Error('empty calloutLabel: ' + id);
      }
    }
  }
}
