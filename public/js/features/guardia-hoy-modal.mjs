/**
 * Modal — declarar guardia hoy (manual override off-cycle).
 */
import {
  clinicalSessionContext,
  fetchClinicalScopeContextFromDb,
} from '../clinical-access-runtime.mjs';
import { effectiveClinicalRank } from '../clinical-privileges.mjs';
import {
  getJoinedTeams,
  isOnCallToday,
  salaOnCallR1,
} from '../clinico-access.mjs';
import { publishClinicalTeamsToLan, toastTeamLanPublishResult } from './clinical-teams/teams-guardia-bridge.mjs';
import { syncLanHostClinicalMetaToDisk } from '../lan-host-rank-policy.mjs';

/** @param {object[]} teams @param {Array<{ team_id?: string, user_id?: string }>} salaGuardiaToday */
export function mergeSalaGuardiaTodayRows(teams, salaGuardiaToday) {
  const rows = Array.isArray(salaGuardiaToday) ? salaGuardiaToday.map((r) => ({ ...r })) : [];
  const seen = new Set(rows.map((r) => String(r.team_id || '')));
  for (const t of teams || []) {
    const tid = String(t.team_id || '');
    if (!tid || seen.has(tid)) continue;
    const uid = t?.guardia_today?.user_id;
    if (!uid) continue;
    rows.push({
      team_id: tid,
      user_id: String(uid),
      declared_at: t.guardia_today.declared_at,
    });
    seen.add(tid);
  }
  return rows;
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

function modalBackdrop() {
  return document.getElementById('guardia-hoy-modal-backdrop');
}

/** @param {object} team @param {Date} now */
function teamCycleOnCallLabel(team, now) {
  return isOnCallToday(team, 'R1', now) ? 'Turno de ciclo hoy' : 'Fuera de ciclo hoy';
}

/**
 * @param {{
 *   teams: object[],
 *   sala: string,
 *   userId: string,
 *   rank?: string,
 *   salaGuardiaToday?: object[],
 * }} ctx
 */
export function shouldPromptGuardiaHoy(ctx) {
  const sala = String(ctx.sala || '').trim();
  const userId = String(ctx.userId || '');
  if (!sala || !userId) return false;

  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const salaGuardiaToday = mergeSalaGuardiaTodayRows(teams, ctx.salaGuardiaToday);
  const now = new Date();
  const onCall = salaOnCallR1(teams, sala, now, salaGuardiaToday);
  const rank = String(ctx.rank || effectiveClinicalRank(clinicalSessionContext.user) || 'R1');

  if (onCall.length === 0) return true;

  if (rank === 'R1') {
    const joined = getJoinedTeams(teams, userId).filter((t) => String(t.sala || '') === sala);
    const isCovering = onCall.some((r) => String(r.user_id) === userId);
    const hasR1Team = joined.some((t) =>
      (t.members || []).some((m) => String(m.user_id) === userId && m.rank === 'R1')
    );
    if (hasR1Team && !isCovering) return true;
  }

  return false;
}

/**
 * @param {{
 *   teams: object[],
 *   sala: string,
 *   userId: string,
 *   rank?: string,
 *   salaGuardiaToday?: object[],
 * }} ctx
 * @returns {Promise<boolean>}
 */
export function ensureGuardiaHoyBeforeEntrega(ctx) {
  if (!shouldPromptGuardiaHoy(ctx)) return Promise.resolve(true);
  return openGuardiaHoyModal(ctx).then((res) => !!res?.proceed);
}

/**
 * @param {{
 *   teams: object[],
 *   sala: string,
 *   userId: string,
 *   rank?: string,
 *   salaGuardiaToday?: object[],
 * }} ctx
 * @returns {Promise<{ proceed: boolean, activated?: boolean }>}
 */
export function openGuardiaHoyModal(ctx) {
  const bd = modalBackdrop();
  const body = document.getElementById('guardia-hoy-modal-body');
  const form = document.getElementById('guardia-hoy-form');
  if (!bd || !body || !form) return Promise.resolve({ proceed: true });

  const sala = String(ctx.sala || '').trim();
  const userId = String(ctx.userId || '');
  const teams = Array.isArray(ctx.teams) ? ctx.teams : [];
  const rank = String(ctx.rank || effectiveClinicalRank(clinicalSessionContext.user) || 'R1');
  const now = new Date();
  const salaTeams = teams.filter((t) => String(t.sala || '') === sala);

  const rows = salaTeams
    .map((team) => {
      const r1Members = (team.members || []).filter((m) => m.rank === 'R1');
      if (!r1Members.length) return '';
      const cycleLabel = teamCycleOnCallLabel(team, now);
      const opts = r1Members
        .map((m) => {
          const label = m.clinical_name || m.username || m.user_id;
          const sel = String(m.user_id) === userId ? ' selected' : '';
          return `<option value="${String(m.user_id)}"${sel}>${label}</option>`;
        })
        .join('');
      const defaultTeam =
        rank === 'R1' && r1Members.some((m) => String(m.user_id) === userId);
      return `
        <div class="guardia-hoy-team-row" data-team-id="${String(team.team_id)}">
          <div class="guardia-hoy-team-head">
            <strong>${String(team.name || team.sub_area_fraction || 'Equipo')}</strong>
            <span class="guardia-hoy-cycle-badge">${cycleLabel}</span>
          </div>
          <label class="guardia-hoy-select-label">
            R1 de guardia
            <select class="profile-input guardia-hoy-r1-select" data-team-id="${String(team.team_id)}">
              ${opts}
            </select>
          </label>
          ${
            defaultTeam
              ? `<button type="button" class="btn-med-secondary guardia-hoy-self-btn" data-team-id="${String(
                  team.team_id
                )}">Activar guardia hoy (yo)</button>`
              : ''
          }
        </div>`;
    })
    .filter(Boolean)
    .join('');

  body.innerHTML =
    rows ||
    '<p class="guardia-hoy-empty">No hay equipos R1 en esta sala. Puedes continuar y elegir R1 en cada paciente.</p>';

  bd.classList.add('open');
  bd.setAttribute('aria-hidden', 'false');

  return new Promise((resolve) => {
    let selfBusy = false;

    const cleanup = () => {
      bd.classList.remove('open');
      bd.setAttribute('aria-hidden', 'true');
      form.removeEventListener('submit', onSubmit);
      document.getElementById('guardia-hoy-btn-skip')?.removeEventListener('click', onSkip);
      document.getElementById('guardia-hoy-btn-cancel')?.removeEventListener('click', onCancel);
      bd.removeEventListener('click', onBackdrop);
      body.querySelectorAll('.guardia-hoy-self-btn').forEach((btn) => {
        btn.replaceWith(btn.cloneNode(true));
      });
    };

    const finish = (result) => {
      cleanup();
      resolve(result);
    };

    const onSkip = () => finish({ proceed: true, activated: false });
    const onCancel = () => finish({ proceed: false });
    const onBackdrop = (ev) => {
      if (ev.target === bd) onCancel();
    };

    /**
     * @param {NodeListOf<HTMLSelectElement>|HTMLSelectElement[]} selects
     * @returns {Promise<{ ok: boolean, activated: boolean }>}
     */
    async function persistGuardiaSelections(selects) {
      const api = dbApi();
      if (!api?.dbClinicalTeamsGuardiaSet) {
        toast('Base clínica no disponible.', 'error');
        return { ok: false, activated: false };
      }

      const list = [...selects];
      if (!list.length) return { ok: true, activated: false };

      let activated = false;
      for (const sel of list) {
        const teamId = String(sel.getAttribute('data-team-id') || '');
        const pickUserId = String(sel.value || '');
        if (!teamId || !pickUserId) continue;
        const res = await api.dbClinicalTeamsGuardiaSet({ teamId, userId: pickUserId });
        if (!res?.ok) {
          toast(res?.error || 'No se guardó la guardia.', 'error');
          return { ok: false, activated: false };
        }
        activated = true;
      }

      await fetchClinicalScopeContextFromDb();
      document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
      if (activated) {
        await syncLanHostClinicalMetaToDisk();
        const lanPush = await publishClinicalTeamsToLan();
        toastTeamLanPublishResult(lanPush, 'Guardia hoy activada.');
      }
      return { ok: true, activated };
    }

    body.querySelectorAll('.guardia-hoy-self-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (selfBusy) return;
        void (async () => {
          const tid = String(btn.getAttribute('data-team-id') || '');
          const sel = body.querySelector(`select.guardia-hoy-r1-select[data-team-id="${tid}"]`);
          if (!sel) {
            toast('No se encontró el equipo.', 'error');
            return;
          }
          sel.value = userId;
          selfBusy = true;
          const prevLabel = btn.textContent;
          btn.disabled = true;
          btn.textContent = 'Activando…';
          try {
            const result = await persistGuardiaSelections([sel]);
            if (!result.ok) return;
            finish({ proceed: true, activated: result.activated });
          } finally {
            selfBusy = false;
            btn.disabled = false;
            btn.textContent = prevLabel;
          }
        })();
      });
    });

    const onSubmit = async (ev) => {
      ev.preventDefault();
      const selects = body.querySelectorAll('select.guardia-hoy-r1-select');
      if (!selects.length) {
        finish({ proceed: true, activated: false });
        return;
      }

      const result = await persistGuardiaSelections(selects);
      if (!result.ok) {
        finish({ proceed: false });
        return;
      }
      finish({ proceed: true, activated: result.activated });
    };

    form.addEventListener('submit', onSubmit);
    document.getElementById('guardia-hoy-btn-skip')?.addEventListener('click', onSkip);
    document.getElementById('guardia-hoy-btn-cancel')?.addEventListener('click', onCancel);
    bd.addEventListener('click', onBackdrop);
  });
}
