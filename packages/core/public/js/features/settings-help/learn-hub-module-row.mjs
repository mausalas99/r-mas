import { escapeHtml } from '../../dom-escape.mjs';

export const LEARN_HUB_CHEVRON =
  '<svg class="learn-hub-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
  ' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

export function moduleStatusLabel({ completed, inProgress, stepInChapter, chapterSteps }) {
  if (completed) return 'Completado';
  if (inProgress && stepInChapter > 0) return `En curso · paso ${stepInChapter} de ${chapterSteps}`;
  if (inProgress) return 'En curso';
  return 'Pendiente';
}

function buildModuleMark(completed, moduleIndex) {
  const inner = completed ? '✓' : moduleIndex != null ? String(moduleIndex) : '';
  return `<span class="learn-hub-module-mark" aria-hidden="true">${inner}</span>`;
}

/** Pending shows no pill: the empty state is the default, not news. */
function buildModulePill(completed, inProgress, stepInChapter, chapterSteps) {
  if (completed) return '<span class="learn-hub-pill learn-hub-pill--done">Hecho</span>';
  if (!inProgress) return '';
  const text = stepInChapter > 0 ? `Paso ${stepInChapter} de ${chapterSteps}` : 'En curso';
  return `<span class="learn-hub-pill learn-hub-pill--live">${text}</span>`;
}

function buildModuleResetBtn(completed, allowReset, chapterId, branch, label) {
  if (!completed || !allowReset) return '';
  return (
    `<button type="button" class="learn-hub-module-reset"` +
    ` data-learn-reset="${escapeHtml(chapterId)}" data-learn-reset-branch="${escapeHtml(branch)}"` +
    ` title="Resetear progreso" aria-label="Resetear ${escapeHtml(label)}">` +
    `<span class="learn-hub-module-reset-icon" aria-hidden="true">↺</span></button>`
  );
}

export function buildModuleRow(opts) {
  const {
    chapterId, label, branch, completed, inProgress, stepInChapter, chapterSteps,
    active, moduleIndex = null, allowReset = false,
  } = opts;
  const mins = Math.max(1, Math.round(Math.max(1, Number(chapterSteps) || 1) * 0.75));
  const status = moduleStatusLabel({ completed, inProgress, stepInChapter, chapterSteps });
  const cardCls = ['learn-hub-module-card', active ? 'is-active' : '', completed ? 'is-complete' : '', inProgress ? 'is-in-progress' : '']
    .filter(Boolean).join(' ');
  const meta = chapterSteps > 0
    ? `<span class="learn-hub-module-meta">${chapterSteps} pasos · ~${mins} min</span>`
    : '';
  const bar = inProgress && !completed && chapterSteps > 0
    ? `<progress class="learn-hub-bar learn-hub-bar--card" max="${chapterSteps}" value="${stepInChapter}" aria-hidden="true"></progress>`
    : '';
  return (
    `<div class="${cardCls}">` +
    `<div class="learn-hub-module-row">` +
    `<button type="button" class="learn-hub-module-hit"` +
    ` data-learn-chapter="${escapeHtml(chapterId)}" data-learn-branch="${escapeHtml(branch)}"` +
    ` title="${escapeHtml(label)} — ${escapeHtml(status)}">` +
    buildModuleMark(completed, moduleIndex) +
    `<span class="learn-hub-module-main">` +
    `<span class="learn-hub-module-title">${escapeHtml(label)}</span>${meta}</span>` +
    buildModulePill(completed, inProgress, stepInChapter, chapterSteps) +
    LEARN_HUB_CHEVRON +
    `</button>` +
    buildModuleResetBtn(completed, allowReset, chapterId, branch, label) +
    `</div>${bar}</div>`
  );
}
