/**
 * Multi-step modal: destino → elegir equipo que hereda → pacientes → confirmar.
 */
import { clinicalSessionContext, fetchClinicalScopeContextFromDb } from '../../clinical-access-runtime.mjs';
import { toast } from './shared.mjs';
import { drawInheritStep } from './teams-roster-inherit-patients-view.jsx';
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

  let props;
  if (state.step === 0) {
    props = { targetName: state.targetName, sala: state.targetSala, cycle: state.targetCycle };
  } else if (state.step === 1) {
    props = {
      targetName: state.targetName,
      sources: state.sourceOptions,
      unassignedCount: state.unassignedCount,
      selectedSourceId: state.sourceTeamId,
    };
  } else if (state.step === 2) {
    props = {
      targetName: state.targetName,
      sourceName: sourceNameForState(state),
      patients: patientsForInheritSource(state.grouped, state.sourceTeamId, {
        includeUnassigned: !!state.includeUnassigned,
      }),
      includeUnassigned: !!state.includeUnassigned,
      unassignedCount: state.unassignedCount,
    };
  } else {
    props = {
      targetName: state.targetName,
      sourceName: sourceNameForState(state),
      selectedCount: (state.selectedIds || []).length,
    };
  }
  drawInheritStep(body, state.step, props);
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
