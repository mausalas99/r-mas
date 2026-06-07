import {
  loadGuardiaV7Progress,
  resetGuardiaV7Chapter
} from "/js/chunks/chunk-TVNIPUSB.js";
import {
  fundamentosModuleCount,
  isFundamentosChapterId,
  loadFundamentosProgress
} from "/js/chunks/chunk-V5MWVLLV.js";
import {
  isNeoCompanionStepComplete
} from "/js/chunks/chunk-L2VI5EO5.js";
import {
  loadTourProgress
} from "/js/chunks/chunk-POBHJ4SL.js";
import {
  needsClinicalOnboarding
} from "/js/chunks/chunk-7V673IEZ.js";
import {
  settingsHelpBridge
} from "/js/chunks/chunk-6IT4VYWH.js";
import {
  getSettingsHelpRuntime
} from "/js/chunks/chunk-L3YP7XLW.js";
import {
  GUARDIA_V7_CHAPTERS,
  GUARDIA_V7_HUB_MODULES,
  IC_CHAPTERS,
  IC_HUB_MODULES,
  NEO_COMPANION,
  QUICK_ROUTE_HUB_MODULE,
  SALA_CHAPTERS,
  SALA_HUB_MODULES,
  getChapterForStep,
  getChapterProgressLabel
} from "/js/chunks/chunk-QZXLPUPG.js";
import {
  isMobileWeb
} from "/js/chunks/chunk-Q33X722Y.js";

// public/js/features/settings-help/learn-hub.mjs
var learnHubDismissWired = false;
var learnHubLastFocus = null;
function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function estMinutesForSteps(stepCount) {
  const n = Math.max(1, Number(stepCount) || 1);
  return Math.max(1, Math.round(n * 0.75));
}
function stepCountForChapter(chapterId, branch) {
  if (branch === "quick-route") {
    return QUICK_ROUTE_HUB_MODULE.stepCount || 0;
  }
  if (branch === "guardia-v7") {
    const ch2 = GUARDIA_V7_CHAPTERS.find((c) => c.id === chapterId);
    return ch2 ? ch2.stepIds.length : 0;
  }
  if (branch === "interconsulta") {
    const ch2 = IC_CHAPTERS.find((c) => c.id === chapterId);
    return ch2 ? ch2.stepIds.length : 0;
  }
  const ch = SALA_CHAPTERS.find((c) => c.id === chapterId);
  return ch ? ch.stepIds.length : 0;
}
function moduleStatusLabel({ completed, inProgress, stepInChapter, chapterSteps }) {
  if (completed) return "Completado";
  if (inProgress && stepInChapter > 0) {
    return `En curso \xB7 paso ${stepInChapter} de ${chapterSteps}`;
  }
  if (inProgress) return "En curso";
  return "Pendiente";
}
function buildModuleRow({
  chapterId,
  label,
  branch,
  completed,
  inProgress,
  stepInChapter,
  chapterSteps,
  active,
  moduleIndex = null,
  allowReset = false,
  neoStepId = null,
  neoBadge = false
}) {
  const mins = estMinutesForSteps(chapterSteps);
  const status = moduleStatusLabel({ completed, inProgress, stepInChapter, chapterSteps });
  const cardCls = [
    "learn-hub-module-card",
    active ? "is-active" : "",
    completed ? "is-complete" : "",
    inProgress ? "is-in-progress" : ""
  ].filter(Boolean).join(" ");
  const indexBadge = neoBadge ? '<span class="learn-hub-module-index learn-hub-module-index--neo" aria-hidden="true">N</span>' : moduleIndex != null ? `<span class="learn-hub-module-index" aria-hidden="true">${moduleIndex}</span>` : "";
  const statusLine = chapterSteps > 0 ? `<span class="learn-hub-module-meta">${chapterSteps} pasos \xB7 ~${mins} min</span>` : "";
  const statusIcon = completed ? '<span class="learn-hub-module-check" aria-hidden="true">\u2713</span>' : inProgress ? '<span class="learn-hub-module-dot" aria-hidden="true"></span>' : "";
  const hitAttrs = neoStepId ? ` data-learn-neo-step="${escapeHtml(neoStepId)}"` : ` data-learn-chapter="${escapeHtml(chapterId)}" data-learn-branch="${escapeHtml(branch)}"`;
  const resetBtn = completed && allowReset && !neoStepId ? `<button type="button" class="learn-hub-module-reset" data-learn-reset="${escapeHtml(chapterId)}" data-learn-reset-branch="${escapeHtml(branch)}" title="Resetear progreso" aria-label="Resetear ${escapeHtml(label)}"><span class="learn-hub-module-reset-icon" aria-hidden="true">\u21BA</span></button>` : "";
  return `<div class="${cardCls}"><div class="learn-hub-module-row"><button type="button" class="learn-hub-module-hit"` + hitAttrs + ` title="${escapeHtml(label)} \u2014 ${escapeHtml(status)}">` + indexBadge + `<span class="learn-hub-module-main"><span class="learn-hub-module-title">${escapeHtml(label)}</span>` + statusLine + `</span><span class="learn-hub-module-status"><span class="learn-hub-module-status-text">${statusIcon}${escapeHtml(status)}</span></span><span class="learn-hub-module-chevron" aria-hidden="true">\u203A</span></button>` + resetBtn + `</div></div>`;
}
function startLearnModule(chapterId) {
  closeLearnHub();
  void import("/js/chunks/tour-runtime-SOV7JJXS.js").then((mod) => {
    if (typeof mod.startTourModule === "function") mod.startTourModule(chapterId);
  });
}
function resetLearnModuleProgress(chapterId, branch, focusTrack) {
  if (branch === "guardia-v7") {
    resetGuardiaV7Chapter(chapterId);
    getSettingsHelpRuntime().showToast("M\xF3dulo reseteado. \xC1brelo cuando quieras.", "info");
    renderLearnHubBody(focusTrack);
  }
}
function guardiaModuleState(chapterId, progress, tourProgress) {
  const chapterSteps = stepCountForChapter(chapterId, "guardia-v7");
  const completed = progress.completedChapters.includes(chapterId);
  let inProgress = false;
  let stepInChapter = 0;
  if (tourProgress && tourProgress.branch === "guardia-v7" && tourProgress.stepId) {
    const ch = getChapterForStep(tourProgress.stepId, "guardia-v7");
    if (ch.id === chapterId) {
      inProgress = !completed;
      const prog = getChapterProgressLabel(tourProgress.stepId, "guardia-v7");
      stepInChapter = prog.stepInChapter;
    }
  }
  return {
    completed,
    inProgress,
    stepInChapter,
    chapterSteps,
    active: inProgress && tourProgress && tourProgress.chapterId === chapterId
  };
}
function neoModuleState(startStepId, tourProgress) {
  const chapterSteps = 1;
  const neoIdx = NEO_COMPANION.stepIds.indexOf(startStepId);
  const completed = isNeoCompanionStepComplete(startStepId);
  let inProgress = false;
  let stepInChapter = 0;
  if (tourProgress?.mode === "neo" && tourProgress.stepId === startStepId && !completed) {
    inProgress = true;
    stepInChapter = neoIdx >= 0 ? neoIdx + 1 : 1;
  }
  return {
    completed,
    inProgress,
    stepInChapter,
    chapterSteps,
    active: inProgress
  };
}
function fundamentosModuleState(chapterId, branch, progress, tourProgress) {
  const chapterSteps = stepCountForChapter(chapterId, branch);
  const completed = progress.completedChapters.includes(chapterId);
  let inProgress = false;
  let stepInChapter = 0;
  if (tourProgress && tourProgress.branch !== "guardia-v7" && tourProgress.branch === branch && tourProgress.stepId) {
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
    active: inProgress && tourProgress && tourProgress.chapterId === chapterId
  };
}
function renderLearnHubBody(focusTrack = "guardia-v7") {
  const host = document.getElementById("learn-hub-body");
  if (!host) return;
  const progress = loadGuardiaV7Progress();
  const fundamentosProgress = loadFundamentosProgress();
  const tourProgress = loadTourProgress();
  const guardiaCompletedCount = GUARDIA_V7_HUB_MODULES.filter(
    (m) => progress.completedChapters.includes(m.chapterId)
  ).length;
  const fundamentosTotal = fundamentosModuleCount();
  const fundamentosCompletedCount = fundamentosProgress.completedChapters.filter(
    (id) => isFundamentosChapterId(id)
  ).length;
  const parts = [];
  if (tourProgress) {
    parts.push(
      '<div class="learn-hub-section learn-hub-section--continue"><button type="button" class="learn-hub-continue-btn" id="learn-hub-btn-continue">Continuar tutorial</button></div>'
    );
  }
  const novedadesOpen = focusTrack !== "fundamentos";
  parts.push(
    `<details class="learn-hub-track learn-hub-track--novedades"${novedadesOpen ? " open" : ""}>`
  );
  parts.push(
    `<summary class="learn-hub-track-title">Novedades 7.x<span class="learn-hub-progress-pill">${guardiaCompletedCount}/5</span></summary>`
  );
  parts.push('<div class="learn-hub-track-body">');
  parts.push(
    '<p class="learn-hub-section-lead">M\xF3dulos cortos e independientes. Pulsa una tarjeta para empezar; los completados se pueden resetear y abrir despu\xE9s.</p>'
  );
  parts.push('<div class="learn-hub-module-list">');
  parts.push(
    `<div class="learn-hub-module-card learn-hub-module-card--cta learn-hub-module-card--quick"><button type="button" class="learn-hub-module-hit learn-hub-module-hit--cta" data-learn-chapter="${escapeHtml(QUICK_ROUTE_HUB_MODULE.chapterId)}" data-learn-branch="quick-route" title="Ruta r\xE1pida \u2014 lab, guardia, LAN y entrega"><span class="learn-hub-module-index learn-hub-module-index--cta" aria-hidden="true">5\u2032</span><span class="learn-hub-module-main"><span class="learn-hub-module-title">${escapeHtml(QUICK_ROUTE_HUB_MODULE.label)}</span><span class="learn-hub-module-meta">${QUICK_ROUTE_HUB_MODULE.stepCount} pasos \xB7 ~5 min</span></span><span class="learn-hub-module-chevron" aria-hidden="true">\u203A</span></button></div>`
  );
  GUARDIA_V7_HUB_MODULES.forEach((mod, idx) => {
    const st = guardiaModuleState(mod.chapterId, progress, tourProgress);
    parts.push(
      buildModuleRow({
        chapterId: mod.chapterId,
        label: mod.label,
        branch: "guardia-v7",
        completed: st.completed,
        inProgress: st.inProgress,
        stepInChapter: st.stepInChapter,
        chapterSteps: st.chapterSteps,
        active: st.active,
        moduleIndex: idx + 1,
        allowReset: true
      })
    );
  });
  parts.push("</div></div></details>");
  const fundamentosOpen = focusTrack === "fundamentos";
  parts.push(
    `<details class="learn-hub-track learn-hub-track--fundamentos"${fundamentosOpen ? " open" : ""}>`
  );
  parts.push(
    `<summary class="learn-hub-track-title">Fundamentos<span class="learn-hub-progress-pill">${fundamentosCompletedCount}/${fundamentosTotal}</span></summary>`
  );
  parts.push('<div class="learn-hub-track-body">');
  parts.push(
    '<p class="learn-hub-fundamentos-lead">M\xF3dulos por flujo cl\xEDnico (~15 min, DEMO P\xC9REZ). Elige Sala o Interconsulta seg\xFAn tu rol.</p>'
  );
  parts.push('<p class="learn-hub-fundamentos-sub">Sala</p>');
  parts.push('<div class="learn-hub-module-list">');
  for (const mod of SALA_HUB_MODULES.filter((m) => m.chapterId && !m.companion)) {
    const st = fundamentosModuleState(mod.chapterId, "sala", fundamentosProgress, tourProgress);
    parts.push(
      buildModuleRow({
        chapterId: mod.chapterId,
        label: mod.label,
        branch: "sala",
        completed: st.completed,
        inProgress: st.inProgress,
        stepInChapter: st.stepInChapter,
        chapterSteps: st.chapterSteps,
        active: st.active
      })
    );
  }
  for (const mod of SALA_HUB_MODULES.filter((m) => m.companion === "neo")) {
    const st = neoModuleState(mod.startStepId, tourProgress);
    parts.push(
      buildModuleRow({
        chapterId: mod.id,
        label: mod.label,
        branch: "sala",
        completed: st.completed,
        inProgress: st.inProgress,
        stepInChapter: st.stepInChapter,
        chapterSteps: st.chapterSteps,
        active: st.active,
        neoStepId: mod.startStepId,
        neoBadge: true
      })
    );
  }
  parts.push("</div>");
  parts.push('<p class="learn-hub-fundamentos-sub">Interconsulta</p>');
  parts.push('<div class="learn-hub-module-list">');
  IC_HUB_MODULES.forEach((mod, idx) => {
    const st = fundamentosModuleState(
      mod.chapterId,
      "interconsulta",
      fundamentosProgress,
      tourProgress
    );
    parts.push(
      buildModuleRow({
        chapterId: mod.chapterId,
        label: mod.label,
        branch: "interconsulta",
        completed: st.completed,
        inProgress: st.inProgress,
        stepInChapter: st.stepInChapter,
        chapterSteps: st.chapterSteps,
        active: st.active,
        moduleIndex: idx + 1
      })
    );
  });
  parts.push("</div></div></details>");
  parts.push(
    '<div class="learn-hub-footer"><button type="button" class="learn-hub-help-link" id="learn-hub-btn-help">Buscar en centro de ayuda\u2026</button></div>'
  );
  host.innerHTML = parts.join("");
  wireLearnHubBodyOnce(host);
}
function wireLearnHubBodyOnce(host) {
  if (host._rpcLearnHubWired) return;
  host._rpcLearnHubWired = true;
  host.addEventListener("click", (ev) => {
    const resetBtn = ev.target.closest("[data-learn-reset]");
    if (resetBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      resetLearnModuleProgress(
        resetBtn.getAttribute("data-learn-reset"),
        resetBtn.getAttribute("data-learn-reset-branch") || "guardia-v7",
        "guardia-v7"
      );
      return;
    }
    const row = ev.target.closest("[data-learn-chapter]");
    if (row) {
      startLearnModule(row.getAttribute("data-learn-chapter"));
      return;
    }
    const neo = ev.target.closest("[data-learn-neo-step]");
    if (neo) {
      const stepId = neo.getAttribute("data-learn-neo-step");
      closeLearnHub();
      void import("/js/chunks/tour-runtime-SOV7JJXS.js").then((mod) => {
        if (typeof mod.startNeoCompanionTour === "function") mod.startNeoCompanionTour(stepId);
      });
      return;
    }
    if (ev.target.closest("#learn-hub-btn-continue")) {
      closeLearnHub();
      void import("/js/chunks/tour-flow-V3YOZ4GE.js").then((mod) => {
        if (typeof mod.resumeGuidedTourFromProgress === "function") {
          mod.resumeGuidedTourFromProgress();
        }
      });
      return;
    }
    if (ev.target.closest("#learn-hub-btn-help")) {
      closeLearnHub();
      if (typeof settingsHelpBridge.openQuickHelp === "function") {
        settingsHelpBridge.openQuickHelp();
      } else {
        void import("/js/chunks/help-content-6TUIN422.js").then((mod) => {
          if (typeof mod.openQuickHelp === "function") mod.openQuickHelp();
        });
      }
    }
  });
}
function wireLearnHubDismiss() {
  if (learnHubDismissWired) return;
  learnHubDismissWired = true;
  const bd = document.getElementById("learn-hub-backdrop");
  if (!bd) return;
  bd.addEventListener("click", (ev) => {
    if (!bd.classList.contains("open")) return;
    const sheet = bd.querySelector(".learn-hub-sheet");
    if (sheet && sheet.contains(ev.target)) return;
    closeLearnHub();
  });
  document.addEventListener(
    "keydown",
    (ev) => {
      if (ev.key !== "Escape" && ev.key !== "Esc") return;
      if (!bd.classList.contains("open")) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeLearnHub();
    },
    true
  );
}
function syncLearnAprenderChrome() {
  const btn = document.getElementById("btn-open-learn");
  if (!btn) return;
  btn.hidden = isMobileWeb() || needsClinicalOnboarding();
}
function openLearnHub(opts = {}) {
  if (isMobileWeb()) return;
  wireLearnHubDismiss();
  renderLearnHubBody(opts.focusTrack || "guardia-v7");
  const bd = document.getElementById("learn-hub-backdrop");
  if (!bd) return;
  learnHubLastFocus = document.activeElement;
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  const closeBtn = bd.querySelector(".learn-hub-close");
  if (closeBtn && typeof closeBtn.focus === "function") {
    try {
      closeBtn.focus();
    } catch (_e) {
    }
  }
  syncLearnAprenderChrome();
  if (typeof settingsHelpBridge.syncLearnHubContinueVisibility === "function") {
    settingsHelpBridge.syncLearnHubContinueVisibility();
  }
}
function closeLearnHub() {
  const bd = document.getElementById("learn-hub-backdrop");
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
  const prev = learnHubLastFocus;
  learnHubLastFocus = null;
  if (prev && typeof prev.focus === "function") {
    try {
      prev.focus();
    } catch (_e) {
    }
  }
}

export {
  renderLearnHubBody,
  syncLearnAprenderChrome,
  openLearnHub,
  closeLearnHub
};
//# sourceMappingURL=/js/chunks/chunk-K7C5OEOR.js.map
