/** Tour dock step rendering. */
import { stepRequiresUserAction } from '../../tour-targets.mjs';
import { getChapterProgressLabel } from '../../onboarding-curriculum.mjs';
import {
  getGuidedTourSteps,
  resolveTourBranch,
  syncTourDockPlacement,
  syncTourSoapButtonHighlight,
  syncTourActionNextButton,
  armTourActionPoll,
  guidedTourStepIndex,
} from './tour-engine.mjs';
import { getGuardiaV7StepHtml } from './tour-flow-guardia-copy.mjs';
import { drawQuickRouteBody, drawTourBadge } from './tour-flow-views.jsx';
import { renderFundamentosStep } from './tour-flow-fundamentos-steps.mjs';
import { tourState } from './tour-state.mjs';

function syncTourDockBranchClass(branch) {
  var d = document.getElementById('tour-dock');
  if (!d) return;
  d.classList.toggle('tour-dock--guardia', branch === 'guardia-v7');
  d.classList.toggle('tour-dock--fundamentos', branch === 'sala' || branch === 'interconsulta');
  d.classList.toggle('tour-dock--quick-route', branch === 'quick-route');
}

function resetTourNextButton(nextBtn) {
  nextBtn.style.display = '';
  nextBtn.disabled = false;
  nextBtn.setAttribute('onclick', 'guidedTourClickNext()');
}

function renderQuickRouteStepCopy(bodyEl, nextBtn) {
  var id = tourState.tourStepId;
  if (id === 'map_tabs' || id === 'map_add_patient' || id === 'lab_parse') {
    drawQuickRouteBody(bodyEl, id);
    if (id === 'lab_parse') nextBtn.style.display = 'none';
    else nextBtn.textContent = 'Siguiente';
    return true;
  }
  if (id.indexOf('gv7_') === 0) {
    bodyEl.innerHTML = getGuardiaV7StepHtml(id);
    nextBtn.textContent = 'Siguiente';
    return true;
  }
  return false;
}

function renderTourDockBadge(tourBranch, prog, idx, total) {
  var badge = document.getElementById('tour-step-badge');
  if (!badge) return;
  drawTourBadge(badge, { branch: tourBranch, prog, idx, total });
}

function finalizeTourStepRender(prevBtn) {
  syncTourDockPlacement();
  syncTourSoapButtonHighlight();
  syncTourActionNextButton();
  armTourActionPoll();
  if (prevBtn) prevBtn.disabled = guidedTourStepIndex() <= 0;
}

function applyTourStepUserActionGate(nextBtn) {
  if (stepRequiresUserAction(tourState.tourStepId) && tourState.tourStepId !== 'servicio_default') {
    nextBtn.style.display = 'none';
  }
}

function renderQuickRouteWrap(bodyEl, nextBtn, prevBtn) {
  drawQuickRouteBody(bodyEl, 'quick_wrap');
  nextBtn.textContent = 'Finalizar';
  nextBtn.style.display = '';
  nextBtn.setAttribute('onclick', 'guidedTourFinish()');
  finalizeTourStepRender(prevBtn);
}

function renderQuickRouteBranch(bodyEl, nextBtn, prevBtn) {
  var quickHandled = renderQuickRouteStepCopy(bodyEl, nextBtn);
  if (!quickHandled) return false;
  if (stepRequiresUserAction(tourState.tourStepId)) {
    nextBtn.style.display = 'none';
  }
  finalizeTourStepRender(prevBtn);
  return true;
}

function renderGuardiaV7Branch(bodyEl, nextBtn, prevBtn) {
  bodyEl.innerHTML = getGuardiaV7StepHtml(tourState.tourStepId);
  var gv7Steps = getGuidedTourSteps();
  var gv7Idx = gv7Steps.indexOf(tourState.tourStepId);
  nextBtn.textContent =
    gv7Idx >= 0 && gv7Idx >= gv7Steps.length - 1 ? 'Finalizar módulo' : 'Siguiente';
  if (stepRequiresUserAction(tourState.tourStepId)) {
    nextBtn.style.display = 'none';
  }
  finalizeTourStepRender(prevBtn);
}

function renderGuardiaOrQuickRouteStep(bodyEl, nextBtn, prevBtn, tourBranch) {
  if (tourBranch !== 'guardia-v7' && tourBranch !== 'quick-route') return false;
  if (tourBranch === 'quick-route' && tourState.tourStepId === 'quick_wrap') {
    renderQuickRouteWrap(bodyEl, nextBtn, prevBtn);
    return true;
  }
  if (tourBranch === 'quick-route' && renderQuickRouteBranch(bodyEl, nextBtn, prevBtn)) {
    return true;
  }
  renderGuardiaV7Branch(bodyEl, nextBtn, prevBtn);
  return true;
}

function renderTourStep() {
  if (!tourState.guidedTourActive) return;
  var bodyEl = document.getElementById('tour-dock-body');
  var nextBtn = document.getElementById('tour-btn-next');
  var prevBtn = document.getElementById('tour-btn-prev');
  var steps = getGuidedTourSteps();
  var total = steps.length;
  var idx = guidedTourStepIndex() + 1;
  var tourBranch = resolveTourBranch();
  syncTourDockBranchClass(tourBranch);
  var prog = getChapterProgressLabel(tourState.tourStepId, tourBranch);
  renderTourDockBadge(tourBranch, prog, idx, total);
  resetTourNextButton(nextBtn);

  if (renderGuardiaOrQuickRouteStep(bodyEl, nextBtn, prevBtn, tourBranch)) {
    return;
  }

  renderFundamentosStep(tourState.tourStepId, bodyEl, nextBtn);
  applyTourStepUserActionGate(nextBtn);
  finalizeTourStepRender(prevBtn);
}

export { renderTourStep };
