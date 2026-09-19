/**
 * Guardia census — patient chip action sheet (expediente vs eventualidad).
 */
import { getPatients, persistClinicalState } from '../app-state.mjs';
import { toClinicalHistoryText } from '../../../lib/clinical-text.mjs';
import { getUiDensity, setUiDensity } from './chrome.mjs';
import {
  normalizeEventualidadText,
  savePatientEventualidad,
} from './eventualidades-panel.mjs';
import { canExecuteClinicalCommand, executeClinicalCommand } from '../clinical-repo-client.mjs';
import { _applyPatientPatch } from '../clinical-read-model.mjs';
import { scheduleCloudSyncPush } from './cloud-sync/mutate-bridge.mjs';
import {
  GUARDIA_ESFUERZO_OPTIONS,
  GUARDIA_PRONOSTICO_OPTIONS,
  GUARDIA_NOTA_MAX,
  normalizeGuardiaMarksPatch,
  normalizeGuardiaNota,
} from './guardia-census-table.mjs';

import { escapeHtml, escHtml, escAttr } from '../dom-escape.mjs';
import { resolveGlobalFn } from './resolve-global-fn.mjs';
let dismissWired = false;
let _sheetCtx = null;

function toast(msg, type = 'info') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  }
}

function backdropEl() {
  return document.getElementById('guardia-patient-action-backdrop');
}

function bodyEl() {
  return document.getElementById('guardia-patient-action-body');
}

/** @param {string} patientId */
function findPatient(patientId) {
  const id = String(patientId || '');
  return (
    getPatients().find(function (p) {
      return p && String(p.id) === id;
    }) || null
  );
}

/**
 * @param {{
 *   turnoActivo?: boolean,
 *   entregaActive?: boolean,
 *   onCallGuardiaReceiver?: boolean,
 *   gridViewContext?: 'GUARDIA'|'HANDOFF',
 * }} ctx
 */
export function shouldShowGuardiaPatientActionMenu(ctx) {
  const turnoActivo = !!ctx?.turnoActivo;
  const entregaActive = !!ctx?.entregaActive;
  if (entregaActive && !turnoActivo) return false;
  return turnoActivo;
}

function closeGuardiaPatientActionSheet() {
  const bd = backdropEl();
  if (!bd) return;
  flushPendingGuardiaNota();
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('guardia-patient-action-open');
  const body = bodyEl();
  if (body) body.innerHTML = '';
  _sheetCtx = null;
}

function openBackdrop() {
  const bd = backdropEl();
  if (!bd) return false;
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('guardia-patient-action-open');
  return true;
}

function wireUppercaseTextarea(textarea) {
  if (!textarea || textarea.dataset.guardiaEvUpperWired === '1') return;
  textarea.dataset.guardiaEvUpperWired = '1';
  textarea.style.textTransform = 'uppercase';
  textarea.addEventListener('input', function () {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const upper = toClinicalHistoryText(textarea.value);
    if (upper !== textarea.value) {
      textarea.value = upper;
      if (start != null && end != null) textarea.setSelectionRange(start, end);
    }
  });
}

function openPatientChart(patientId) {
  const selectFn = resolveGlobalFn('selectPatient');
  if (selectFn) selectFn(patientId);
  if (getUiDensity() === 'guardia') setUiDensity('normal');
  const switchInnerTabFn = resolveGlobalFn('switchInnerTab');
  if (switchInnerTabFn) switchInnerTabFn('notas');
}

export function guardiaMarksGroupHtml(label, mark, options, current) {
  const buttons = options
    .map((o) => {
      const pressed = o.id === current;
      return (
        `<button type="button" class="guardia-marks-btn" data-value="${escAttr(o.id)}" ` +
        `aria-pressed="${pressed ? 'true' : 'false'}">${o.icon} ${escHtml(o.label)}</button>`
      );
    })
    .join('');
  return (
    `<div class="guardia-marks-group" role="group" aria-label="${escAttr(label)}" data-mark="${escAttr(mark)}">` +
    `<span class="guardia-marks-group__label">${escHtml(label)}</span>` +
    buttons +
    '</div>'
  );
}

/**
 * @param {object} patient
 * @param {string} [dxText]
 */
export function buildGuardiaMarksControlsHtml(patient, dxText) {
  const dx = String(dxText || '').trim();
  const current = normalizeGuardiaMarksPatch({
    guardiaEsfuerzo: patient?.guardiaEsfuerzo,
    guardiaPronostico: patient?.guardiaPronostico,
  });
  const nota = normalizeGuardiaNota(patient?.guardiaNota);
  return (
    (dx ? `<p class="guardia-patient-action-dx">${escHtml(dx)}</p>` : '') +
    guardiaMarksGroupHtml('Esfuerzo terapéutico', 'guardiaEsfuerzo', GUARDIA_ESFUERZO_OPTIONS, current.guardiaEsfuerzo) +
    guardiaMarksGroupHtml('Pronóstico', 'guardiaPronostico', GUARDIA_PRONOSTICO_OPTIONS, current.guardiaPronostico) +
    '<div class="field-group guardia-patient-action-field">' +
    '<label for="guardia-marks-nota">Nota de guardia</label>' +
    `<textarea id="guardia-marks-nota" class="profile-input guardia-patient-action-textarea" rows="2" maxlength="${GUARDIA_NOTA_MAX}" placeholder="SV c/4h, vigilar T/A post procedimiento…">${escHtml(nota)}</textarea>` +
    '</div>'
  );
}

async function applyGuardiaMarksViaClinicalRepo(patient, merged, next) {
  const cmd = { type: 'patient.upsert', patient: merged };
  const meta = { source: 'ui', echoSnapshot: false };
  let res = await executeClinicalCommand(cmd, meta);
  if (res && !res.ok && res.error === 'patient_not_found') {
    // Census can land in RAM via Nube before the SQLCipher blob catches up (same as eventualidades-render.mjs:343).
    await executeClinicalCommand(
      { type: 'clinical.persistSnapshot', patients: getPatients() },
      { source: 'guardia-marks-retry', echoSnapshot: false }
    );
    res = await executeClinicalCommand(cmd, meta);
  }
  if (!res || !res.ok) return { ok: false, reason: (res && res.error) || 'repo_failed' };
  Object.assign(patient, next);
  _applyPatientPatch(patient.id, next, patient, { source: 'guardia-marks' });
  // ponytail: bundle push carries the fields with the fresh clock; change_log row drains later (idempotent). Add projector drain only if Nube lag is observed.
  scheduleCloudSyncPush();
  return { ok: true, via: 'clinical-repo', changeId: res.changeId || null };
}

/**
 * @param {object} patient
 * @param {{ guardiaEsfuerzo?: unknown, guardiaPronostico?: unknown, guardiaNota?: unknown }} patch
 */
export async function saveGuardiaMarks(patient, patch) {
  if (!patient || !patient.id) return { ok: false, reason: 'no-patient' };
  const next = normalizeGuardiaMarksPatch(patch);
  if (!Object.keys(next).length) return { ok: false, reason: 'empty' };
  next.lanUpdatedAt = new Date().toISOString(); // Nube LWW clock for entries/{id}/fields
  const merged = { ...patient, ...next, id: String(patient.id) };
  if (!canExecuteClinicalCommand()) {
    Object.assign(patient, next);
    _applyPatientPatch(patient.id, next, patient, { source: 'guardia-marks' });
    await persistClinicalState({ immediate: true, source: 'guardia-marks' });
    scheduleCloudSyncPush();
    return { ok: true, via: 'snapshot' };
  }
  return applyGuardiaMarksViaClinicalRepo(patient, merged, next);
}

async function saveGuardiaMarkFromButton(ctx, group, btn) {
  const mark = group.dataset.mark;
  const value = btn.dataset.value;
  const patient = findPatient(ctx.patientId);
  if (!patient) return;
  const next = patient[mark] === value ? null : value;
  const res = await saveGuardiaMarks(patient, { [mark]: next });
  if (!res.ok) {
    toast('No se pudo guardar.', 'error');
    return;
  }
  group.querySelectorAll('.guardia-marks-btn').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.value === next ? 'true' : 'false');
  });
  ctx.onMarksSaved?.();
}

export function wireGuardiaMarksButtons(body, ctx) {
  body.querySelectorAll('.guardia-marks-group').forEach((group) => {
    group.querySelectorAll('.guardia-marks-btn').forEach((btn) => {
      btn.addEventListener('click', function () {
        void saveGuardiaMarkFromButton(ctx, group, btn);
      });
    });
  });
}

async function saveGuardiaNotaFromInput(ctx) {
  const input = document.getElementById('guardia-marks-nota');
  if (!input) return;
  const patient = findPatient(ctx.patientId);
  if (!patient) return;
  const nextNota = normalizeGuardiaNota(input.value);
  if (nextNota === normalizeGuardiaNota(patient.guardiaNota)) return;
  const res = await saveGuardiaMarks(patient, { guardiaNota: input.value });
  if (!res.ok) {
    toast('No se pudo guardar.', 'error');
    return;
  }
  ctx.onMarksSaved?.();
}

function wireGuardiaMarksNota(body, ctx) {
  const input = body.querySelector('#guardia-marks-nota');
  if (!input) return;
  input.addEventListener('change', function () {
    void saveGuardiaNotaFromInput(ctx);
  });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      void saveGuardiaNotaFromInput(ctx);
    }
  });
}

function flushPendingGuardiaNota() {
  if (!_sheetCtx) return;
  void saveGuardiaNotaFromInput(_sheetCtx);
}

function renderMenuStep(ctx) {
  const body = bodyEl();
  if (!body) return;
  const patient = findPatient(ctx.patientId);
  body.innerHTML =
    '<p class="guardia-patient-action-lead">Elige una acción para este paciente.</p>' +
    buildGuardiaMarksControlsHtml(patient, ctx.dxText) +
    '<div class="guardia-patient-action-list" role="menu">' +
    '<button type="button" class="guardia-patient-action-item" data-action="chart">' +
    '<span class="guardia-patient-action-item__title">Abrir expediente</span>' +
    '<span class="guardia-patient-action-item__hint">Ver historia, estado actual y más</span>' +
    '</button>' +
    '<button type="button" class="guardia-patient-action-item" data-action="eventualidad">' +
    '<span class="guardia-patient-action-item__title">Registrar eventualidad</span>' +
    '<span class="guardia-patient-action-item__hint">Nota breve visible para equipo mañana</span>' +
    '</button>' +
    '</div>';

  wireGuardiaMarksButtons(body, ctx);
  wireGuardiaMarksNota(body, ctx);

  body.querySelector('[data-action="chart"]')?.addEventListener('click', function () {
    closeGuardiaPatientActionSheet();
    openPatientChart(ctx.patientId);
  });
  body.querySelector('[data-action="eventualidad"]')?.addEventListener('click', function () {
    renderEventualidadStep(ctx);
  });
}

function renderEventualidadStep(ctx) {
  const body = bodyEl();
  const title = document.getElementById('guardia-patient-action-title');
  if (!body) return;
  if (title) title.textContent = 'Registrar eventualidad';
  body.innerHTML =
    '<p class="guardia-patient-action-lead">' +
    escapeHtml(ctx.patientLabel || 'Paciente') +
    '</p>' +
    '<div class="field-group guardia-patient-action-field">' +
    '<label for="guardia-patient-action-ev-input">¿Qué ocurrió?</label>' +
    '<textarea id="guardia-patient-action-ev-input" class="profile-input guardia-patient-action-textarea" rows="3" maxlength="480" placeholder="Describe lo ocurrido en el turno…"></textarea>' +
    '</div>' +
    '<div class="modal-actions guardia-patient-action-actions">' +
    '<button type="button" class="btn-cancel" id="guardia-patient-action-back">Volver</button>' +
    '<button type="button" class="btn-save" id="guardia-patient-action-save">Guardar</button>' +
    '</div>';

  const input = body.querySelector('#guardia-patient-action-ev-input');
  wireUppercaseTextarea(input);
  input?.focus();

  body.querySelector('#guardia-patient-action-back')?.addEventListener('click', function () {
    const titleEl = document.getElementById('guardia-patient-action-title');
    if (titleEl) titleEl.textContent = ctx.patientLabel;
    renderMenuStep(ctx);
  });

  body.querySelector('#guardia-patient-action-save')?.addEventListener('click', function () {
    void submitEventualidad(ctx.patientId, ctx.patientLabel, input?.value || '');
  });

  input?.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      void submitEventualidad(ctx.patientId, ctx.patientLabel, input.value || '');
    }
  });
}

function wireCancelButton() {
  const cancelBtn = document.getElementById('guardia-patient-action-cancel');
  if (!cancelBtn || cancelBtn.dataset.guardiaActionWired === '1') return;
  cancelBtn.dataset.guardiaActionWired = '1';
  cancelBtn.addEventListener('click', closeGuardiaPatientActionSheet);
}

async function submitEventualidad(patientId, patientLabel, rawText) {
  const text = normalizeEventualidadText(rawText);
  if (!text) {
    toast('Escribe la eventualidad antes de guardar.', 'error');
    return;
  }
  const patient = findPatient(patientId);
  if (!patient) {
    toast('Paciente no encontrado.', 'error');
    closeGuardiaPatientActionSheet();
    return;
  }
  const saveBtn = document.getElementById('guardia-patient-action-save');
  if (saveBtn) saveBtn.disabled = true;
  try {
    const out = await savePatientEventualidad(patient, text);
    if (!out?.ok) {
      toast('No se pudo guardar la eventualidad.', 'error');
      return;
    }
    toast('Eventualidad guardada.', 'success');
    closeGuardiaPatientActionSheet();
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

/**
 * @param {{ patientId: string, patientLabel?: string, dxText?: string, onMarksSaved?: () => void }} opts
 */
export function openGuardiaPatientActionSheet(opts) {
  const patientId = String(opts?.patientId || '');
  if (!patientId) return;
  if (!openBackdrop()) {
    openPatientChart(patientId);
    return;
  }
  wireCancelButton();

  const patient = findPatient(patientId);
  const patientLabel =
    String(opts?.patientLabel || '').trim() ||
    String(patient?.name || '').trim() ||
    'Paciente';

  const title = document.getElementById('guardia-patient-action-title');
  if (title) title.textContent = patientLabel;

  const ctx = {
    patientId,
    patientLabel,
    dxText: opts?.dxText ? String(opts.dxText) : '',
    onMarksSaved: opts?.onMarksSaved,
  };
  _sheetCtx = ctx;
  renderMenuStep(ctx);
}

export { openPatientChart };

export function wireGuardiaPatientActionSheetDismiss() {
  if (dismissWired || typeof document === 'undefined') return;
  dismissWired = true;
  wireCancelButton();
  const bd = backdropEl();
  if (bd) {
    bd.addEventListener('click', function (ev) {
      if (!bd.classList.contains('open')) return;
      if (ev.target !== bd) return;
      closeGuardiaPatientActionSheet();
    });
  }
  document.addEventListener(
    'keydown',
    function (ev) {
      if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
      const el = backdropEl();
      if (!el || !el.classList.contains('open')) return;
      closeGuardiaPatientActionSheet();
      ev.preventDefault();
      ev.stopPropagation();
    },
    true
  );
}
