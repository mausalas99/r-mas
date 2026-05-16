// Mapa de pasos del tour guiado a su zona objetivo en la UI.
// Pura: no toca DOM. La capa de UI usa estos descriptores para hacer
// scroll/foco/spotlight y decidir si esperar acción del usuario.

const SALA_STEPS = [
  'map_sidebar',
  'pase_enter',
  'pase_board',
  'map_tabs',
  'map_lab_teaser',
  'servicio_default',
  'lab_parse',
  'lab_view',
  'lab_send',
  'sala_tend',
  'estado_actual',
  'sala_med',
  'listado_problemas',
  'wrap',
];

const INTERCONSULTA_STEPS = [
  'map_sidebar',
  'pase_enter',
  'pase_board',
  'map_tabs',
  'map_lab_teaser',
  'lab_parse',
  'lab_view',
  'lab_send',
  'sala_tend',
  'sala_soap',
  'sala_med',
  'ic_nota',
  'ic_indica',
  'ic_exports',
  'profile',
  'wrap',
];

// Pasos cuyo avance depende de que el usuario presione un botón real
// (no se muestra "Siguiente" en el dock).
const ACTION_STEPS = new Set([
  'pase_enter',
  'lab_parse',
  'lab_send',
  'ic_nota',
  'ic_indica',
  'estado_actual',
  'listado_problemas',
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
  pase_enter:        { appTab: null,   selector: '#main-area',                                focus: false,
                       spotlightClass: 'tour-spotlight-action' },
  map_lab_teaser:    { appTab: 'lab',  selector: '#lab-input',                                focus: false,
                       spotlightClass: 'tour-spotlight-action' },
  servicio_default:  { appTab: null,   selector: '#settings-default-servicio',               focus: true,
                       openProfile: true },
  lab_parse:         { appTab: 'lab',  selector: '#btn-procesar, #lab-input',                focus: false },
  lab_view:          { appTab: 'lab',  selector: '#lab-output-section',                      focus: false },
  lab_send:          { appTab: 'lab',  selector: '#btn-enviar-nota',                         focus: false,
                       spotlightClass: 'tour-spotlight-soap' },
  sala_tend:         { appTab: 'nota', innerTab: 'tend',    selector: '#itab-content-tend',  focus: false },
  sala_soap:         { appTab: 'nota', innerTab: 'notas',   selector: '#btn-soap-template',  focus: false,
                       spotlightClass: 'tour-spotlight-soap' },
  estado_actual:     { appTab: 'nota', selector: '#btn-estado-actual',                      focus: false,
                       spotlightClass: 'tour-spotlight-soap' },
  sala_med:          { appTab: 'med',  selector: '#med-input',                               focus: false },
  listado_problemas: { appTab: 'nota', innerTab: 'listado', selector: '#itab-content-listado', focus: false },
  ic_nota:           { appTab: 'nota', innerTab: 'notas',   selector: '#btn-gen',            focus: false,
                       spotlightClass: 'tour-spotlight-soap' },
  ic_indica:         { appTab: 'nota', innerTab: 'indica',  selector: '#btn-gen-ind',        focus: false,
                       spotlightClass: 'tour-spotlight-soap' },
  ic_exports:        { appTab: null,   selector: '#settings-dropdown',                       focus: false,
                       openSettings: true },
  profile:           { appTab: null,   selector: '#profile-modal .modal',                    focus: false,
                       openProfile: true },
  wrap:              { appTab: null,   selector: 'aside .sidebar-header',                    focus: false },
  pase_board:        { appTab: 'nota', selector: '#pase-board-scroll',                       focus: false,
                       spotlightClass: 'tour-spotlight-action' },
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
