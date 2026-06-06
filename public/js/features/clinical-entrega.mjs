/**
 * Entrega (handoff) modal — assign active_guardias with rank-based eligibility.
 */
import { patients } from '../app-state.mjs';
import {
  clinicalSessionContext,
  refreshGuardiaCensusFromDb,
  signOutgoingLiveSyncMutation,
} from '../clinical-access-runtime.mjs';
import {
  computeSalaAbcdefDeficitWrite,
  getJoinedTeams,
  isOnCallToday,
  salaOnCallR1,
  salaOnCallR2,
} from '../clinico-access.mjs';
import { effectiveClinicalRank } from '../clinical-privileges.mjs';
import { serializePendientesJson } from '../../../lib/entrega/entrega-pendientes.mjs';
import { vitalsFrequencyForDb } from '../../../lib/entrega/entrega-vitals-plan.mjs';
import { scheduleLiveSyncPush } from './lan-sync.mjs';
import {
  getEntregaDraftItems,
  readEntregaHandoffContext,
  mountEntregaPendientesUi,
  readEntregaCriticalFromHandoff,
  readEntregaVitalsPlan,
  resetEntregaModalUi,
  resolveEntregaActorRole as resolveEntregaActorRoleImpl,
} from './entrega-modal-ui.mjs';
import {
  ensureGuardiaHoyBeforeEntrega,
  mergeSalaGuardiaTodayRows,
} from './guardia-hoy-modal.mjs';
import {
  openEntregaRosterPanel,
  closeEntregaRosterPanel,
  isEntregaRosterOpen,
} from './entrega-roster-panel.mjs';

export function resolveEntregaActorRole(currentUser, existingGuardia) {
  return resolveEntregaActorRoleImpl(currentUser, existingGuardia);
}

/** @deprecated — use ENTREGA_PHASE_KEY */
export const GUARDIA_GRID_MODE_KEY = 'guardia.gridMode';
export const ENTREGA_PHASE_KEY = 'guardia.entregaPhase';

/** @param {object[]} users */
function normalizeUsers(users) {
  return (users || [])
    .map((u) => ({
      user_id: String(u.user_id || u.userId || ''),
      username: String(u.username || ''),
      rank: String(u.rank || ''),
      clinical_name: String(u.clinical_name || ''),
    }))
    .filter((u) => u.user_id);
}

/** @param {{ username?: string, clinical_name?: string, rank?: string, user_id?: string }} u */
function userOptionLabel(u) {
  const handle = String(u.username || u.user_id || '');
  const name = String(u.clinical_name || '').trim();
  const rank = String(u.rank || '');
  return name ? `${handle} · ${name} (${rank})` : `${handle} (${rank})`;
}

/** @param {object[]} list */
function uniqueByUserId(list) {
  const seen = new Set();
  return list.filter((u) => {
    if (seen.has(u.user_id)) return false;
    seen.add(u.user_id);
    return true;
  });
}

/**
 * Ensure a covering user appears in the entrega target dropdown (avoids blank select).
 * @param {object[]} targetList
 * @param {object[]} users
 * @param {string} userId
 * @param {string} [fallbackLabel]
 */
export function ensureEntregaTargetUser(targetList, users, userId, fallbackLabel = '') {
  const id = String(userId || '').trim();
  if (!id || targetList.some((u) => u.user_id === id)) return targetList;
  const match = normalizeUsers(users).find((u) => u.user_id === id);
  if (match) return [match, ...targetList];
  return [
    {
      user_id: id,
      username: fallbackLabel || 'Residente de guardia',
      rank: 'R1',
      clinical_name: '',
    },
    ...targetList,
  ];
}

/**
 * Users available for entrega labels — scope context, team rosters, and session user.
 * @param {object|null|undefined} scopeContext
 * @param {object[]} teams
 * @param {object|null|undefined} sessionUser
 */
export function collectEntregaScopeUsers(scopeContext, teams, sessionUser = null) {
  const parts = [];
  if (Array.isArray(scopeContext?.users)) parts.push(...scopeContext.users);
  for (const team of teams || []) {
    for (const m of team.members || []) {
      if (!m?.user_id) continue;
      parts.push({
        user_id: m.user_id,
        username: m.username,
        rank: m.rank,
        clinical_name: m.clinical_name,
      });
    }
  }
  if (sessionUser?.user_id) parts.push(sessionUser);
  return uniqueByUserId(normalizeUsers(parts));
}

/**
 * @param {string} rank
 * @param {object[]} teams
 * @param {object[]} users
 * @param {boolean} salaDeficit
 * @param {{ currentUserId?: string, now?: string|Date }} [opts]
 */
export function listEntregaTargets(rank, teams, users, salaDeficit, opts = {}) {
  const currentUserId = String(opts.currentUserId || '');
  const now = opts.now ? new Date(String(opts.now)) : new Date();
  const all = normalizeUsers(users);
  const teamList = Array.isArray(teams) ? teams : [];
  const rankNorm = String(rank || 'R1');

  const joinedTeams = currentUserId ? getJoinedTeams(teamList, currentUserId) : [];

  if (rankNorm === 'R3') {
    const suggestedIds = new Set();
    teamList.forEach((team) => {
      if (!isOnCallToday(team, 'R3', now)) return;
      (team.members || []).forEach((m) => {
        if (m?.user_id) suggestedIds.add(String(m.user_id));
      });
    });
    const targets = all.filter((u) => suggestedIds.has(u.user_id));
    return {
      flow: 'r3_suggest',
      targets: targets.length ? uniqueByUserId(targets) : all,
    };
  }

  if (rankNorm === 'R2') {
    const r2GuardiaOnCall = salaOnCallR2(teamList, now);
    const r2GuardiaIds = new Set(r2GuardiaOnCall.map((r) => r.user_id));

    const r2GuardiaUsers = all.filter((u) => r2GuardiaIds.has(u.user_id));
    const r4s = all.filter((u) => u.rank === 'R4');

    const targets = uniqueByUserId([...r2GuardiaUsers, ...r4s]);
    return { flow: 'r2_handoff', targets: targets.length ? targets : all };
  }

  if (rankNorm === 'R1') {
    let userSala = '';
    for (const t of joinedTeams) {
      const sala = String(t.sala || '').trim();
      if (sala) {
        userSala = sala;
        break;
      }
    }
    const salaGuardiaToday = mergeSalaGuardiaTodayRows(
      teamList,
      clinicalSessionContext.salaGuardiaToday || []
    );
    const onCallIds = new Set(
      (userSala ? salaOnCallR1(teamList, userSala, now, salaGuardiaToday) : []).map((r) =>
        String(r.user_id)
      )
    );
    const onCallTargets = all.filter((u) => u.rank === 'R1' && onCallIds.has(u.user_id));

    const joinedIds = new Set(joinedTeams.map((t) => String(t.team_id)));
    const fractions = new Set(
      joinedTeams.map((t) => String(t.sub_area_fraction || '').trim()).filter(Boolean)
    );
    const peerTargets = all.filter((u) => {
      if (u.rank !== 'R1') return false;
      return teamList.some((team) => {
        const member = (team.members || []).some((m) => String(m.user_id) === u.user_id);
        if (!member) return false;
        if (joinedIds.has(String(team.team_id))) return true;
        const frac = String(team.sub_area_fraction || '').trim();
        return frac && fractions.has(frac);
      });
    });
    const targets = uniqueByUserId([...onCallTargets, ...peerTargets]);
    return { flow: 'r1', targets: targets.length ? targets : all };
  }

  return { flow: 'generic', targets: all };
}

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

function setEntregaToolbarStatus(msg, isError = false) {
  const status = document.getElementById('guardia-entrega-phase-status');
  if (!status) return;
  if (!msg) {
    status.hidden = true;
    status.textContent = '';
    status.classList.remove('guardia-entrega-phase-status--error');
    return;
  }
  status.hidden = false;
  status.textContent = msg;
  status.classList.toggle('guardia-entrega-phase-status--error', isError);
}

function toast(msg, type = 'info') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
    return;
  }
  setEntregaToolbarStatus(msg, type === 'error');
}

/** @param {string} patientId */
function resolveEntregaPatientRow(patientId) {
  const id = String(patientId || '');
  if (!id) return null;
  return (
    (patients || []).find((p) => String(p.id) === id) ||
    (clinicalSessionContext.scopeContext?.patients || []).find(
      (p) => String(p.id || p.patient_id) === id
    ) ||
    null
  );
}

function entregaModalEl() {
  return document.getElementById('entrega-modal-backdrop');
}

/** @returns {string} */
function resolveDefaultSourceTeamId() {
  const userId = String(clinicalSessionContext.user?.user_id || '');
  const teams = clinicalSessionContext.teams || [];
  const joined = getJoinedTeams(teams, userId);
  if (joined[0]?.team_id) return String(joined[0].team_id);
  if (teams[0]?.team_id) return String(teams[0].team_id);
  return '';
}

/**
 * @param {{
 *   patientId: string,
 *   coveringUserId: string,
 *   sourceTeamId: string,
 *   guardiaId?: string,
 *   isCritical?: boolean,
 *   pendientesJson?: string,
 *   vitalsFrequency?: string,
 * }} payload
 */
export async function submitEntregaAssignment(payload) {
  const api = dbApi();
  if (!api || typeof api.dbGuardiaUpsert !== 'function') {
    throw new Error('Base clínica no disponible');
  }

  const patientId = String(payload.patientId || '');
  const deltaData = {
    coveringUserId: payload.coveringUserId,
    sourceTeamId: payload.sourceTeamId,
    isCritical: !!payload.isCritical,
    pendientesJson: payload.pendientesJson || '[]',
    vitalsFrequency: payload.vitalsFrequency || 'None',
  };

  await signOutgoingLiveSyncMutation(
    { patientId, entityId: patientId, data: deltaData, op: 'entrega.assign' },
    'entrega.assign'
  );

  const res = await api.dbGuardiaUpsert({
    patientId,
    coveringUserId: payload.coveringUserId,
    sourceTeamId: payload.sourceTeamId,
    guardiaId: payload.guardiaId,
    isCritical: payload.isCritical ? 1 : 0,
    pendientesJson: payload.pendientesJson || '[]',
    vitalsFrequency: payload.vitalsFrequency || 'None',
  });

  if (!res || res.ok === false) {
    throw new Error(res?.error || 'No se guardó la entrega');
  }

  return res.guardia;
}

let entregaFormWired = false;

function wireEntregaFormOnce() {
  if (entregaFormWired) return;
  entregaFormWired = true;

  const form = document.getElementById('entrega-form');
  const cancelBtn = document.getElementById('btn-entrega-cancel');
  const bd = entregaModalEl();

  if (cancelBtn) cancelBtn.addEventListener('click', () => closeEntregaModal());
  if (bd) {
    bd.addEventListener('click', (ev) => {
      if (ev.target === bd) closeEntregaModal();
    });
  }

  const navPrev = document.getElementById('entrega-nav-prev');
  const navNext = document.getElementById('entrega-nav-next');
  const navigateRosterPatient = (delta) => {
    const entregaForm = document.getElementById('entrega-form');
    const ids = entregaForm?._entregaRosterIds;
    const idx = entregaForm?._entregaPatientIndex;
    if (!ids?.length || !Number.isFinite(idx)) return;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= ids.length) return;
    openEntregaModal({
      patientId: String(ids[nextIdx]),
      patientIndex: nextIdx,
      patientTotal: ids.length,
      rosterPatientIds: ids,
      onConfirm: entregaForm._entregaOnConfirm,
    });
  };
  navPrev?.addEventListener('click', () => navigateRosterPatient(-1));
  navNext?.addEventListener('click', () => navigateRosterPatient(1));

  if (!form) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const patientId = String(form.dataset.patientId || '');
    const guardiaId = form.dataset.guardiaId ? String(form.dataset.guardiaId) : undefined;
    const phaseCovering = getEntregaPhaseCoveringUserId();
    const existingGuardia = guardiaId
      ? clinicalSessionContext.guardias.find((g) => String(g.guardia_id) === guardiaId)
      : clinicalSessionContext.guardiasMap.get(patientId);
    const coveringUserId = String(
      document.getElementById('entrega-covering-user')?.value ||
        phaseCovering ||
        existingGuardia?.covering_user_id ||
        ''
    );
    const sourceTeamId =
      String(document.getElementById('entrega-source-team')?.value || '') ||
      resolveDefaultSourceTeamId();
    const isCritical = readEntregaCriticalFromHandoff();
    const vitalsPlan = readEntregaVitalsPlan();
    const vitalsFrequency = vitalsFrequencyForDb(vitalsPlan.frequency);
    const handoffContext = readEntregaHandoffContext();

    if (!patientId || !coveringUserId || !sourceTeamId) {
      toast('Selecciona R1 de guardia y equipo de origen.', 'error');
      return;
    }

    const pendientesJson = serializePendientesJson({
      version: 2,
      vitalsPlan,
      handoffContext,
      items: getEntregaDraftItems(),
    });

    try {
      await submitEntregaAssignment({
        patientId,
        guardiaId,
        coveringUserId,
        sourceTeamId,
        isCritical,
        pendientesJson,
        vitalsFrequency,
      });
      toast('Entrega registrada.', 'success');
      const onConfirm = form._entregaOnConfirm;
      closeEntregaModal();
      await refreshGuardiaCensusFromDb(null);
      scheduleLiveSyncPush();
      if (typeof onConfirm === 'function') onConfirm();
    } catch (err) {
      toast(err?.message || 'Error al registrar entrega', 'error');
    }
  });
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
  wireEntregaFormOnce();

  const bd = entregaModalEl();
  const form = document.getElementById('entrega-form');
  if (!bd || !form) return;

  const patientId = String(opts?.patientId || '');
  const guardiaId = opts?.guardiaId ? String(opts.guardiaId) : '';
  const existing = guardiaId
    ? clinicalSessionContext.guardias.find((g) => String(g.guardia_id) === guardiaId)
    : clinicalSessionContext.guardiasMap.get(patientId);

  form.dataset.patientId = patientId;
  if (guardiaId) form.dataset.guardiaId = guardiaId;
  else delete form.dataset.guardiaId;
  form._entregaOnConfirm = typeof opts?.onConfirm === 'function' ? opts.onConfirm : null;
  form._entregaRosterIds = Array.isArray(opts?.rosterPatientIds) ? opts.rosterPatientIds.slice() : null;
  form._entregaPatientIndex = Number.isFinite(opts?.patientIndex) ? opts.patientIndex : null;

  const patient = resolveEntregaPatientRow(patientId);
  const navName = document.getElementById('entrega-modal-nav-name');
  const navDx = document.getElementById('entrega-modal-nav-dx');
  const navCounter = document.getElementById('entrega-modal-nav-counter');
  const activeBadge = document.getElementById('entrega-modal-active-badge');
  const navPrev = document.getElementById('entrega-nav-prev');
  const navNext = document.getElementById('entrega-nav-next');

  if (navName) {
    const bed = patient?.bed_label || patient?.bed || '—';
    const name = String(patient?.name || '').trim();
    navName.textContent = name ? `${name} · Cama ${bed}` : '—';
  }
  if (navDx) {
    navDx.textContent = patient
      ? String(patient.diagnosticosText || patient.service || '').toUpperCase()
      : '';
  }
  if (navCounter) {
    const idx = opts?.patientIndex;
    const total = opts?.patientTotal;
    navCounter.textContent =
      Number.isFinite(idx) && Number.isFinite(total) && total > 0
        ? `${idx + 1} de ${total}`
        : '';
  }
  if (activeBadge) {
    activeBadge.classList.toggle('hidden', !getEntregaPhase()?.active);
  }
  const rosterIdx = Number.isFinite(opts?.patientIndex) ? opts.patientIndex : -1;
  const rosterTotal = Array.isArray(opts?.rosterPatientIds) ? opts.rosterPatientIds.length : 0;
  if (navPrev) navPrev.disabled = rosterIdx <= 0;
  if (navNext) navNext.disabled = rosterIdx < 0 || rosterIdx >= rosterTotal - 1;

  const ctx = clinicalSessionContext.scopeContext || {};
  const teams = clinicalSessionContext.teams || ctx.teams || [];
  const users = collectEntregaScopeUsers(ctx, teams, clinicalSessionContext.user);
  const salaGuardiaToday = Array.isArray(ctx.salaGuardiaToday) ? ctx.salaGuardiaToday : [];
  const userId = String(clinicalSessionContext.user?.user_id || '');
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const salaDeficit = computeSalaAbcdefDeficitWrite(
    salaGuardiaToday,
    teams,
    userId,
    new Date()
  );

  const { targets, flow } = listEntregaTargets(rank, teams, users, salaDeficit, {
    currentUserId: userId,
  });

  const select = document.getElementById('entrega-covering-user');
  const teamSelect = document.getElementById('entrega-source-team');
  const hint = document.getElementById('entrega-flow-hint');
  const topStrip = form.querySelector('.entrega-top-strip');
  const phase = getEntregaPhase();
  const phaseCovering = getEntregaPhaseCoveringUserId();
  const hideR1Picker = !!(phase?.active && phaseCovering);
  topStrip?.classList.toggle('entrega-top-strip--phase-covering-set', hideR1Picker);

  if (select) {
    let preferred = existing?.covering_user_id
      ? String(existing.covering_user_id)
      : phaseCovering || '';
    if (
      !existing &&
      clinicalSessionContext.guardiaMode &&
      !phase?.active
    ) {
      const sala = resolveUserSalaForEntrega(teams, userId);
      const selfCovering = sala ? resolveR1GuardiaCovering(teams, users, sala) : null;
      if (selfCovering?.coveringUserId === userId) {
        preferred = userId;
      }
    }
    let targetList = [...targets];
    for (const id of [preferred, phaseCovering]) {
      targetList = ensureEntregaTargetUser(
        targetList,
        users,
        id,
        phase?.coveringLabel || ''
      );
    }
    if (!preferred && targetList[0]?.user_id) preferred = targetList[0].user_id;
    select.innerHTML = targetList
      .map((u) => `<option value="${u.user_id}">${userOptionLabel(u)}</option>`)
      .join('');
    if (preferred) select.value = preferred;
    const coverHint = document.getElementById('entrega-covering-hint');
    if (hideR1Picker) {
      select.disabled = true;
      select.removeAttribute('required');
      if (coverHint) {
        coverHint.textContent = '';
        coverHint.classList.add('hidden');
      }
    } else {
      select.disabled = false;
      select.setAttribute('required', '');
      if (coverHint) {
        coverHint.textContent =
          'Residente de guardia que asumirá la cobertura nocturna de este paciente.';
      }
    }
  }

  if (teamSelect) {
    const joined = getJoinedTeams(teams, userId);
    const teamOptions = (joined.length ? joined : teams).filter((t) => t?.team_id);
    teamSelect.innerHTML = teamOptions
      .map((t) => `<option value="${t.team_id}">${t.name} · ${t.service}</option>`)
      .join('');
    const src = existing?.source_team_id || resolveDefaultSourceTeamId();
    if (src) teamSelect.value = src;
  }

  if (hint) {
    const flowLabels = {
      r2: 'R2: mismo servicio, R4, o cubridores Sala en déficit.',
      r2_handoff: 'R2: selecciona R4 de Sala y R2 de guardia (dos entregas separadas).',
      r3_suggest: 'R3: sugeridos por día de guardia del equipo (confirma).',
      generic: 'Cualquier usuario registrado.',
    };
    if (flow === 'r1') {
      hint.textContent = '';
      hint.hidden = true;
    } else {
      hint.textContent = flowLabels[flow] || flowLabels.generic;
      hint.hidden = false;
    }
  }

  const actor = resolveEntregaActorRole(clinicalSessionContext.user, existing);
  const srcTeam =
    existing?.source_team_id || resolveDefaultSourceTeamId();
  const patientRow = patient || resolveEntregaPatientRow(patientId);
  void mountEntregaPendientesUi({
    actor,
    pendientesJson: existing?.pendientes_json,
    sourceTeamId: srcTeam,
    vitalsFrequency: existing?.vitals_frequency,
    isCritical: !!(existing?.is_critical),
    signedRefusal: !!Number(patientRow?.negativa_maniobras_firmada),
  });

  const title = document.getElementById('entrega-modal-title');
  if (title) {
    if (guardiaId || existing?.guardia_id) {
      title.textContent =
        actor.role === 'guardia' ? 'Pendientes de guardia' : 'Actualizar entrega';
    } else if (clinicalSessionContext.guardiaMode) {
      title.textContent = 'Entrega / pendientes';
    } else {
      title.textContent = 'Nueva entrega';
    }
  }

  const coverHint = document.getElementById('entrega-covering-hint');
  if (coverHint) {
    coverHint.classList.toggle('hidden', !coverHint.textContent?.trim());
  }

  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  if (hideR1Picker) teamSelect?.focus();
  else select?.focus();
}

export function closeEntregaModal() {
  const bd = entregaModalEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
  resetEntregaModalUi();
  const form = document.getElementById('entrega-form');
  if (form) form._entregaOnConfirm = null;
}

/**
 * R1 de guardia on-call for a sala (first match).
 * @param {object[]} teams
 * @param {object[]} users
 * @param {string} sala
 * @param {Date|string} [now]
 */
export function resolveR1GuardiaCovering(teams, users, sala, now = new Date(), salaGuardiaToday = []) {
  const salaNorm = String(sala || '').trim();
  if (!salaNorm) return null;
  const onCall = salaOnCallR1(teams, salaNorm, now, salaGuardiaToday);
  if (!onCall.length) return null;
  const pick = onCall[0];
  const u = normalizeUsers(users).find((x) => x.user_id === String(pick.user_id));
  return {
    coveringUserId: String(pick.user_id),
    teamId: String(pick.team_id || ''),
    sala: salaNorm,
    coveringLabel: u ? userOptionLabel(u) : String(pick.user_id),
  };
}

/** @param {object[]} teams @param {string} userId */
export function resolveUserSalaForEntrega(teams, userId) {
  const fromProfile = String(clinicalSessionContext.user?.sala || '').trim();
  if (fromProfile) return fromProfile;
  const joined = getJoinedTeams(teams || [], userId);
  for (const t of joined) {
    const sala = String(t.sala || '').trim();
    if (sala) return sala;
  }
  return '';
}

/**
 * @returns {{ active: boolean, coveringUserId?: string, sala?: string, coveringLabel?: string }|null}
 */
export function getEntregaPhase() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ENTREGA_PHASE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o && o.active) return o;
  } catch {
    /* ignore */
  }
  return null;
}

export function isEntregaPhaseActive() {
  return !!getEntregaPhase()?.active;
}

/** @returns {string} */
export function getEntregaPhaseCoveringUserId() {
  return String(getEntregaPhase()?.coveringUserId || '');
}

/**
 * @param {{ coveringUserId: string, sala: string, coveringLabel?: string, teamId?: string }} covering
 */
export function startEntregaPhase(covering) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(GUARDIA_GRID_MODE_KEY);
    localStorage.setItem(
      ENTREGA_PHASE_KEY,
      JSON.stringify({
        active: true,
        coveringUserId: String(covering.coveringUserId || ''),
        sala: String(covering.sala || ''),
        coveringLabel: String(covering.coveringLabel || ''),
        teamId: String(covering.teamId || ''),
        startedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* ignore quota */
  }
}

export function endEntregaPhase() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(ENTREGA_PHASE_KEY);
    localStorage.removeItem(GUARDIA_GRID_MODE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ settings?: Record<string, unknown>|null, renderGuardiaBoard?: (s: unknown) => void }} opts
 */
export function endEntregaPhaseFlow(opts = {}) {
  endEntregaPhase();
  closeEntregaRosterPanel();
  setEntregaToolbarStatus('');
  toast('Fase de entrega finalizada.', 'info');
  opts.renderGuardiaBoard?.(opts.settings);
  return { active: false };
}

/** @param {{ settings?: Record<string, unknown>|null, renderGuardiaBoard?: (s: unknown) => void }} opts */
export async function beginEntregaPhaseFlow(opts = {}) {
  const ctx = clinicalSessionContext.scopeContext || {};
  const teams = clinicalSessionContext.teams || ctx.teams || [];
  const userId = String(clinicalSessionContext.user?.user_id || '');
  const sala = resolveUserSalaForEntrega(teams, userId);

  if (!sala) {
    const msg = 'Indica tu Sala en el perfil clínico o únete a un equipo de Sala.';
    setEntregaToolbarStatus(msg, true);
    toast(msg, 'error');
    return { active: false };
  }

  const salaGuardiaToday = mergeSalaGuardiaTodayRows(
    teams,
    ctx.salaGuardiaToday || clinicalSessionContext.salaGuardiaToday || []
  );
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const proceed = await ensureGuardiaHoyBeforeEntrega({
    teams,
    sala,
    userId,
    rank,
    salaGuardiaToday,
  });
  if (!proceed) return { active: false };

  const users = collectEntregaScopeUsers(ctx, teams, clinicalSessionContext.user);
  const covering = resolveR1GuardiaCovering(teams, users, sala, new Date(), salaGuardiaToday);

  startEntregaPhase(
    covering || {
      coveringUserId: '',
      teamId: '',
      sala,
      coveringLabel: '',
    }
  );

  setEntregaToolbarStatus('');

  openEntregaRosterPanel(opts.settings);
  opts.renderGuardiaBoard?.(opts.settings);
  return { active: true, covering: covering || null };
}

/**
 * @param {{ settings?: Record<string, unknown>|null, renderGuardiaBoard?: (s: unknown) => void, exit?: boolean }} opts
 */
export function toggleEntregaPhase(opts = {}) {
  const wantsExit = opts.exit === true;

  if (isEntregaPhaseActive()) {
    if (wantsExit && isEntregaRosterOpen()) {
      return endEntregaPhaseFlow(opts);
    }
    if (!isEntregaRosterOpen()) {
      openEntregaRosterPanel(opts.settings);
      opts.renderGuardiaBoard?.(opts.settings);
      return { active: true, resumed: true };
    }
    if (wantsExit) {
      return endEntregaPhaseFlow(opts);
    }
  }

  return beginEntregaPhaseFlow(opts);
}

/** @returns {'GUARDIA'|'HANDOFF'} */
export function loadGuardiaGridViewContext() {
  if (isEntregaPhaseActive()) return 'HANDOFF';
  try {
    const mode = String(localStorage.getItem(GUARDIA_GRID_MODE_KEY) || 'censo').toLowerCase();
    if (mode === 'entrega') return 'HANDOFF';
  } catch {
    /* ignore */
  }
  return 'GUARDIA';
}

/** @deprecated — use toggleEntregaPhase / startEntregaPhase */
export function saveGuardiaGridMode(mode) {
  if (mode === 'entrega') {
    toggleEntregaPhase();
    return;
  }
  endEntregaPhase();
}
