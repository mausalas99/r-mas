/**
 * Multi-step modal: destino → elegir equipo que hereda → pacientes → confirmar.
 */
import { clinicalSessionContext, fetchClinicalScopeContextFromDb } from '../../clinical-access-runtime.mjs';
import { escapeHtml, escapeAttr } from '../../dom-escape.mjs';
import { toast } from './shared.mjs';
import { assignBringablePatientsToTeam } from './teams-roster-bring-patients.mjs';
import {
  groupBringablePatientsForInherit,
  listInheritSourceOptions,
  patientsForInheritSource,
} from './teams-roster-inherit-patients.mjs';

let wired = false;

function backdropEl() {
  return document.getElementById('inherit-patients-backdrop');
}

function sessionState() {
  const bd = backdropEl();
  return bd?._rpcInheritState || null;
}

function setSessionState(next) {
  const bd = backdropEl();
  if (bd) bd._rpcInheritState = next;
}

/** @param {number} step 0..3 */
export function buildInheritStepDotsHtml(step) {
  const labels = ['Destino', 'Origen', 'Pacientes', 'Confirmar'];
  return (
    '<ol class="inherit-steps" aria-label="Pasos de herencia">' +
    labels
      .map((label, i) => {
        const cls =
          i === step ? 'inherit-step inherit-step--current' : i < step ? 'inherit-step inherit-step--done' : 'inherit-step';
        return (
          `<li class="${cls}"><span class="inherit-step-num">${i + 1}</span>` +
          `<span class="inherit-step-label">${escapeHtml(label)}</span></li>`
        );
      })
      .join('') +
    '</ol>'
  );
}

/**
 * @param {{ targetName: string, sala?: string, cycle?: string }} model
 */
export function buildInheritStepDestinoHtml(model) {
  const name = String(model.targetName || 'tu equipo').trim();
  const meta = [model.sala, model.cycle ? `ciclo ${model.cycle}` : '']
    .filter(Boolean)
    .join(' · ');
  return (
    buildInheritStepDotsHtml(0) +
    `<p class="inherit-patients-lead">Paso 1 — Tu equipo <strong>nuevo</strong> (destino de los pacientes).</p>` +
    `<div class="inherit-dest-card">` +
    `<p class="inherit-dest-eyebrow">Te uniste a</p>` +
    `<p class="inherit-dest-name">${escapeHtml(name)}</p>` +
    (meta ? `<p class="inherit-dest-meta">${escapeHtml(meta)}</p>` : '') +
    `</div>`
  );
}

/**
 * @param {{ targetName: string, sources: object[], unassignedCount: number, selectedSourceId: string }} model
 */
export function buildInheritStepOrigenHtml(model) {
  const sources = Array.isArray(model.sources) ? model.sources : [];
  const selected = String(model.selectedSourceId ?? '');

  const sourceRows = sources
    .map((s) => {
      const id = String(s.teamId || '');
      const checked = id === selected ? ' checked' : '';
      const badge = s.preferred
        ? '<span class="inherit-patients-badge">Sugerido · misma sala y ciclo</span>'
        : '';
      const count =
        s.patientCount > 0 ? `${s.patientCount} en este Mac` : 'sin expedientes locales aún';
      const meta = [s.sala, s.cycle ? `ciclo ${s.cycle}` : '', count].filter(Boolean).join(' · ');
      return (
        `<li><label class="inherit-source-pick">` +
        `<input type="radio" name="inherit-source" data-inherit-source="${escapeAttr(id)}"${checked} />` +
        `<span><strong>${escapeHtml(s.name)}</strong>` +
        badge +
        `<span class="inherit-patients-reg">${escapeHtml(meta)}</span></span>` +
        `</label></li>`
      );
    })
    .join('');

  const noneRow =
    `<li><label class="inherit-source-pick">` +
    `<input type="radio" name="inherit-source" data-inherit-source=""${selected === '' ? ' checked' : ''} />` +
    `<span><strong>Solo sin equipo / otros</strong>` +
    `<span class="inherit-patients-reg">${model.unassignedCount || 0} paciente(s) locales sin equipo activo</span></span>` +
    `</label></li>`;

  const emptyHint =
    sources.length === 0
      ? `<p class="profile-hint">No hay equipos archivados en esta sala. Usa la opción de abajo.</p>`
      : '';

  return (
    buildInheritStepDotsHtml(1) +
    `<p class="inherit-patients-lead">Paso 2 — ¿Qué equipo del mes anterior te <strong>hereda</strong> pacientes hacia <strong>${escapeHtml(model.targetName)}</strong>?</p>` +
    emptyHint +
    `<ul class="inherit-source-list">${sourceRows}${noneRow}</ul>`
  );
}

/**
 * @param {{ targetName: string, sourceName: string, patients: object[], includeUnassigned: boolean, unassignedCount: number }} model
 */
export function buildInheritStepPacientesHtml(model) {
  const patients = Array.isArray(model.patients) ? model.patients : [];
  const rows =
    patients.length === 0
      ? `<p class="inherit-patients-lead">No hay pacientes locales de ese origen en este Mac. Puedes continuar o elegir otro equipo.</p>`
      : `<ul class="inherit-patients-list">` +
        patients
          .map((p) => {
            const id = String(p.id || '');
            return (
              `<li><label class="inherit-patients-check">` +
              `<input type="checkbox" data-inherit-patient="${escapeAttr(id)}" checked />` +
              `<span><strong>${escapeHtml(String(p.nombre || 'Sin nombre'))}</strong>` +
              `<span class="inherit-patients-reg">${escapeHtml(String(p.registro || 's/reg'))}</span></span>` +
              `</label></li>`
            );
          })
          .join('') +
        `</ul>`;

  const unassignedToggle =
    model.unassignedCount > 0 && model.sourceName
      ? `<label class="inherit-patients-check inherit-unassigned-toggle">` +
        `<input type="checkbox" data-inherit-include-unassigned${model.includeUnassigned ? ' checked' : ''} />` +
        `<span>Incluir también ${model.unassignedCount} sin equipo asignado</span></label>`
      : '';

  return (
    buildInheritStepDotsHtml(2) +
    `<p class="inherit-patients-lead">Paso 3 — Pacientes de <strong>${escapeHtml(model.sourceName || 'sin equipo')}</strong> → <strong>${escapeHtml(model.targetName)}</strong>.</p>` +
    `<div class="inherit-patients-toolbar">` +
    `<button type="button" class="btn-med-secondary" data-inherit-select="all">Seleccionar todos</button>` +
    `<button type="button" class="btn-med-secondary" data-inherit-select="none">Ninguno</button>` +
    `</div>` +
    unassignedToggle +
    rows +
    `<p class="inherit-patients-count" data-inherit-count aria-live="polite"></p>`
  );
}

/**
 * @param {{ targetName: string, sourceName: string, selectedCount: number }} model
 */
export function buildInheritStepConfirmHtml(model) {
  const n = Number(model.selectedCount || 0);
  return (
    buildInheritStepDotsHtml(3) +
    `<p class="inherit-patients-lead">Paso 4 — Confirma el movimiento.</p>` +
    `<div class="inherit-confirm-card">` +
    `<p><span class="inherit-confirm-label">Desde</span> <strong>${escapeHtml(model.sourceName || 'Sin equipo')}</strong></p>` +
    `<p class="inherit-confirm-arrow" aria-hidden="true">↓</p>` +
    `<p><span class="inherit-confirm-label">Hacia</span> <strong>${escapeHtml(model.targetName)}</strong></p>` +
    `<p class="inherit-confirm-count">${n === 1 ? '1 paciente' : `${n} pacientes`}</p>` +
    `</div>`
  );
}

/** @deprecated kept for tests that assert checkbox markup */
export function buildInheritPatientsModalBodyHtml(model) {
  return buildInheritStepPacientesHtml({
    targetName: model.targetName,
    sourceName: model.groups?.[0]?.sourceLabel || 'origen',
    patients: model.groups?.flatMap((g) => g.patients || []) || [],
    includeUnassigned: false,
    unassignedCount: 0,
  });
}

function selectedPatientIds() {
  const bd = backdropEl();
  if (!bd) return [];
  return [...bd.querySelectorAll('input[data-inherit-patient]:checked')]
    .map((el) => String(el.getAttribute('data-inherit-patient') || ''))
    .filter(Boolean);
}

function selectedPatientCountLabel(n) {
  if (n === 0) return 'Ningún paciente seleccionado.';
  if (n === 1) return '1 paciente listo para heredar.';
  return `${n} pacientes listos para heredar.`;
}

function inheritConfirmButtonLabel(n) {
  if (n === 1) return 'Heredar 1 paciente';
  return `Heredar ${n} pacientes`;
}

function syncFooterStep0(next) {
  next.disabled = false;
  next.textContent = 'Continuar · elegir origen';
}

function syncFooterStep1(next) {
  next.disabled = false;
  next.textContent = 'Continuar · pacientes';
}

function syncFooterStep2(next) {
  const n = selectedPatientIds().length;
  const count = document.querySelector('[data-inherit-count]');
  if (count) count.textContent = selectedPatientCountLabel(n);
  next.disabled = n === 0;
  next.textContent = n === 0 ? 'Elegir pacientes' : 'Continuar · confirmar';
}

function syncFooterStep3(next, state) {
  const n = selectedPatientIds().length || state?.selectedIds?.length || 0;
  next.disabled = n === 0;
  next.textContent = inheritConfirmButtonLabel(n);
}

function syncFooterForStep() {
  const state = sessionState();
  const back = document.getElementById('inherit-patients-back');
  const cancel = document.getElementById('inherit-patients-cancel');
  const next = document.getElementById('inherit-patients-confirm');
  if (!(next instanceof HTMLButtonElement)) return;
  const step = state?.step ?? 0;
  if (back) back.hidden = step === 0;
  if (cancel) cancel.textContent = step === 0 ? 'Más tarde' : 'Cancelar';

  if (step === 0) return syncFooterStep0(next);
  if (step === 1) return syncFooterStep1(next);
  if (step === 2) return syncFooterStep2(next);
  syncFooterStep3(next, state);
}

function sourceNameForState(state) {
  if (!state) return 'Sin equipo';
  if (!state.sourceTeamId) return 'Sin equipo / otros';
  const opt = (state.sourceOptions || []).find((s) => s.teamId === state.sourceTeamId);
  return opt?.name || 'Equipo anterior';
}

function renderCurrentStep() {
  const state = sessionState();
  const body = document.getElementById('inherit-patients-body');
  const title = document.getElementById('inherit-patients-title');
  if (!state || !body) return;

  if (title) {
    title.textContent =
      state.step === 0
        ? 'Heredar pacientes · destino'
        : state.step === 1
          ? 'Heredar pacientes · origen'
          : state.step === 2
            ? 'Heredar pacientes · lista'
            : 'Heredar pacientes · confirmar';
  }

  if (state.step === 0) {
    body.innerHTML = buildInheritStepDestinoHtml({
      targetName: state.targetName,
      sala: state.targetSala,
      cycle: state.targetCycle,
    });
  } else if (state.step === 1) {
    body.innerHTML = buildInheritStepOrigenHtml({
      targetName: state.targetName,
      sources: state.sourceOptions,
      unassignedCount: state.unassignedCount,
      selectedSourceId: state.sourceTeamId,
    });
  } else if (state.step === 2) {
    const patients = patientsForInheritSource(state.grouped, state.sourceTeamId, {
      includeUnassigned: !!state.includeUnassigned,
    });
    body.innerHTML = buildInheritStepPacientesHtml({
      targetName: state.targetName,
      sourceName: sourceNameForState(state),
      patients,
      includeUnassigned: !!state.includeUnassigned,
      unassignedCount: state.unassignedCount,
    });
  } else {
    body.innerHTML = buildInheritStepConfirmHtml({
      targetName: state.targetName,
      sourceName: sourceNameForState(state),
      selectedCount: (state.selectedIds || []).length,
    });
  }
  syncFooterForStep();
}

export function closeInheritPatientsModal() {
  const bd = backdropEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
  bd._rpcInheritTarget = null;
  bd._rpcInheritState = null;
}

function resolveInheritTargetTeam(tid, teamName) {
  return (
    (clinicalSessionContext.teams || []).find((t) => String(t?.team_id) === tid) || {
      team_id: tid,
      name: teamName,
    }
  );
}

function buildInheritSessionState(tid, targetTeam, targetName, grouped, sourcePick) {
  const preferred = sourcePick.preferredSourceTeamId || sourcePick.sources[0]?.teamId || '';
  return {
    step: 0,
    targetTeamId: tid,
    targetName,
    targetSala: String(targetTeam.sala || '').trim(),
    targetCycle: String(targetTeam.sub_area_fraction || '').trim().toUpperCase(),
    grouped,
    sourceOptions: sourcePick.sources,
    unassignedCount: sourcePick.unassignedCount,
    sourceTeamId: preferred,
    includeUnassigned: false,
    selectedIds: [],
  };
}

function showInheritPatientsModal(bd, state, tid, targetName) {
  setSessionState(state);
  bd._rpcInheritTarget = { teamId: tid, teamName: targetName };
  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  renderCurrentStep();
}

/**
 * @param {{ teamId: string, teamName?: string }} opts
 */
export async function openInheritPatientsModal(opts) {
  const tid = String(opts?.teamId || '').trim();
  if (!tid || typeof document === 'undefined') return { offered: false };

  const bd = backdropEl();
  const body = document.getElementById('inherit-patients-body');
  if (!bd || !body) return { offered: false };

  try {
    await fetchClinicalScopeContextFromDb();
  } catch {
    /* optional */
  }

  const targetTeam = resolveInheritTargetTeam(tid, opts.teamName);
  const targetName = String(opts.teamName || targetTeam.name || 'tu equipo').trim();
  const grouped = groupBringablePatientsForInherit(tid, targetTeam);
  if (!grouped.total) return { offered: false };

  const sourcePick = listInheritSourceOptions(targetTeam, grouped);
  const state = buildInheritSessionState(tid, targetTeam, targetName, grouped, sourcePick);
  showInheritPatientsModal(bd, state, tid, targetName);

  return new Promise((resolve) => {
    bd._rpcInheritResolve = resolve;
  });
}

async function confirmInherit() {
  const bd = backdropEl();
  const state = sessionState();
  const resolve = bd?._rpcInheritResolve;
  if (!state?.targetTeamId) return;

  const ids = state.selectedIds?.length ? state.selectedIds : selectedPatientIds();
  if (!ids.length) return;

  const btn = document.getElementById('inherit-patients-confirm');
  if (btn instanceof HTMLButtonElement) {
    btn.disabled = true;
    btn.textContent = 'Heredando…';
  }

  const { claimed, errors } = await assignBringablePatientsToTeam(ids, state.targetTeamId);
  closeInheritPatientsModal();

  if (claimed > 0) {
    toast(
      claimed === 1
        ? `1 paciente heredado a «${state.targetName}».`
        : `${claimed} pacientes heredados a «${state.targetName}».`,
      'success'
    );
  }
  if (errors?.length) {
    toast(`No se pudieron heredar ${errors.length} paciente(s).`, 'warn');
  }
  if (typeof resolve === 'function') resolve({ offered: true, claimed, errors });
  if (bd) bd._rpcInheritResolve = null;
}

function skipInherit() {
  const bd = backdropEl();
  const resolve = bd?._rpcInheritResolve;
  closeInheritPatientsModal();
  if (typeof resolve === 'function') resolve({ offered: true, claimed: 0, skipped: true });
  if (bd) bd._rpcInheritResolve = null;
}

function goNext() {
  const state = sessionState();
  if (!state) return;
  if (state.step === 0) {
    state.step = 1;
    setSessionState(state);
    renderCurrentStep();
    return;
  }
  if (state.step === 1) {
    const picked = document.querySelector('input[name="inherit-source"]:checked');
    state.sourceTeamId = picked ? String(picked.getAttribute('data-inherit-source') || '') : '';
    state.step = 2;
    setSessionState(state);
    renderCurrentStep();
    return;
  }
  if (state.step === 2) {
    state.selectedIds = selectedPatientIds();
    if (!state.selectedIds.length) return;
    state.step = 3;
    setSessionState(state);
    renderCurrentStep();
    return;
  }
  void confirmInherit();
}

function goBack() {
  const state = sessionState();
  if (!state || state.step === 0) return;
  if (state.step === 2) state.selectedIds = selectedPatientIds();
  state.step -= 1;
  setSessionState(state);
  renderCurrentStep();
}

export function wireInheritPatientsModal() {
  if (wired || typeof document === 'undefined') return;
  wired = true;
  const bd = backdropEl();
  if (!bd) return;

  bd.addEventListener('click', (ev) => {
    if (ev.target === bd) skipInherit();
    const t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;
    if (t.closest('[data-inherit-select="all"]')) {
      bd.querySelectorAll('input[data-inherit-patient]').forEach((el) => {
        if (el instanceof HTMLInputElement) el.checked = true;
      });
      syncFooterForStep();
    }
    if (t.closest('[data-inherit-select="none"]')) {
      bd.querySelectorAll('input[data-inherit-patient]').forEach((el) => {
        if (el instanceof HTMLInputElement) el.checked = false;
      });
      syncFooterForStep();
    }
  });
  bd.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!(el instanceof HTMLInputElement)) return;
    const state = sessionState();
    if (!state) return;
    if (el.hasAttribute('data-inherit-patient')) {
      syncFooterForStep();
      return;
    }
    if (el.hasAttribute('data-inherit-include-unassigned')) {
      state.includeUnassigned = el.checked;
      setSessionState(state);
      renderCurrentStep();
      return;
    }
    if (el.name === 'inherit-source') {
      state.sourceTeamId = String(el.getAttribute('data-inherit-source') || '');
      setSessionState(state);
    }
  });
  document.getElementById('inherit-patients-cancel')?.addEventListener('click', () => skipInherit());
  document.getElementById('inherit-patients-back')?.addEventListener('click', () => goBack());
  document.getElementById('inherit-patients-confirm')?.addEventListener('click', () => goNext());
}
