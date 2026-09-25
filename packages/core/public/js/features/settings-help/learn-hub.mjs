import {
  GUARDIA_V7_HUB_MODULES,
  QUICK_ROUTE_HUB_MODULE,
  SALA_HUB_MODULES,
  IC_HUB_MODULES,
  GUARDIA_V7_CHAPTERS,
  SALA_CHAPTERS,
  IC_CHAPTERS,
  getChapterForStep,
  getChapterProgressLabel,
} from '../../onboarding-curriculum.mjs';
import { loadTourProgress } from '../../onboarding-progress.mjs';
import {
  loadGuardiaV7Progress,
  resetGuardiaV7Chapter,
} from '../../guardia-v7-progress.mjs';
import {
  loadFundamentosProgress,
  fundamentosModuleCount,
  isFundamentosChapterId,
} from '../../fundamentos-progress.mjs';
import { isMobileWeb } from '../../mobile-web.mjs';
import { closeModalAnimated } from '../../ui-motion.mjs';
import { needsClinicalOnboarding } from '../clinical-onboarding.mjs';
import { settingsHelpBridge } from './bridges.mjs';
import { getSettingsHelpRuntime } from './runtime.mjs';

import { escapeHtml } from '../../dom-escape.mjs';
import { buildModuleRow, LEARN_HUB_CHEVRON } from './learn-hub-module-row.mjs';

let learnHubDismissWired = false;
let learnHubLastFocus = null;

function stepCountForChapter(chapterId, branch) {
  if (branch === 'quick-route') {
    return QUICK_ROUTE_HUB_MODULE.stepCount || 0;
  }
  if (branch === 'guardia-v7') {
    const ch = GUARDIA_V7_CHAPTERS.find((c) => c.id === chapterId);
    return ch ? ch.stepIds.length : 0;
  }
  if (branch === 'interconsulta') {
    const ch = IC_CHAPTERS.find((c) => c.id === chapterId);
    return ch ? ch.stepIds.length : 0;
  }
  const ch = SALA_CHAPTERS.find((c) => c.id === chapterId);
  return ch ? ch.stepIds.length : 0;
}

function startLearnModule(chapterId) {
  closeLearnHub();
  void import('./tour-runtime.mjs').then((mod) => {
    if (typeof mod.startTourModule === 'function') mod.startTourModule(chapterId);
  });
}

function resetLearnModuleProgress(chapterId, branch, focusTrack) {
  if (branch === 'guardia-v7') {
    resetGuardiaV7Chapter(chapterId);
    getSettingsHelpRuntime().showToast('Módulo reseteado. Ábrelo cuando quieras.', 'info');
    renderLearnHubBody(focusTrack);
  }
}

function guardiaModuleState(chapterId, progress, tourProgress) {
  const chapterSteps = stepCountForChapter(chapterId, 'guardia-v7');
  const completed = progress.completedChapters.includes(chapterId);
  let inProgress = false;
  let stepInChapter = 0;
  if (tourProgress && tourProgress.branch === 'guardia-v7' && tourProgress.stepId) {
    const ch = getChapterForStep(tourProgress.stepId, 'guardia-v7');
    if (ch.id === chapterId) {
      inProgress = !completed;
      const prog = getChapterProgressLabel(tourProgress.stepId, 'guardia-v7');
      stepInChapter = prog.stepInChapter;
    }
  }
  return {
    completed,
    inProgress,
    stepInChapter,
    chapterSteps,
    active: inProgress && tourProgress && tourProgress.chapterId === chapterId,
  };
}

function fundamentosModuleState(chapterId, branch, progress, tourProgress) {
  const chapterSteps = stepCountForChapter(chapterId, branch);
  const completed = progress.completedChapters.includes(chapterId);
  let inProgress = false;
  let stepInChapter = 0;
  if (
    tourProgress &&
    tourProgress.branch !== 'guardia-v7' &&
    tourProgress.branch === branch &&
    tourProgress.stepId
  ) {
    const ch = getChapterForStep(tourProgress.stepId, branch);
    if (ch.id === chapterId) {
      inProgress = !completed;
      const prog = getChapterProgressLabel(tourProgress.stepId, branch);
      stepInChapter = prog.stepInChapter;
    }
  }
  return {
    completed,
    inProgress,
    stepInChapter,
    chapterSteps,
    active: inProgress && tourProgress && tourProgress.chapterId === chapterId,
  };
}

function trackHeader(title, done, total) {
  return (
    '<summary class="learn-hub-track-title">' +
    `<span class="learn-hub-track-name">${title}</span>` +
    `<span class="learn-hub-track-count">${done} de ${total}</span>` +
    `<progress class="learn-hub-bar learn-hub-bar--track" max="${total}" value="${done}" aria-hidden="true"></progress>` +
    '<span class="learn-hub-track-toggle" aria-hidden="true">' + LEARN_HUB_CHEVRON + '</span>' +
    '</summary>'
  );
}

function renderLearnHubOverview(done, total, parts) {
  const label = done === 0
    ? 'Elige un módulo para empezar.'
    : done >= total ? '¡Completaste todos los módulos!' : 'Sigue a tu ritmo.';
  parts.push(
    '<div class="learn-hub-overview">' +
    '<div class="learn-hub-overview-top">' +
    `<span class="learn-hub-overview-count"><strong>${done}</strong> de ${total} módulos</span>` +
    `<span class="learn-hub-overview-label">${label}</span>` +
    '</div>' +
    `<progress class="learn-hub-bar" max="${total}" value="${done}" aria-label="Progreso: ${done} de ${total} módulos"></progress>` +
    '</div>'
  );
}

function renderLearnHubContinueSection(tourProgress, parts) {
  if (!tourProgress) return;
  let title = 'Tutorial';
  let meta = '';
  try {
    const prog = getChapterProgressLabel(tourProgress.stepId, tourProgress.branch);
    if (prog.chapterTitle) title = prog.chapterTitle;
    if (prog.chapterSteps) meta = `Paso ${prog.stepInChapter} de ${prog.chapterSteps}`;
  } catch { /* keep generic label */ }
  parts.push(
    '<button type="button" class="learn-hub-resume" id="learn-hub-btn-continue">' +
    '<span class="learn-hub-resume-text">' +
    '<span class="learn-hub-resume-kicker">Seguir donde quedaste</span>' +
    `<span class="learn-hub-resume-title">${escapeHtml(title)}</span>` +
    (meta ? `<span class="learn-hub-resume-meta">${meta}</span>` : '') +
    '</span>' +
    '<span class="learn-hub-resume-go">Continuar' + LEARN_HUB_CHEVRON + '</span>' +
    '</button>'
  );
}

function renderLearnHubQuickRouteCard(parts) {
  parts.push(
    '<div class="learn-hub-module-card learn-hub-module-card--cta">' +
    '<button type="button" class="learn-hub-module-hit"' +
    ` data-learn-chapter="${escapeHtml(QUICK_ROUTE_HUB_MODULE.chapterId)}"` +
    ' data-learn-branch="quick-route"' +
    ' title="Ruta rápida — mapa, alta, labs y turno">' +
    '<span class="learn-hub-module-mark" aria-hidden="true">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>' +
    '</span>' +
    '<span class="learn-hub-module-main">' +
    '<span class="learn-hub-module-kicker">Recomendado para empezar</span>' +
    `<span class="learn-hub-module-title">${escapeHtml(QUICK_ROUTE_HUB_MODULE.label)}</span>` +
    `<span class="learn-hub-module-meta">${QUICK_ROUTE_HUB_MODULE.stepCount} pasos · ~5 min</span>` +
    '</span>' +
    LEARN_HUB_CHEVRON +
    '</button></div>'
  );
}

function renderLearnHubNovedadesTrack(parts, focusTrack, progress, tourProgress) {
  const total = GUARDIA_V7_HUB_MODULES.length;
  const done = GUARDIA_V7_HUB_MODULES.filter((m) =>
    progress.completedChapters.includes(m.chapterId)
  ).length;
  parts.push(
    `<details class="learn-hub-track"${focusTrack !== 'fundamentos' ? ' open' : ''}>` +
    trackHeader('Guardia y R+ Cloud', done, total) +
    '<div class="learn-hub-track-body">' +
    '<p class="learn-hub-section-lead">Módulos cortos. Haz cualquiera, en cualquier orden.</p>' +
    '<div class="learn-hub-module-list">'
  );
  renderLearnHubQuickRouteCard(parts);
  GUARDIA_V7_HUB_MODULES.forEach((mod, idx) => {
    const st = guardiaModuleState(mod.chapterId, progress, tourProgress);
    parts.push(
      buildModuleRow({
        ...st,
        chapterId: mod.chapterId,
        label: mod.label,
        branch: 'guardia-v7',
        moduleIndex: idx + 1,
        allowReset: true,
      })
    );
  });
  parts.push('</div></div></details>');
}

function renderFundamentosGroup(parts, heading, modules, branch, fundamentosProgress, tourProgress) {
  parts.push(`<p class="learn-hub-group-label">${heading}</p><div class="learn-hub-module-list">`);
  modules.forEach((mod, idx) => {
    const st = fundamentosModuleState(mod.chapterId, branch, fundamentosProgress, tourProgress);
    parts.push(
      buildModuleRow({ ...st, chapterId: mod.chapterId, label: mod.label, branch, moduleIndex: idx + 1 })
    );
  });
  parts.push('</div>');
}

function renderLearnHubFundamentosTrack(parts, focusTrack, fundamentosProgress, tourProgress) {
  const total = fundamentosModuleCount();
  const done = fundamentosProgress.completedChapters.filter((id) => isFundamentosChapterId(id)).length;
  parts.push(
    `<details class="learn-hub-track"${focusTrack === 'fundamentos' ? ' open' : ''}>` +
    trackHeader('Fundamentos', done, total) +
    '<div class="learn-hub-track-body">' +
    '<p class="learn-hub-section-lead">La base de R+: Paciente, Laboratorio y Manejo. Elige Sala o Interconsulta según tu rol.</p>'
  );
  renderFundamentosGroup(parts, 'Sala', SALA_HUB_MODULES.filter((m) => m.chapterId), 'sala', fundamentosProgress, tourProgress);
  renderFundamentosGroup(parts, 'Interconsulta', IC_HUB_MODULES, 'interconsulta', fundamentosProgress, tourProgress);
  parts.push('</div></details>');
}

export function renderLearnHubBody(focusTrack = 'guardia-v7') {
  const host = document.getElementById('learn-hub-body');
  if (!host) return;

  const progress = loadGuardiaV7Progress();
  const fundamentosProgress = loadFundamentosProgress();
  const tourProgress = loadTourProgress();
  const parts = [];

  const done =
    GUARDIA_V7_HUB_MODULES.filter((m) => progress.completedChapters.includes(m.chapterId)).length +
    fundamentosProgress.completedChapters.filter((id) => isFundamentosChapterId(id)).length;
  renderLearnHubOverview(done, GUARDIA_V7_HUB_MODULES.length + fundamentosModuleCount(), parts);
  renderLearnHubContinueSection(tourProgress, parts);
  renderLearnHubNovedadesTrack(parts, focusTrack, progress, tourProgress);
  renderLearnHubFundamentosTrack(parts, focusTrack, fundamentosProgress, tourProgress);

  parts.push(
    '<button type="button" class="learn-hub-help-link" id="learn-hub-btn-help">' +
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
    '<span>Buscar en el centro de ayuda</span></button>'
  );

  host.innerHTML = parts.join('');
  wireLearnHubBodyOnce(host);
}

function wireLearnHubBodyOnce(host) {
  if (host._rpcLearnHubWired) return;
  host._rpcLearnHubWired = true;

  host.addEventListener('click', (ev) => {
    const resetBtn = ev.target.closest('[data-learn-reset]');
    if (resetBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      resetLearnModuleProgress(
        resetBtn.getAttribute('data-learn-reset'),
        resetBtn.getAttribute('data-learn-reset-branch') || 'guardia-v7',
        'guardia-v7'
      );
      return;
    }
    const row = ev.target.closest('[data-learn-chapter]');
    if (row) {
      startLearnModule(row.getAttribute('data-learn-chapter'));
      return;
    }
    if (ev.target.closest('#learn-hub-btn-continue')) {
      closeLearnHub();
      void import('./tour-flow.mjs').then((mod) => {
        if (typeof mod.resumeGuidedTourFromProgress === 'function') {
          mod.resumeGuidedTourFromProgress();
        }
      });
      return;
    }
    if (ev.target.closest('#learn-hub-btn-help')) {
      closeLearnHub();
      if (typeof settingsHelpBridge.openQuickHelp === 'function') {
        settingsHelpBridge.openQuickHelp();
      } else {
        void import('./help-content.mjs').then((mod) => {
          if (typeof mod.openQuickHelp === 'function') mod.openQuickHelp();
        });
      }
    }
  });
}

function wireLearnHubDismiss() {
  if (learnHubDismissWired) return;
  learnHubDismissWired = true;
  const bd = document.getElementById('learn-hub-backdrop');
  if (!bd) return;
  bd.addEventListener('click', (ev) => {
    if (!bd.classList.contains('open')) return;
    const sheet = bd.querySelector('.learn-hub-sheet');
    if (sheet && sheet.contains(ev.target)) return;
    closeLearnHub();
  });
  document.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
      if (!bd.classList.contains('open')) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeLearnHub();
    },
    true
  );
}

export function syncLearnAprenderChrome() {
  const btn = document.getElementById('btn-open-learn');
  if (!btn) return;
  btn.hidden = isMobileWeb() || needsClinicalOnboarding();
}

export function openLearnHub(opts = {}) {
  if (isMobileWeb()) return;
  wireLearnHubDismiss();
  renderLearnHubBody(opts.focusTrack || 'guardia-v7');
  const bd = document.getElementById('learn-hub-backdrop');
  if (!bd) return;
  learnHubLastFocus = document.activeElement;
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  const closeBtn = bd.querySelector('.learn-hub-close');
  if (closeBtn && typeof closeBtn.focus === 'function') {
    try {
      closeBtn.focus();
    } catch { /* focus may fail if element not focusable */ }
  }
  syncLearnAprenderChrome();
  if (typeof settingsHelpBridge.syncLearnHubContinueVisibility === 'function') {
    settingsHelpBridge.syncLearnHubContinueVisibility();
  }
}

export function closeLearnHub() {
  const bd = document.getElementById('learn-hub-backdrop');
  if (!bd) return;
  const prev = learnHubLastFocus;
  closeModalAnimated(bd, function () {
    learnHubLastFocus = null;
    if (prev && typeof prev.focus === 'function') {
      try {
        prev.focus();
      } catch { /* restore focus may fail */ }
    }
  });
}
