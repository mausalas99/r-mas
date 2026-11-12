// Entrega modal open/close + data loading. The form itself is the Preact view (../entrega-modal-view.jsx),
// loaded on first open; this file feeds it a model and saves what it hands back.
import {
  clinicalSessionContext,
  fetchClinicalScopeContextFromDb,
  refreshGuardiaCensusFromDb,
  getClinicalScopeContextForEvaluate,
} from '../../clinical-access-runtime.mjs';
import { computeSalaAbcdefDeficitWrite } from '../../clinico-access.mjs';
import { effectiveClinicalRank } from '../../clinical-privileges.mjs';
import { normalizePendientesJson } from '../../../../lib/entrega/entrega-pendientes.mjs';
import {
  handoffFieldsFromContext,
  initialVitalsPlan,
  resolveEntregaActorRole,
  vitalsUiFromPlan,
} from '../entrega-modal-state.mjs';
import { teamLabelById } from '../../patient-team-assign-ui.mjs';
import {
  dbApi,
  entregaModalEl,
  mergeSalaGuardiaTodayRows,
  resolveEntregaPatientRow,
  toast,
  userOptionLabel,
} from './clinical-entrega-util.mjs';
import {
  collectEntregaScopeUsers,
  ensureEntregaTargetUser,
  listEntregaTargets,
} from './clinical-entrega-targets.mjs';
import {
  entregaSourceTeamHint,
  entregaSourceTeamSelectOptions,
  findEntregaTeamById,
  lookupEntregaCensusTeamId,
  resolveEntregaSourceTeamId,
  entregaTeamOptionLabel,
} from './clinical-entrega-team.mjs';
import { persistEntregaFormState } from './clinical-entrega-submit.mjs';
import {
  resolveEntregaPhaseCovering,
  resolveUserSalaForEntrega,
} from './clinical-entrega-phase.mjs';
import { closeEntregaModal, setEntregaOnClosed } from './clinical-entrega-close.mjs';

export { closeEntregaModal };

/** The patient the open modal is editing; the view's fields come from `draftRef`. */
let session = null;
const draftRef = { current: null };
let backdropWired = false;
let entregaNavBusy = false;
let viewPromise = null;
let modelSeq = 0;

const loadView = () => (viewPromise ||= import('../entrega-modal-view.jsx'));

const rosterMode = () => !!session?.rosterIds?.length;

function wireBackdropOnce(bd) {
  if (backdropWired) return;
  backdropWired = true;
  bd.addEventListener('click', (ev) => {
    if (ev.target === bd) closeEntregaModal();
  });
  setEntregaOnClosed(() => {
    session = null;
    draftRef.current = null;
    void loadView().then((v) => v.clearEntregaModal(bd));
  });
}

async function navigateRosterPatient(delta) {
  if (entregaNavBusy || !session) return;
  const ids = session.rosterIds;
  const idx = session.patientIndex;
  if (!ids?.length || !Number.isFinite(idx)) return;
  const nextIdx = idx + delta;
  if (nextIdx < 0 || nextIdx >= ids.length) return;

  entregaNavBusy = true;
  try {
    const saved = await persistEntregaFormState(session, draftRef.current?.(), { silent: true });
    if (!saved.ok) {
      toast(saved.error || 'Completa R1 y equipo antes de cambiar de paciente.', 'error');
      return;
    }
    openEntregaModal({
      patientId: String(ids[nextIdx]),
      patientIndex: nextIdx,
      patientTotal: ids.length,
      rosterPatientIds: ids,
      onConfirm: session.onConfirm,
    });
  } finally {
    entregaNavBusy = false;
  }
}

async function submitEntregaForm() {
  const roster = rosterMode();
  const saved = await persistEntregaFormState(session, draftRef.current?.(), { silent: roster });
  if (!saved.ok) return;

  if (roster) {
    toast('Paciente guardado.', 'success');
    return;
  }

  const onConfirm = session?.onConfirm;
  closeEntregaModal();
  if (typeof onConfirm === 'function') onConfirm();
}

/**
 * @param {{
 *   patientId: string,
 *   guardiaId?: string,
 *   onConfirm?: () => void,
 *   patientIndex?: number,
 *   patientTotal?: number,
 *   rosterPatientIds?: string[],
 * }} opts
 */
export function openEntregaModal(opts) {
  void openEntregaModalAsync(opts);
}

function entregaNavModel_(opts, patient) {
  const bed = patient?.bed_label || patient?.bed || '—';
  const name = String(patient?.name || '').trim();
  const idx = opts?.patientIndex;
  const total = opts?.patientTotal;
  const rosterIdx = Number.isFinite(idx) ? idx : -1;
  const rosterTotal = Array.isArray(opts?.rosterPatientIds) ? opts.rosterPatientIds.length : 0;
  return {
    name: name ? `${name} · Cama ${bed}` : '—',
    dx: patient ? String(patient.diagnosticosText || patient.service || '').toUpperCase() : '',
    counter: Number.isFinite(idx) && Number.isFinite(total) && total > 0 ? `${idx + 1} de ${total}` : '',
    prevDisabled: rosterIdx <= 0,
    nextDisabled: rosterIdx < 0 || rosterIdx >= rosterTotal - 1,
  };
}

function resolvePreferredEntregaCovering_(params) {
  const { existing, teams, users, userId, rank, salaGuardiaToday } = params;
  const preferred = existing?.covering_user_id ? String(existing.covering_user_id) : '';
  if (preferred || existing) return preferred;
  const salaForCover = resolveUserSalaForEntrega(teams, userId);
  const mergedGuardia = mergeSalaGuardiaTodayRows(teams, salaGuardiaToday);
  const phaseCoveringResolved =
    salaForCover &&
    resolveEntregaPhaseCovering({
      userId,
      rank,
      users,
      teams,
      sala: salaForCover,
      salaGuardiaToday: mergedGuardia,
      guardiaActivated: false,
      guardiaMode: !!clinicalSessionContext.guardiaMode,
    });
  if (phaseCoveringResolved?.coveringUserId === userId) return userId;
  return phaseCoveringResolved?.coveringUserId || preferred;
}

function buildEntregaCoveringState_(params) {
  const {
    existing,
    teams,
    users,
    userId,
    rank,
    salaGuardiaToday,
    salaDeficit,
  } = params;
  const { targets, flow } = listEntregaTargets(rank, teams, users, salaDeficit, { currentUserId: userId });
  const preferred = resolvePreferredEntregaCovering_({
    existing,
    teams,
    users,
    userId,
    rank,
    salaGuardiaToday,
  });
  const targetList = ensureEntregaTargetUser([...targets], users, preferred, '');
  const resolvedPreferred = preferred || targetList[0]?.user_id || '';
  return { targetList, flow, preferred: resolvedPreferred };
}

async function entregaTeamModel_(params) {
  const { patientId, patientRow, teams, existing, userId } = params;
  const scopeCtx = getClinicalScopeContextForEvaluate();
  const ctx = clinicalSessionContext.scopeContext || {};
  const assignments = scopeCtx.assignments || ctx.assignments || [];
  const censusTeamId = await lookupEntregaCensusTeamId(
    patientId,
    patientRow,
    teams,
    assignments,
    scopeCtx.now || new Date()
  );
  const hasCensusAssignment = !!censusTeamId;
  const srcTeamId = resolveEntregaSourceTeamId(patientId, patientRow, teams, assignments, existing, userId);
  const hint = entregaSourceTeamHint({
    hasCensusAssignment,
    hasExistingSourceTeam: !!existing?.source_team_id,
  });
  const srcTeam = findEntregaTeamById(srcTeamId, teams);
  const censusLabel = srcTeam
    ? entregaTeamOptionLabel(srcTeam)
    : srcTeamId
      ? teamLabelById(srcTeamId)
      : '';

  if (hasCensusAssignment && srcTeamId && censusLabel) {
    return { options: [{ value: String(srcTeamId), label: censusLabel }], value: String(srcTeamId), disabled: true, hint, srcTeamId };
  }
  const options = entregaSourceTeamSelectOptions(srcTeamId, teams, userId, clinicalSessionContext.user).map((t) => ({
    value: String(t.team_id),
    label: entregaTeamOptionLabel(t),
  }));
  return { options, value: String(srcTeamId || options[0]?.value || ''), disabled: false, hint, srcTeamId };
}

const FLOW_LABELS = {
  r2: 'R2: mismo servicio, R4, o cubridores Sala en déficit.',
  r2_handoff: 'R2: selecciona R4 de Sala y R2 de guardia (dos entregas separadas).',
  r3_suggest: 'R3: sugeridos por día de guardia del equipo (confirma).',
  generic: 'Cualquier usuario registrado.',
};

function entregaTitle_(existing, guardiaId, actor) {
  if (guardiaId || existing?.guardia_id) {
    return actor.role === 'guardia' ? 'Pendientes de guardia' : 'Actualizar entrega';
  }
  return clinicalSessionContext.guardiaMode ? 'Entrega / pendientes' : 'Nueva entrega';
}

async function guardEntregaPatientSwitch_(bd, patientId) {
  const switchingPatient =
    bd.classList.contains('open') &&
    session?.patientId &&
    patientId &&
    session.patientId !== patientId &&
    rosterMode();
  if (!switchingPatient) return true;
  const saved = await persistEntregaFormState(session, draftRef.current?.(), { silent: true });
  if (saved.ok) return true;
  toast(saved.error || 'Completa R1 y equipo antes de cambiar de paciente.', 'error');
  return false;
}

async function findExistingGuardia_(opts, patientId) {
  const existing = opts?.guardiaId
    ? clinicalSessionContext.guardias.find((g) => String(g.guardia_id) === String(opts.guardiaId))
    : clinicalSessionContext.guardiasMap.get(patientId);
  if (existing || !patientId) return existing;
  // The session census lists only handoffs this user covers. The sender must
  // still reopen their own handoff, or «Guardar» would overwrite it blank.
  const res = await dbApi()?.dbGuardiaCensus?.({});
  return (res?.guardias || []).find((g) => String(g.patient_id) === patientId);
}

async function loadEntregaModalContext_(opts) {
  await refreshGuardiaCensusFromDb(null);
  await fetchClinicalScopeContextFromDb();
  const patientId = String(opts?.patientId || '');
  const existing = await findExistingGuardia_(opts, patientId);
  const guardiaId = opts?.guardiaId ? String(opts.guardiaId) : String(existing?.guardia_id || '');
  const ctx = clinicalSessionContext.scopeContext || {};
  const teams = clinicalSessionContext.teams || ctx.teams || [];
  const users = collectEntregaScopeUsers(ctx, teams, clinicalSessionContext.user);
  const salaGuardiaToday = Array.isArray(ctx.salaGuardiaToday) ? ctx.salaGuardiaToday : [];
  const userId = String(clinicalSessionContext.user?.user_id || '');
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const salaDeficit = computeSalaAbcdefDeficitWrite(salaGuardiaToday, teams, userId, new Date());
  const coveringState = buildEntregaCoveringState_({
    existing,
    teams,
    users,
    userId,
    rank,
    salaGuardiaToday,
    salaDeficit,
  });
  return {
    patientId,
    guardiaId,
    existing,
    teams,
    userId,
    coveringState,
    patient: resolveEntregaPatientRow(patientId),
  };
}

async function openEntregaModalAsync(opts) {
  const bd = entregaModalEl();
  if (!bd) return;
  wireBackdropOnce(bd);
  const viewReady = loadView();

  const patientId = String(opts?.patientId || '');
  if (!(await guardEntregaPatientSwitch_(bd, patientId))) return;

  const modalCtx = await loadEntregaModalContext_(opts);
  const { existing } = modalCtx;
  const patientRow = modalCtx.patient || resolveEntregaPatientRow(modalCtx.patientId);
  const { targetList, flow, preferred } = modalCtx.coveringState;
  const team = await entregaTeamModel_({
    patientId: modalCtx.patientId,
    patientRow,
    teams: modalCtx.teams,
    existing,
    userId: modalCtx.userId,
  });
  const actor = resolveEntregaActorRole(clinicalSessionContext.user, existing);
  const doc = normalizePendientesJson(existing?.pendientes_json);
  const view = await viewReady;

  session = {
    patientId: modalCtx.patientId,
    guardiaId: modalCtx.guardiaId || undefined,
    onConfirm: typeof opts?.onConfirm === 'function' ? opts.onConfirm : null,
    rosterIds: Array.isArray(opts?.rosterPatientIds) ? opts.rosterPatientIds.slice() : null,
    patientIndex: Number.isFinite(opts?.patientIndex) ? opts.patientIndex : null,
  };
  const options = targetList.map((u) => ({ value: String(u.user_id), label: userOptionLabel(u) }));
  const model = {
    key: ++modelSeq,
    nav: entregaNavModel_(opts, modalCtx.patient),
    title: entregaTitle_(existing, modalCtx.guardiaId, actor),
    covering: {
      options,
      value: String(preferred || options[0]?.value || ''),
      hint: 'Residente de guardia que asumirá la cobertura nocturna de este paciente.',
    },
    team,
    flowHint: flow === 'r1' ? '' : FLOW_LABELS[flow] || FLOW_LABELS.generic,
    actor,
    markPatientId: patientRow?.id ? String(patientRow.id) : '',
    initial: {
      handoff: handoffFieldsFromContext(doc.handoffContext, {
        signedRefusal: !!Number(patientRow?.negativa_maniobras_firmada),
      }),
      isCritical: !!existing?.is_critical,
      vitalsUi: vitalsUiFromPlan(
        initialVitalsPlan({ vitalsPlan: doc.vitalsPlan, vitalsFrequency: existing?.vitals_frequency })
      ),
      items: doc.items.slice(),
    },
  };
  view.drawEntregaModal(bd, {
    model,
    draftRef,
    onCancel: closeEntregaModal,
    onSubmit: () => void submitEntregaForm(),
    onNav: (delta) => void navigateRosterPatient(delta),
  });
  bd.classList.add('open');
  document.body.classList.add('entrega-modal-open');
  bd.setAttribute('aria-hidden', 'false');
  bd.querySelector('#entrega-covering-user')?.focus();
}
