import { resolveMembershipCycleForUser } from '../../clinico-access.mjs';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { getCycleLetterOptionsForRank } from '../../clinico-access.mjs';
import { publishClinicalTeamsAfterChange } from '../clinical-teams/teams-guardia-bridge.mjs';
import { confirmAction } from './panel-admin-helpers.mjs';
import { cycleOptionsForTeam } from './panel-admin-equipos-html.mjs';
import { loadAdminEquipos } from './panel-admin-equipos-data.mjs';

/** @returns {import('../../preload.js').ElectronAPI | null} */
function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/**
 * @param {HTMLSelectElement} teamSelect
 * @param {object[]} teams
 * @param {string} [preferredCycle]
 */
export function syncCloudEquiposCycleSelect(teamSelect, teams, preferredCycle = '') {
  const row = teamSelect.closest('.cloud-sync-admin-equipos-row');
  const cycleSelect = row?.querySelector('.cloud-sync-admin-equipos-cycle');
  if (!(cycleSelect instanceof HTMLSelectElement)) return;

  const teamId = String(teamSelect.value || '').trim();
  if (!teamId) {
    cycleSelect.innerHTML = '<option value="">— Ciclo —</option>';
    cycleSelect.disabled = true;
    return;
  }

  const team = (teams || []).find((t) => String(t.team_id) === teamId);
  const userId = String(row?.getAttribute('data-user-id') || '').trim();
  const userRank = readEquiposRowRank(row);
  const rowPreferred = String(preferredCycle || '').trim();
  cycleSelect.innerHTML = cycleOptionsForTeam(team, userId, userRank, rowPreferred);
  cycleSelect.disabled = false;
  if (team) {
    const service = String(team.service || 'Sala');
    const letters = getCycleLetterOptionsForRank(service, userRank);
    let defaultCycle = resolveMembershipCycleForUser(team, userId, userRank);
    if (rowPreferred && letters.includes(rowPreferred)) defaultCycle = rowPreferred;
    cycleSelect.value = defaultCycle;
  }
}

/** @param {HTMLElement} row @param {object[]} teams */
export function initCloudEquiposRow(row, teams) {
  const teamSelect = row.querySelector('.cloud-sync-admin-equipos-team');
  if (teamSelect instanceof HTMLSelectElement) {
    syncCloudEquiposCycleSelect(teamSelect, teams);
  }
}

/** Read rank from row select or data attribute. */
export function readEquiposRowRank(row) {
  const rankSel = row?.querySelector('.cloud-sync-admin-equipos-rank');
  if (rankSel instanceof HTMLSelectElement) {
    return String(rankSel.value || 'R1').trim() || 'R1';
  }
  return String(row?.getAttribute('data-user-rank') || 'R1').trim() || 'R1';
}

/**
 * @param {HTMLElement} root
 * @param {HTMLButtonElement} btn
 * @param {object[]} teams
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {(msg: string, kind?: string) => void} toast
 */
export async function handleCloudEquiposSaveRank(root, btn, teams, getApi, toast) {
  const row = btn.closest('.cloud-sync-admin-equipos-row');
  if (!row) return;

  const username = String(btn.getAttribute('data-cloud-username') || '').trim();
  const displayName = String(row.getAttribute('data-cloud-display') || '').trim();
  const sala = String(row.getAttribute('data-sala') || '').trim();
  const rank = readEquiposRowRank(row);

  if (!username) {
    toast('Usuario inválido.', 'error');
    return;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalUserAdminProfile !== 'function') {
    toast('No se pudo guardar el rango (base clínica no disponible).', 'error');
    return;
  }

  btn.disabled = true;
  try {
    const callerUserId = String(clinicalSessionContext.user?.user_id || '');
    const res = await api.dbClinicalUserAdminProfile({
      callerUserId,
      username,
      displayName,
      rank,
      sala: sala || undefined,
    });
    if (!res?.ok || !res?.user?.user_id) {
      toast(res?.error || 'No se guardó el rango.', 'error');
      return;
    }
    row.setAttribute('data-user-id', String(res.user.user_id));
    row.setAttribute('data-user-rank', rank);
    const teamSelect = row.querySelector('.cloud-sync-admin-equipos-team');
    if (teamSelect instanceof HTMLSelectElement) {
      syncCloudEquiposCycleSelect(teamSelect, teams);
    }
    toast('Rango actualizado a ' + rank + '.', 'success');
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
    await loadAdminEquipos(root, getApi);
  } catch (err) {
    toast(err?.message || 'No se pudo guardar el rango.', 'error');
  } finally {
    btn.disabled = false;
  }
}

/**
 * @param {HTMLElement} root
 * @param {HTMLButtonElement} btn
 * @param {object[]} teams
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {(msg: string, kind?: string) => void} toast
 */
export async function handleCloudEquiposAssign(root, btn, teams, getApi, toast) {
  const row = btn.closest('.cloud-sync-admin-equipos-row');
  if (!row) return;

  const username = String(btn.getAttribute('data-cloud-username') || '').trim();
  const displayName = String(row.getAttribute('data-cloud-display') || '').trim();
  const teamSelect = row.querySelector('.cloud-sync-admin-equipos-team');
  const cycleSelect = row.querySelector('.cloud-sync-admin-equipos-cycle');
  const teamId =
    teamSelect instanceof HTMLSelectElement ? String(teamSelect.value || '').trim() : '';
  let subAreaFraction =
    cycleSelect instanceof HTMLSelectElement ? String(cycleSelect.value || '').trim() : '';
  const userRank = readEquiposRowRank(row);

  if (!username || !teamId) {
    toast('Elige un equipo.', 'error');
    return;
  }

  const team = (teams || []).find((t) => String(t.team_id) === teamId);
  const userId = String(row.getAttribute('data-user-id') || '').trim();
  if (!subAreaFraction && team) {
    subAreaFraction = resolveMembershipCycleForUser(team, userId, userRank);
  }
  if (!subAreaFraction) {
    toast('Elige el ciclo del integrante.', 'error');
    return;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsMemberAdd !== 'function') {
    toast('No se pudo asignar (base clínica no disponible).', 'error');
    return;
  }

  btn.disabled = true;
  try {
    let resolvedUserId = userId;
    if (typeof api.dbClinicalUserAdminProfile === 'function') {
      const callerUserId = String(clinicalSessionContext.user?.user_id || '');
      const profileRes = await api.dbClinicalUserAdminProfile({
        callerUserId,
        username,
        displayName,
        rank: userRank,
        sala: String(row.getAttribute('data-sala') || '').trim() || undefined,
      });
      if (!profileRes?.ok || !profileRes?.user?.user_id) {
        toast(profileRes?.error || 'No se pudo guardar el perfil clínico.', 'error');
        return;
      }
      resolvedUserId = String(profileRes.user.user_id);
      row.setAttribute('data-user-id', resolvedUserId);
    } else if (!resolvedUserId && typeof api.dbClinicalUserProvisionCloud === 'function') {
      const callerUserId = String(clinicalSessionContext.user?.user_id || '');
      const prov = await api.dbClinicalUserProvisionCloud({
        callerUserId,
        username,
        displayName,
        rank: userRank,
      });
      if (!prov?.ok || !prov?.user?.user_id) {
        toast(prov?.error || 'No se pudo crear el perfil clínico.', 'error');
        return;
      }
      resolvedUserId = String(prov.user.user_id);
      row.setAttribute('data-user-id', resolvedUserId);
    }

    const wasMember = Boolean(
      team?.members?.some((m) => String(m.user_id || '') === resolvedUserId)
    );

    const res = await api.dbClinicalTeamsMemberAdd({
      teamId,
      userId: resolvedUserId,
      username: resolvedUserId ? undefined : username,
      subAreaFraction,
    });
    if (!res || res.ok === false) {
      toast(res?.error || 'No se asignó al equipo.', 'error');
      return;
    }
    if (Array.isArray(res.warnings) && res.warnings[0]) {
      toast(String(res.warnings[0]), 'warn');
    }

    toast(wasMember ? 'Ciclo actualizado.' : 'Integrante asignado al equipo.', 'success');
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
    await loadAdminEquipos(root, getApi);
  } catch (err) {
    toast(err?.message || 'No se pudo asignar.', 'error');
  } finally {
    btn.disabled = false;
  }
}

/**
 * Remove clinical-only (or local) user from teams + clinical DB; publish clinicalOps.
 * @param {HTMLElement} root
 * @param {HTMLButtonElement} btn
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {(msg: string, kind?: string) => void} toast
 */
export async function handleCloudEquiposPurgeUser(root, btn, getApi, toast) {
  const userId = String(btn.getAttribute('data-user-id') || '').trim();
  const handle = String(btn.getAttribute('data-cloud-username') || '').trim();
  if (!userId) {
    toast('No hay perfil clínico local para quitar.', 'error');
    return;
  }
  const callerUserId = String(clinicalSessionContext.user?.user_id || '');
  if (callerUserId && userId === callerUserId) {
    toast('No puedes eliminarte a ti mismo.', 'error');
    return;
  }
  if (
    !confirmAction(
      '¿Quitar a @' +
        handle +
        ' del equipo y de la base clínica en esta Mac?\n\nSe publicará a la sala Nube (clinicalOps). No borra una cuenta Nube si existiera.'
    )
  ) {
    return;
  }

  const api = dbApi();
  if (!api || typeof api.dbClinicalUserDelete !== 'function') {
    toast('Quitar requiere R+ de escritorio con base clínica desbloqueada.', 'error');
    return;
  }

  btn.disabled = true;
  try {
    const res = await api.dbClinicalUserDelete({ targetUserId: userId, callerUserId });
    if (!res?.ok) {
      toast(res?.error || 'No se pudo quitar el usuario.', 'error');
      return;
    }
    try {
      await publishClinicalTeamsAfterChange({
        sala: clinicalSessionContext.user?.sala,
      });
    } catch {
      /* push best-effort */
    }
    document.dispatchEvent(
      new CustomEvent('rpc-clinical-teams-changed', {
        detail: { source: 'admin-equipos-purge' },
      })
    );
    toast('Usuario quitado del equipo y de la base clínica.', 'success');
    await loadAdminEquipos(root, getApi);
  } catch (err) {
    toast(err?.message || 'No se pudo quitar.', 'error');
  } finally {
    btn.disabled = false;
  }
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   getApi: () => ReturnType<import('./api-client.mjs').createCloudSyncApi>,
 *   toast: (msg: string, kind?: string) => void,
 * }} deps
 */
export function wireCloudEquiposPanel(root, deps) {
  /** @type {object[]} */
  let teamsCache = [];

  root.addEventListener('cloud-admin-equipos-loaded', function (ev) {
    const detail = ev.detail || {};
    teamsCache = Array.isArray(detail.teams) ? detail.teams : [];
    const list = root.querySelector('[data-admin-equipos-list]');
    list?.querySelectorAll('.cloud-sync-admin-equipos-row').forEach((row) => {
      initCloudEquiposRow(row, teamsCache);
    });
  });

  root.addEventListener('change', function (ev) {
    const sel = ev.target instanceof Element ? ev.target.closest('.cloud-sync-admin-equipos-team') : null;
    if (sel instanceof HTMLSelectElement) {
      syncCloudEquiposCycleSelect(sel, teamsCache);
    }
    const salaSel = ev.target instanceof Element ? ev.target.closest('[data-admin-equipos-sala]') : null;
    if (salaSel instanceof HTMLSelectElement) {
      void loadAdminEquipos(root, deps.getApi);
      return;
    }
    const rankSel = ev.target instanceof Element ? ev.target.closest('.cloud-sync-admin-equipos-rank') : null;
    if (rankSel instanceof HTMLSelectElement) {
      const row = rankSel.closest('.cloud-sync-admin-equipos-row');
      if (row) row.setAttribute('data-user-rank', readEquiposRowRank(row));
      const teamSelect = row?.querySelector('.cloud-sync-admin-equipos-team');
      if (teamSelect instanceof HTMLSelectElement) {
        syncCloudEquiposCycleSelect(teamSelect, teamsCache);
      }
    }
  });

  root.addEventListener('input', function (ev) {
    const search = ev.target instanceof Element ? ev.target.closest('[data-admin-equipos-search]') : null;
    if (!(search instanceof HTMLInputElement)) return;
    const list = root.querySelector('[data-admin-equipos-list]');
    const salaSel = root.querySelector('[data-admin-equipos-sala]');
    const sala = salaSel instanceof HTMLSelectElement ? salaSel.value : '';
    if (!list) return;
    const term = search.value;
    list.querySelectorAll('.cloud-sync-admin-equipos-row').forEach((row) => {
      const hay = String(row.getAttribute('data-search') || '');
      const rowSala = String(row.getAttribute('data-sala') || '').trim();
      const t = term.trim().toLowerCase().replace(/^@+/, '');
      const matchQ = !t || hay.includes(t);
      const matchSala = !sala || !rowSala || rowSala === sala;
      row.hidden = !(matchQ && matchSala);
    });
  });

  return {
    handleAssign(btn) {
      return handleCloudEquiposAssign(root, btn, teamsCache, deps.getApi, deps.toast);
    },
    handleSaveRank(btn) {
      return handleCloudEquiposSaveRank(root, btn, teamsCache, deps.getApi, deps.toast);
    },
    handlePurge(btn) {
      return handleCloudEquiposPurgeUser(root, btn, deps.getApi, deps.toast);
    },
    refresh() {
      return loadAdminEquipos(root, deps.getApi);
    },
  };
}
