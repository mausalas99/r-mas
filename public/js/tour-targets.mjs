// Mapa de pasos del tour guiado a su zona objetivo en la UI.
// Pura: no toca DOM. La capa de UI usa estos descriptores para hacer
// scroll/foco/spotlight y decidir si esperar acción del usuario.

import {
  getSalaTourSteps as curriculumSalaSteps,
  getInterconsultaTourSteps as curriculumIcSteps,
  getQuickRouteTourSteps as curriculumQuickRouteSteps,
} from './onboarding-curriculum.mjs';

// Pasos cuyo avance depende de que el usuario presione un botón real
// (no se muestra "Siguiente" en el dock).
const ACTION_STEPS = new Set([
  'lab_parse',
  'estado_actual_registro',
  'servicio_default',
  'livesync_desktop',
]);

// Descriptores de objetivo por paso. Selectores son CSS queries
// resueltos por la capa de UI con document.querySelector(). Los IDs
// reales viven en index.html / app.js.
const TARGETS = {
  map_sidebar:       { appTab: null,   selector: 'aside',                                     focus: false,
                       spotlightClass: 'tour-spotlight-action' },
  map_tabs:          { appTab: null,   selector: '#app-main-tablist',                         focus: false,
                       spotlightClass: 'tour-spotlight-action' },
  map_add_patient:   { appTab: null,   selector: 'aside .btn-add',                            focus: false,
                       spotlightClass: 'tour-spotlight-action' },
  map_incomplete:    { appTab: null,   selector: '#m-cuarto, #m-cama, #m-servicio',           focus: false,
                       spotlightClass: 'tour-spotlight-action', openAddModalFullManual: true },
  map_lab_teaser:    { appTab: 'lab',  selector: '#lab-input',                                focus: false,
                       spotlightClass: 'tour-spotlight-action', openLabPasteModal: true },
  lab_bulk_separator: { appTab: 'lab', selector: '#btn-lab-patient-separator, #lab-input', focus: false,
                       spotlightClass: 'tour-spotlight-action', openLabPasteModal: true },
  servicio_default:  { appTab: null,   selector: '#settings-default-servicio',               focus: true,
                       openProfile: true },
  lab_parse:         { appTab: 'lab',  selector: '#btn-procesar, #lab-input',                focus: false,
                       openLabPasteModal: true },
  lab_view:          { appTab: 'lab',  selector: '#lab-output-section',                      focus: false },
  ic_expediente_tabs: {
    appTab: 'nota',
    selector: '.inner-tab-bar',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  sala_expediente_tabs: {
    appTab: 'nota',
    selector: '.inner-tab-bar',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  eventualidades: {
    appTab: 'nota',
    innerTab: 'eventualidades',
    selector: '#exp-segment-eventualidades, #itab-content-eventualidades',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  sala_tend:         { appTab: 'lab', labInner: 'tend', selector: '#lab-inner-tend-mount, #tendencias-container', focus: false },
  sala_tend_chart:   { appTab: 'lab', labInner: 'tend', selector: '#tendencias-container .tend-section-chart-btn',
                       focus: false, spotlightClass: 'tour-spotlight-action' },
  estado_actual: {
    appTab: 'nota',
    innerTab: 'estadoActual',
    selector: '#ea-snapshot, #ea-charts-summary, #ea-historial',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  estado_actual_registro: {
    appTab: 'nota',
    innerTab: 'estadoActual',
    selector:
      '#ea-registro-backdrop.open .ea-vitals-grid, #ea-registro-backdrop.open .ea-glu-section, #ea-registro-backdrop.open .ea-io-grid',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
    openEaRegistro: true,
  },
  estado_actual_review: {
    appTab: 'nota',
    innerTab: 'estadoActual',
    selector: '#ea-snapshot, #ea-charts-summary, #ea-historial, .ea-estado-clinico',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  sala_med:          { appTab: 'med',  selector: '#med-import-open-btn',                      focus: false },
  evaluacion_inicial: {
    appTab: 'nota',
    innerTab: 'evaluacionInicial',
    selector: '#itab-content-evaluacionInicial',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  sala_hoja_ic: {
    appTab: 'nota',
    innerTab: 'hojaIC',
    selector: '#itab-content-hojaIC, #hoja-ic-container, #btn-hoja-ic-export',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  sala_agenda: {
    appTab: 'agenda',
    selector: '#apptab-agenda, #appcontent-agenda .rpc-proc-agenda-root',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  consulta_ic:       { appTab: 'nota', innerTab: 'consultaIC', selector: '#consulta-ic-container',
                       focus: false, spotlightClass: 'tour-spotlight-action' },
  ic_exports:        { appTab: null,   selector: '#settings-dropdown',                       focus: false,
                       openSettings: true },
  profile:           { appTab: null,   selector: '#profile-modal .modal',                    focus: false,
                       openProfile: true },
  wrap:              { appTab: null,   selector: 'aside .sidebar-header',                    focus: false },
  quick_wrap:        { appTab: null,   selector: '#btn-open-learn, aside .sidebar-header', focus: false },
  livesync_desktop:  { appTab: null,   selector: '#btn-header-team-sync, #connection-dropdown',                    focus: false,
                       openConnection: true,
                       spotlightClass: 'tour-spotlight-action' },
  livesync_mobile:   { appTab: null,   selector: '#connection-dropdown', focus: false, openConnection: true },
};

export function getSalaTourSteps() {
  return curriculumSalaSteps();
}

export function getInterconsultaTourSteps() {
  return curriculumIcSteps();
}

export function getQuickRouteTourSteps() {
  return curriculumQuickRouteSteps();
}

export function getTourSteps(branch) {
  if (branch === 'interconsulta') return getInterconsultaTourSteps();
  if (branch === 'quick-route') return getQuickRouteTourSteps();
  return getSalaTourSteps();
}

export function stepRequiresUserAction(stepId) {
  return ACTION_STEPS.has(stepId);
}

export function getTourTarget(stepId, _branch) {
  const t = TARGETS[stepId];
  if (!t) return { appTab: null, selector: null, focus: false };
  return Object.assign({}, t);
}
