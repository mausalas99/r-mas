import {
  loadGuardiaV7Progress,
  resetGuardiaV7Chapter
} from "/mobile/js/chunks/chunk-ZUYL4WDU.js";
import {
  fundamentosModuleCount,
  isFundamentosChapterId,
  loadFundamentosProgress
} from "/mobile/js/chunks/chunk-TM7QOJ25.js";
import {
  getSettingsHelpRuntime,
  needsClinicalOnboarding
} from "/mobile/js/chunks/chunk-NGYHUPLR.js";
import {
  loadTourProgress,
  settingsHelpBridge
} from "/mobile/js/chunks/chunk-EQKSFX4S.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-WTQUTVWF.js";
import {
  GUARDIA_V7_CHAPTERS,
  GUARDIA_V7_HUB_MODULES,
  IC_CHAPTERS,
  IC_HUB_MODULES,
  QUICK_ROUTE_HUB_MODULE,
  SALA_CHAPTERS,
  SALA_HUB_MODULES,
  getChapterForStep,
  getChapterProgressLabel
} from "/mobile/js/chunks/chunk-YQDSERQQ.js";
import {
  closeModalAnimated
} from "/mobile/js/chunks/chunk-WIYWDVMU.js";
import {
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/features/settings-help/learn-hub.mjs
var learnHubDismissWired = false;
var learnHubLastFocus = null;
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
function buildModuleIndexBadge({ moduleIndex }) {
  if (moduleIndex != null) {
    return `<span class="learn-hub-module-index" aria-hidden="true">${moduleIndex}</span>`;
  }
  return "";
}
function buildModuleStatusIcon({ completed, inProgress }) {
  if (completed) return '<span class="learn-hub-module-check" aria-hidden="true">\u2713</span>';
  if (inProgress) return '<span class="learn-hub-module-dot" aria-hidden="true"></span>';
  return "";
}
function buildModuleResetBtn({ completed, allowReset, chapterId, branch, label }) {
  if (!completed || !allowReset) return "";
  return `<button type="button" class="learn-hub-module-reset" data-learn-reset="${escapeHtml(chapterId)}" data-learn-reset-branch="${escapeHtml(branch)}" title="Resetear progreso" aria-label="Resetear ${escapeHtml(label)}"><span class="learn-hub-module-reset-icon" aria-hidden="true">\u21BA</span></button>`;
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
  allowReset = false
}) {
  const mins = estMinutesForSteps(chapterSteps);
  const status = moduleStatusLabel({ completed, inProgress, stepInChapter, chapterSteps });
  const cardCls = [
    "learn-hub-module-card",
    active ? "is-active" : "",
    completed ? "is-complete" : "",
    inProgress ? "is-in-progress" : ""
  ].filter(Boolean).join(" ");
  const indexBadge = buildModuleIndexBadge({ moduleIndex });
  const statusLine = chapterSteps > 0 ? `<span class="learn-hub-module-meta">${chapterSteps} pasos \xB7 ~${mins} min</span>` : "";
  const statusIcon = buildModuleStatusIcon({ completed, inProgress });
  const hitAttrs = ` data-learn-chapter="${escapeHtml(chapterId)}" data-learn-branch="${escapeHtml(branch)}"`;
  const resetBtn = buildModuleResetBtn({
    completed,
    allowReset,
    chapterId,
    branch,
    label
  });
  return `<div class="${cardCls}"><div class="learn-hub-module-row"><button type="button" class="learn-hub-module-hit"` + hitAttrs + ` title="${escapeHtml(label)} \u2014 ${escapeHtml(status)}">` + indexBadge + `<span class="learn-hub-module-main"><span class="learn-hub-module-title">${escapeHtml(label)}</span>` + statusLine + `</span><span class="learn-hub-module-status"><span class="learn-hub-module-status-text">${statusIcon}${escapeHtml(status)}</span></span><span class="learn-hub-module-chevron" aria-hidden="true">\u203A</span></button>` + resetBtn + `</div></div>`;
}
function startLearnModule(chapterId) {
  closeLearnHub();
  void import("/mobile/js/chunks/tour-runtime-KTC7XZH3.js").then((mod) => {
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
function renderLearnHubContinueSection(tourProgress, parts) {
  if (!tourProgress) return;
  parts.push(
    '<div class="learn-hub-section learn-hub-section--continue"><button type="button" class="learn-hub-continue-btn" id="learn-hub-btn-continue">Continuar tutorial</button></div>'
  );
}
function renderLearnHubQuickRouteCard(parts) {
  parts.push(
    `<div class="learn-hub-module-card learn-hub-module-card--cta learn-hub-module-card--quick"><button type="button" class="learn-hub-module-hit learn-hub-module-hit--cta" data-learn-chapter="${escapeHtml(QUICK_ROUTE_HUB_MODULE.chapterId)}" data-learn-branch="quick-route" title="Ruta r\xE1pida \u2014 lab, guardia, Nube y entrega"><span class="learn-hub-module-index learn-hub-module-index--cta" aria-hidden="true">5\u2032</span><span class="learn-hub-module-main"><span class="learn-hub-module-title">${escapeHtml(QUICK_ROUTE_HUB_MODULE.label)}</span><span class="learn-hub-module-meta">${QUICK_ROUTE_HUB_MODULE.stepCount} pasos \xB7 ~5 min</span></span><span class="learn-hub-module-chevron" aria-hidden="true">\u203A</span></button></div>`
  );
}
function renderLearnHubNovedadesTrack(parts, focusTrack, progress, tourProgress) {
  const guardiaCompletedCount = GUARDIA_V7_HUB_MODULES.filter(
    (m) => progress.completedChapters.includes(m.chapterId)
  ).length;
  const novedadesOpen = focusTrack !== "fundamentos";
  parts.push(
    `<details class="learn-hub-track learn-hub-track--novedades"${novedadesOpen ? " open" : ""}>`
  );
  parts.push(
    `<summary class="learn-hub-track-title">Guardia y R+ Cloud<span class="learn-hub-progress-pill">${guardiaCompletedCount}/5</span></summary>`
  );
  parts.push('<div class="learn-hub-track-body">');
  parts.push(
    '<p class="learn-hub-section-lead">M\xF3dulos cortos e independientes. Pulsa una tarjeta para empezar; los completados se pueden resetear y abrir despu\xE9s.</p>'
  );
  parts.push('<div class="learn-hub-module-list">');
  renderLearnHubQuickRouteCard(parts);
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
}
function renderLearnHubFundamentosTrack(parts, focusTrack, fundamentosProgress, tourProgress) {
  const fundamentosTotal = fundamentosModuleCount();
  const fundamentosCompletedCount = fundamentosProgress.completedChapters.filter(
    (id) => isFundamentosChapterId(id)
  ).length;
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
  for (const mod of SALA_HUB_MODULES.filter((m) => m.chapterId)) {
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
}
function renderLearnHubBody(focusTrack = "guardia-v7") {
  const host = document.getElementById("learn-hub-body");
  if (!host) return;
  const progress = loadGuardiaV7Progress();
  const fundamentosProgress = loadFundamentosProgress();
  const tourProgress = loadTourProgress();
  const parts = [];
  renderLearnHubContinueSection(tourProgress, parts);
  renderLearnHubNovedadesTrack(parts, focusTrack, progress, tourProgress);
  renderLearnHubFundamentosTrack(parts, focusTrack, fundamentosProgress, tourProgress);
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
    if (ev.target.closest("#learn-hub-btn-continue")) {
      closeLearnHub();
      void import("/mobile/js/chunks/tour-flow-UMUMOHW4.js").then((mod) => {
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
        void import("/mobile/js/chunks/help-content-3K2YQ46Z.js").then((mod) => {
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
    } catch {
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
  const prev = learnHubLastFocus;
  closeModalAnimated(bd, function() {
    learnHubLastFocus = null;
    if (prev && typeof prev.focus === "function") {
      try {
        prev.focus();
      } catch {
      }
    }
  });
}

export {
  renderLearnHubBody,
  syncLearnAprenderChrome,
  openLearnHub,
  closeLearnHub
};
//# sourceMappingURL=/js/chunks/chunk-O6NPYMHI.js.map
