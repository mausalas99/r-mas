/**
 * Entrega (handoff) modal — assign active_guardias with rank-based eligibility.
 */
import {
  clinicalSessionContext,
  refreshGuardiaCensusFromDb,
  signOutgoingLiveSyncMutation,
} from '../clinical-access-runtime.mjs';
import { computeSalaAbcdefDeficitWrite, getJoinedTeams, isOnCallToday, salaOnCallR2 } from '../clinico-access.mjs';
import { effectiveClinicalRank } from '../clinical-privileges.mjs';
import { scheduleLiveSyncPush } from './lan-sync.mjs';

export const GUARDIA_GRID_MODE_KEY = 'guardia.gridMode';

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
    const joinedIds = new Set(joinedTeams.map((t) => String(t.team_id)));
    const fractions = new Set(
      joinedTeams.map((t) => String(t.sub_area_fraction || '').trim()).filter(Boolean)
    );
    const targets = all.filter((u) => {
      if (u.rank !== 'R1') return false;
      return teamList.some((team) => {
        const member = (team.members || []).some((m) => String(m.user_id) === u.user_id);
        if (!member) return false;
        if (joinedIds.has(String(team.team_id))) return true;
        const frac = String(team.sub_area_fraction || '').trim();
        return frac && fractions.has(frac);
      });
    });
    return { flow: 'r1', targets: targets.length ? uniqueByUserId(targets) : all };
  }

  return { flow: 'generic', targets: all };
}

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

function toast(msg, type = 'info') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  }
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

  if (!form) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const patientId = String(form.dataset.patientId || '');
    const guardiaId = form.dataset.guardiaId ? String(form.dataset.guardiaId) : undefined;
    const coveringUserId = String(
      document.getElementById('entrega-covering-user')?.value || ''
    );
    const sourceTeamId =
      String(document.getElementById('entrega-source-team')?.value || '') ||
      resolveDefaultSourceTeamId();
    const pendientes = String(document.getElementById('entrega-pendientes')?.value || '').trim();
    const isCritical = !!document.getElementById('entrega-critical')?.checked;
    const vitalsFrequency = String(
      document.getElementById('entrega-vitals-frequency')?.value || 'None'
    );

    if (!patientId || !coveringUserId || !sourceTeamId) {
      toast('Selecciona usuario cubridor y equipo de origen.', 'error');
      return;
    }

    const pendientesJson = JSON.stringify(
      pendientes
        ? pendientes
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        : []
    );

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
 * @param {{ patientId: string, guardiaId?: string, onConfirm?: () => void }} opts
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

  const ctx = clinicalSessionContext.scopeContext || {};
  const teams = clinicalSessionContext.teams || ctx.teams || [];
  const users = Array.isArray(ctx.users) ? ctx.users : [];
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

  if (select) {
    select.innerHTML = targets
      .map(
        (u) => `<option value="${u.user_id}">${userOptionLabel(u)}</option>`
      )
      .join('');
    const preferred = existing?.covering_user_id
      ? String(existing.covering_user_id)
      : targets[0]?.user_id || '';
    if (preferred) select.value = preferred;
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
      r1: 'R1: mismos equipo o fracción de sub-área.',
      r2: 'R2: mismo servicio, R4, o cubridores Sala en déficit.',
      r2_handoff: 'R2: selecciona R4 de Sala y R2 de guardia (dos entregas separadas).',
      r3_suggest: 'R3: sugeridos por día de guardia del equipo (confirma).',
      generic: 'Cualquier usuario registrado.',
    };
    hint.textContent = flowLabels[flow] || flowLabels.generic;
  }

  const pendientesEl = document.getElementById('entrega-pendientes');
  const criticalEl = document.getElementById('entrega-critical');
  const vitalsEl = document.getElementById('entrega-vitals-frequency');
  if (pendientesEl) {
    try {
      const arr = JSON.parse(String(existing?.pendientes_json || '[]'));
      pendientesEl.value = Array.isArray(arr) ? arr.join('\n') : '';
    } catch {
      pendientesEl.value = '';
    }
  }
  if (criticalEl) criticalEl.checked = !!(existing?.is_critical);
  if (vitalsEl) vitalsEl.value = String(existing?.vitals_frequency || 'None');

  const title = document.getElementById('entrega-modal-title');
  if (title) title.textContent = guardiaId ? 'Actualizar entrega' : 'Nueva entrega';

  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');
  select?.focus();
}

export function closeEntregaModal() {
  const bd = entregaModalEl();
  if (!bd) return;
  bd.classList.remove('open');
  bd.setAttribute('aria-hidden', 'true');
  const form = document.getElementById('entrega-form');
  if (form) form._entregaOnConfirm = null;
}

/** @returns {'GUARDIA'|'HANDOFF'} */
export function loadGuardiaGridViewContext() {
  try {
    const mode = String(localStorage.getItem(GUARDIA_GRID_MODE_KEY) || 'censo').toLowerCase();
    return mode === 'entrega' ? 'HANDOFF' : 'GUARDIA';
  } catch {
    return 'GUARDIA';
  }
}

/** @param {'censo'|'entrega'} mode */
export function saveGuardiaGridMode(mode) {
  try {
    localStorage.setItem(GUARDIA_GRID_MODE_KEY, mode === 'entrega' ? 'entrega' : 'censo');
  } catch {
    /* ignore quota */
  }
}
