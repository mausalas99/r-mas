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

import { drawLearnHubBody } from '../learn-hub-view.jsx';

let learnHubDismissWired = false;
let learnHubLastFocus = null;
/** Track the open hub was focused on; a re-render keeps it. */
let learnHubFocusTrack = 'guardia-v7';

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

function resumeModel(tourProgress) {
  if (!tourProgress) return null;
  let title = 'Tutorial';
  let meta = '';
  try {
    const prog = getChapterProgressLabel(tourProgress.stepId, tourProgress.branch);
    if (prog.chapterTitle) title = prog.chapterTitle;
    if (prog.chapterSteps) meta = `Paso ${prog.stepInChapter} de ${prog.chapterSteps}`;
  } catch { /* keep generic label */ }
  return { title, meta };
}

function fundamentosGroup(heading, modules, branch, fundamentosProgress, tourProgress) {
  return {
    heading,
    rows: modules.map((mod, idx) => ({
      ...fundamentosModuleState(mod.chapterId, branch, fundamentosProgress, tourProgress),
      chapterId: mod.chapterId,
      label: mod.label,
      branch,
      moduleIndex: idx + 1,
    })),
  };
}

/** What the hub shows, from the saved progress. The drawing is in ../learn-hub-view.jsx. */
export function buildLearnHubModel(focusTrack = learnHubFocusTrack) {
  const progress = loadGuardiaV7Progress();
  const fundamentosProgress = loadFundamentosProgress();
  const tourProgress = loadTourProgress();
  const novedadesDone = GUARDIA_V7_HUB_MODULES.filter((m) => progress.completedChapters.includes(m.chapterId)).length;
  const fundamentosDone = fundamentosProgress.completedChapters.filter((id) => isFundamentosChapterId(id)).length;
  return {
    overview: { done: novedadesDone + fundamentosDone, total: GUARDIA_V7_HUB_MODULES.length + fundamentosModuleCount() },
    resume: resumeModel(tourProgress),
    quick: QUICK_ROUTE_HUB_MODULE,
    novedades: {
      open: focusTrack !== 'fundamentos',
      done: novedadesDone,
      total: GUARDIA_V7_HUB_MODULES.length,
      rows: GUARDIA_V7_HUB_MODULES.map((mod, idx) => ({
        ...guardiaModuleState(mod.chapterId, progress, tourProgress),
        chapterId: mod.chapterId,
        label: mod.label,
        branch: 'guardia-v7',
        moduleIndex: idx + 1,
        allowReset: true,
      })),
    },
    fundamentos: {
      open: focusTrack === 'fundamentos',
      done: fundamentosDone,
      total: fundamentosModuleCount(),
      groups: [
        fundamentosGroup('Sala', SALA_HUB_MODULES.filter((m) => m.chapterId), 'sala', fundamentosProgress, tourProgress),
        fundamentosGroup('Interconsulta', IC_HUB_MODULES, 'interconsulta', fundamentosProgress, tourProgress),
      ],
    },
  };
}

export function renderLearnHubBody(focusTrack = learnHubFocusTrack) {
  const host = document.getElementById('learn-hub-body');
  if (!host) return;
  learnHubFocusTrack = focusTrack;
  drawLearnHubBody(host, buildLearnHubModel(focusTrack));
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
