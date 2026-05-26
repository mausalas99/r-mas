// Mapa de pasos del tour guiado a su zona objetivo en la UI.
// Pura: no toca DOM. La capa de UI usa estos descriptores para hacer
// scroll/foco/spotlight y decidir si esperar acción del usuario.

const SALA_STEPS = [
  'map_sidebar',
  'map_tabs',
  'map_lab_teaser',
  'servicio_default',
  'lab_bulk_separator',
  'lab_parse',
  'lab_view',
  'sala_expediente_tabs',
  'sala_casiopea_lab',
  'sala_manejo',
  'sala_tend',
  'sala_tend_chart',
  'sala_casiopea_trends',
  'estado_actual',
  'sala_med',
  'listado_problemas',
  'livesync_desktop',
  'livesync_mobile',
  'wrap',
];

const INTERCONSULTA_STEPS = [
  'map_sidebar',
  'map_tabs',
  'map_lab_teaser',
  'lab_bulk_separator',
  'lab_parse',
  'lab_view',
  'ic_expediente_tabs',
  'sala_manejo',
  'sala_tend',
  'sala_tend_chart',
  'sala_soap',
  'sala_med',
  'ic_nota',
  'ic_indica',
  'ic_exports',
  'profile',
  'livesync_desktop',
  'livesync_mobile',
  'wrap',
];

// Pasos cuyo avance depende de que el usuario presione un botón real
// (no se muestra "Siguiente" en el dock).
const ACTION_STEPS = new Set([
  'lab_parse',
  'ic_nota',
  'ic_indica',
  'estado_actual',
  'servicio_default',
]);

// Descriptores de objetivo por paso. Selectores son CSS queries
// resueltos por la capa de UI con document.querySelector(). Los IDs
// reales viven en index.html / app.js.
const TARGETS = {
  map_sidebar:       { appTab: null,   selector: 'aside',                                     focus: false,
                       spotlightClass: 'tour-spotlight-action' },
  map_tabs:          { appTab: null,   selector: '#main-area',                                focus: false,
                       spotlightClass: 'tour-spotlight-action' },
  map_lab_teaser:    { appTab: 'lab',  selector: '#lab-input',                                focus: false,
                       spotlightClass: 'tour-spotlight-action' },
  lab_bulk_separator: { appTab: 'lab', selector: '#btn-lab-patient-separator, #lab-input', focus: false,
                       spotlightClass: 'tour-spotlight-action' },
  servicio_default:  { appTab: null,   selector: '#settings-default-servicio',               focus: true,
                       openProfile: true },
  lab_parse:         { appTab: 'lab',  selector: '#btn-procesar, #lab-input',                focus: false },
  lab_view:          { appTab: 'lab',  selector: '#lab-output-section',                      focus: false },
  sala_casiopea_lab: {
    appTab: 'lab',
    selector: '#lab-some-tables-btn',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  sala_manejo: {
    appTab: 'nota',
    innerTab: 'manejo',
    selector: '#manejo-container, #exp-segment-manejo, #itab-clinico',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
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
  sala_tend:         { appTab: 'nota', innerTab: 'tend',    selector: '#tendencias-container', focus: false },
  sala_tend_chart:   { appTab: 'nota', innerTab: 'tend',    selector: '#tendencias-container .tend-section-chart-btn',
                       focus: false, spotlightClass: 'tour-spotlight-action' },
  sala_casiopea_trends: {
    appTab: 'nota',
    innerTab: 'tend',
    selector: '[data-tour="casiopea-trends-send"]',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  sala_soap:         { appTab: 'nota', innerTab: 'notas',   selector: '#btn-soap-template',  focus: false,
                       spotlightClass: 'tour-spotlight-soap' },
  estado_actual:     { appTab: 'nota', selector: '#btn-estado-actual',                      focus: false,
                       spotlightClass: 'tour-spotlight-soap' },
  sala_med:          { appTab: 'med',  selector: '#med-input',                               focus: false },
  listado_problemas: {
    appTab: 'nota',
    innerTab: 'listado',
    selector: '#btn-gen-listado, #itab-salida',
    focus: false,
    spotlightClass: 'tour-spotlight-action',
  },
  ic_nota:           { appTab: 'nota', innerTab: 'notas',   selector: '#btn-gen',            focus: false,
                       spotlightClass: 'tour-spotlight-soap' },
  ic_indica:         { appTab: 'nota', innerTab: 'indica',  selector: '#btn-gen-ind',        focus: false,
                       spotlightClass: 'tour-spotlight-soap' },
  ic_exports:        { appTab: null,   selector: '#settings-dropdown',                       focus: false,
                       openSettings: true },
  profile:           { appTab: null,   selector: '#profile-modal .modal',                    focus: false,
                       openProfile: true },
  wrap:              { appTab: null,   selector: 'aside .sidebar-header',                    focus: false },
  livesync_desktop:  { appTab: null,   selector: '#btn-header-team-sync',                    focus: false,
                       openConnection: true, spotlightClass: 'tour-spotlight-action' },
  livesync_mobile:   { appTab: null,   selector: '#connection-dropdown', focus: false, openConnection: true },
};

export function getSalaTourSteps() {
  return SALA_STEPS.slice();
}

export function getInterconsultaTourSteps() {
  return INTERCONSULTA_STEPS.slice();
}

export function getTourSteps(branch) {
  return branch === 'interconsulta' ? getInterconsultaTourSteps() : getSalaTourSteps();
}

export function stepRequiresUserAction(stepId) {
  return ACTION_STEPS.has(stepId);
}

export function getTourTarget(stepId, _branch) {
  const t = TARGETS[stepId];
  if (!t) return { appTab: null, selector: null, focus: false };
  return Object.assign({}, t);
}
