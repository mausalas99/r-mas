/** Fundamentos (sala / interconsulta) tour steps: which button state each step wants. The copy is drawn by tour-flow-views.jsx. */
import { stepRequiresUserAction } from '../../tour-targets.mjs';
import { getUiDensity } from '../chrome.mjs';
import { hideTourDock } from './tour-engine.mjs';
import { LIVESYNC_BTN_COPY, MOBILE_SCOPE_COPY } from './tour-flow-guardia-copy.mjs';
import { drawFundamentosBody } from './tour-flow-views.jsx';
import { tourState } from './tour-state.mjs';

function showNext(nextBtn, label) {
  nextBtn.style.display = '';
  nextBtn.textContent = label || 'Siguiente';
}

function hideNext(nextBtn) {
  nextBtn.style.display = 'none';
}

function finishNext(nextBtn) {
  showNext(nextBtn, 'Finalizar');
  nextBtn.setAttribute('onclick', 'guidedTourFinish()');
}

function getPlatformShortcutKey() {
  return navigator.platform && /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl';
}

/** Steps with no Siguiente: the user does the thing on screen first. */
const HIDE_NEXT = ['lab_parse', 'ic_nota', 'ic_indica', 'estado_actual_registro'];
/** Every other handled step shows Siguiente; livesync_desktop hides it only while its action is pending. */
const SHOW_NEXT = [
  'map_sidebar', 'map_tabs', 'map_add_patient', 'map_incomplete', 'ic_board_map', 'ic_board_drilldown',
  'ic_board_actions', 'ic_consult_band', 'map_lab_teaser', 'lab_view', 'ic_expediente_tabs',
  'sala_expediente_tabs', 'ic_exports', 'sala_tend', 'sala_tend_chart', 'sala_med', 'profile',
  'servicio_default', 'estado_actual', 'estado_actual_review', 'eventualidades', 'listado_problemas',
  'sala_vpo', 'sala_agenda', 'livesync_mobile',
];

/** What the old per-step handlers did to the Siguiente button; null = not a Fundamentos step. */
function nextButtonMode(stepId) {
  if (HIDE_NEXT.includes(stepId)) return 'hide';
  if (SHOW_NEXT.includes(stepId)) return 'show';
  if (stepId === 'livesync_desktop') return stepRequiresUserAction(stepId) ? 'hide' : 'keep';
  if (stepId === 'wrap') return 'finish';
  return null;
}

function renderFundamentosStep(stepId, bodyEl, nextBtn) {
  var mode = nextButtonMode(stepId);
  if (!mode) {
    hideTourDock();
    return;
  }
  drawFundamentosBody(bodyEl, {
    stepId,
    mod: getPlatformShortcutKey(),
    dense: getUiDensity() !== 'normal',
    interconsulta: tourState.guidedTourBranch === 'interconsulta',
    desktop: !!window.electronAPI && typeof window.electronAPI.getAppVersion === 'function',
    livesyncBtn: LIVESYNC_BTN_COPY,
    mobileScope: MOBILE_SCOPE_COPY,
  });
  if (mode === 'show') showNext(nextBtn);
  else if (mode === 'hide') hideNext(nextBtn);
  else if (mode === 'finish') finishNext(nextBtn);
}

export { renderFundamentosStep, nextButtonMode };
