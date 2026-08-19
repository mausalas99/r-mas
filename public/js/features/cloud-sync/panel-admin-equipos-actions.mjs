import { resolveMembershipCycleForUser } from '../../clinico-access.mjs';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { getCycleLetterOptionsForRank } from '../../clinico-access.mjs';
import { publishClinicalTeamsAfterChange } from '../clinical-teams/teams-guardia-bridge.mjs';
import { confirmAction } from './panel-admin-helpers.mjs';
import { renderEquiposAssignTeamOptionsHtml, cycleOptionsForTeam } from './panel-admin-equipos-html-fields.mjs';
import {
  applyEquiposFiltersFromToolbar,
  loadAdminEquipos,
} from './panel-admin-equipos-data.mjs';
import { handleSeedAgosto2026Equipos } from './panel-admin-equipos-seed.mjs';
import {
  handleCloudEquiposBulkPurge,
  handleCloudEquiposBulkSave,
  purgeEquiposRowTarget,
} from './panel-admin-equipos-bulk.mjs';
import {
  equiposDbApi,
  persistEquiposRowDraft,
  readEquiposRowDraft,
  readEquiposRowRank,
  readEquiposRowSala,
} from './panel-admin-equipos-row-persist.mjs';
import {
  handleEquiposPanelChange,
  handleEquiposPanelLoaded,
} from './panel-admin-equipos-wiring.mjs';

export { readEquiposRowRank };

/**
 * Sala that scopes the Equipo dropdown: row Sala first, else toolbar Sala.
 * @param {Element | null | undefined} row
 * @param {HTMLElement | null | undefined} root
 */
export function resolveEquiposTeamSalaScope(row, root) {
  const rowSala = readEquiposRowSala(row);
  if (rowSala) return rowSala;
  const toolbar = root?.querySelector?.('[data-admin-equipos-sala]');
  if (toolbar instanceof HTMLSelectElement) return String(toolbar.value || '').trim();
  return '';
}

export function syncCloudEquiposCycleSelect(teamSelect, teams, preferredCycle = '') {
  const row = teamSelect.closest('.cloud-sync-admin-equipos-row');
  const cycleSelect = row?.querySelector('.cloud-sync-admin-equipos-cycle');
  if (!(cycleSelect instanceof HTMLSelectElement)) return;

  const teamId = String(teamSelect.value || '').trim();
  if (!teamId) {
    cycleSelect.innerHTML = '<option value="">—</option>';
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

/** @param {HTMLElement} row @param {object[]} teams @param {HTMLElement | null | undefined} root */
export function syncCloudEquiposTeamSelect(row, teams, root) {
  const teamSelect = row.querySelector('.cloud-sync-admin-equipos-team');
  if (!(teamSelect instanceof HTMLSelectElement)) return;
  const prev = String(teamSelect.value || '').trim();
  const sala = resolveEquiposTeamSalaScope(row, root);
  teamSelect.innerHTML = renderEquiposAssignTeamOptionsHtml(teams, prev, sala);
  const values = new Set([...teamSelect.options].map((o) => o.value).filter(Boolean));
  teamSelect.value = prev && values.has(prev) ? prev : '';
  syncCloudEquiposCycleSelect(teamSelect, teams);
}

/** @param {HTMLElement} root @param {object[]} teams */
export function syncAllCloudEquiposTeamSelects(root, teams) {
  root.querySelectorAll('.cloud-sync-admin-equipos-row').forEach((row) => {
    if (row instanceof HTMLElement) syncCloudEquiposTeamSelect(row, teams, root);
  });
}

/** @param {HTMLElement} row @param {object[]} teams @param {HTMLElement | null | undefined} [root] */
export function initCloudEquiposRow(row, teams, root) {
  syncCloudEquiposTeamSelect(row, teams, root);
}

/** @param {ReturnType<typeof readEquiposRowDraft>} draft */
function validateEquiposAssignDraft(draft) {
  if (!draft.username || !draft.teamId) return 'Elige un equipo.';
  if (!draft.subAreaFraction) return 'Elige el ciclo del integrante.';
  return '';
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
  const draft = readEquiposRowDraft(row, teams);
  draft.teamId = '';
  draft.subAreaFraction = '';
  draft.team = null;

  const api = equiposDbApi();
  if (!api || typeof api.dbClinicalUserAdminProfile !== 'function') {
    toast('No se pudo guardar el rango (base clínica no disponible).', 'error');
    return;
  }

  btn.disabled = true;
  try {
    const res = await persistEquiposRowDraft(api, draft);
    if (!res.ok) {
      toast(res.error || 'No se guardó el rango.', 'error');
      return;
    }
    if (res.resolvedUserId) {
      row.setAttribute('data-user-id', res.resolvedUserId);
      row.setAttribute('data-user-rank', draft.rank);
    }
    const teamSelect = row.querySelector('.cloud-sync-admin-equipos-team');
    if (teamSelect instanceof HTMLSelectElement) {
      syncCloudEquiposCycleSelect(teamSelect, teams);
    }
    row.setAttribute('data-sala', draft.sala || '');
    toast(
      'Perfil actualizado' +
        (draft.sala ? ' · ' + draft.sala : '') +
        ' · ' +
        draft.rank +
        '.',
      'success'
    );
    document.dispatchEvent(new CustomEvent('rpc-clinical-teams-changed'));
    await loadAdminEquipos(root, getApi);
  } catch (err) {
    toast(err?.message || 'No se pudo guardar el perfil.', 'error');
  } finally {
    btn.disabled = false;
  }
}

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {(msg: string, kind?: string) => void} toast
 * @param {boolean} wasMember
 */
async function finishEquiposAssign(root, getApi, toast, wasMember) {
  toast(wasMember ? 'Ciclo actualizado.' : 'Integrante asignado al equipo.', 'success');
  try {
    await publishClinicalTeamsAfterChange();
  } catch {
    /* best-effort Nube/LAN */
  }
  document.dispatchEvent(
    new CustomEvent('rpc-clinical-teams-changed', {
      detail: { source: 'admin-equipos-assign' },
    })
  );
  await loadAdminEquipos(root, getApi);
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
  const draft = readEquiposRowDraft(row, teams);
  const validationError = validateEquiposAssignDraft(draft);
  if (validationError) {
    toast(validationError, 'error');
    return;
  }

  const api = equiposDbApi();
  if (!api) {
    toast('No se pudo asignar (base clínica no disponible).', 'error');
    return;
  }

  const wasMember = Boolean(
    draft.team?.members?.some((m) => String(m.user_id || '') === draft.userId)
  );

  btn.disabled = true;
  try {
    const res = await persistEquiposRowDraft(api, draft);
    if (!res.ok) {
      toast(res.error || 'No se asignó al equipo.', 'error');
      return;
    }
    if (res.resolvedUserId) row.setAttribute('data-user-id', res.resolvedUserId);
    if (res.warnings?.[0]) toast(String(res.warnings[0]), 'warn');
    await finishEquiposAssign(root, getApi, toast, wasMember);
  } catch (err) {
    toast(err?.message || 'No se pudo asignar.', 'error');
  } finally {
    btn.disabled = false;
  }
}

/**
 * Build confirm copy for Equipos Quitar (clinical and/or Nube account).
 * @param {string} handle
 * @param {{ hasCloud: boolean, hasLocal: boolean }} flags
 */
export function equiposPurgeConfirmMessage(handle, flags) {
  const at = '@' + String(handle || '').trim();
  if (flags.hasCloud && !flags.hasLocal) {
    return (
      '¿Eliminar a ' +
      at +
      ' de la nube?\n\nEs una cuenta Nube sin perfil clínico local (p. ej. @local_…). Desaparece del listado Equipos.'
    );
  }
  if (flags.hasCloud && flags.hasLocal) {
    return (
      '¿Quitar a ' +
      at +
      ' de la nube y de la base clínica en esta Mac?\n\nSe elimina la cuenta Nube y el perfil clínico / equipo.'
    );
  }
  return (
    '¿Quitar a ' +
    at +
    ' del equipo y de la base clínica en esta Mac?\n\nSe publicará a la sala Nube (clinicalOps). No hay cuenta Nube vinculada.'
  );
}

/** @param {{ cloudDeleted?: boolean, localDeleted?: boolean }} res @param {boolean} hasCloud @param {boolean} hasLocal */
function equiposPurgeSuccessMessage(res, hasCloud, hasLocal) {
  if (hasCloud && hasLocal) return 'Usuario eliminado de la nube y de la base clínica.';
  if (hasCloud) return 'Cuenta Nube eliminada.';
  return 'Usuario quitado del equipo y de la base clínica.';
}

/**
 * @param {{ ok: boolean, error?: string, cloudDeleted?: boolean }} res
 * @param {(msg: string, kind?: string) => void} toast
 */
function toastEquiposPurgeFailure(res, toast) {
  if (res.error === 'no_db' || res.error === 'no_db_after_cloud') {
    toast(
      res.cloudDeleted
        ? 'Cuenta Nube eliminada. Abre R+ de escritorio para quitar el perfil clínico local.'
        : 'Quitar requiere R+ de escritorio con base clínica desbloqueada.',
      res.cloudDeleted ? 'warn' : 'error'
    );
    return;
  }
  toast(
    res.cloudDeleted
      ? 'Cuenta Nube eliminada, pero no se pudo quitar el perfil clínico: ' +
          String(res.error || 'error')
      : res.error || 'No se pudo quitar el usuario.',
    res.cloudDeleted ? 'warn' : 'error'
  );
}

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {{ hasCloud: boolean, hasLocal: boolean }} flags
 * @param {{ localDeleted?: boolean }} res
 * @param {(msg: string, kind?: string) => void} toast
 */
async function finishEquiposPurgeSuccess(root, getApi, flags, res, toast) {
  if (res.localDeleted) {
    try {
      await publishClinicalTeamsAfterChange({ sala: clinicalSessionContext.user?.sala });
    } catch {
      /* push best-effort */
    }
  }
  document.dispatchEvent(
    new CustomEvent('rpc-clinical-teams-changed', {
      detail: { source: 'admin-equipos-purge' },
    })
  );
  toast(equiposPurgeSuccessMessage(res, flags.hasCloud, flags.hasLocal), 'success');
  await loadAdminEquipos(root, getApi);
}

/** @param {HTMLButtonElement} btn */
function readEquiposPurgeBtnTarget(btn) {
  return {
    userId: String(btn.getAttribute('data-user-id') || '').trim(),
    cloudId: String(btn.getAttribute('data-cloud-id') || '').trim(),
    handle: String(btn.getAttribute('data-cloud-username') || '').trim(),
  };
}

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {string} callerUserId
 * @param {{ userId: string, cloudId: string, handle: string }} target
 * @param {{ hasCloud: boolean, hasLocal: boolean }} flags
 * @param {(msg: string, kind?: string) => void} toast
 */
async function executeEquiposPurge(root, getApi, callerUserId, target, flags, toast) {
  const res = await purgeEquiposRowTarget(target, getApi, callerUserId);
  if (!res.ok) {
    toastEquiposPurgeFailure(res, toast);
    if (res.cloudDeleted) await loadAdminEquipos(root, getApi);
    return;
  }
  await finishEquiposPurgeSuccess(root, getApi, flags, res, toast);
}

/**
 * @param {HTMLElement} root
 * @param {HTMLButtonElement} btn
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {(msg: string, kind?: string) => void} toast
 */
export async function handleCloudEquiposPurgeUser(root, btn, getApi, toast) {
  const target = readEquiposPurgeBtnTarget(btn);
  if (!target.userId && !target.cloudId) {
    toast('No hay cuenta Nube ni perfil clínico para quitar.', 'error');
    return;
  }

  const callerUserId = String(clinicalSessionContext.user?.user_id || '');
  if (callerUserId && target.userId && target.userId === callerUserId) {
    toast('No puedes eliminarte a ti mismo.', 'error');
    return;
  }

  const flags = { hasCloud: Boolean(target.cloudId), hasLocal: Boolean(target.userId) };
  if (!(await confirmAction(equiposPurgeConfirmMessage(target.handle, flags)))) return;

  btn.disabled = true;
  try {
    await executeEquiposPurge(root, getApi, callerUserId, target, flags, toast);
  } catch (err) {
    toast(err?.data?.message || err?.message || 'No se pudo quitar.', 'error');
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

  const panelCtx = {
    get root() {
      return root;
    },
    get teamsCache() {
      return teamsCache;
    },
    applyFilters: () => applyEquiposFiltersFromToolbar(root),
    syncCycle: (teamSelect) => syncCloudEquiposCycleSelect(teamSelect, teamsCache),
    syncTeamRow: (row) => syncCloudEquiposTeamSelect(row, teamsCache, root),
    syncAllTeams: () => syncAllCloudEquiposTeamSelects(root, teamsCache),
    readRowSala: (row) => readEquiposRowSala(row),
    readRowRank: (row) => readEquiposRowRank(row),
    initRow: (row) => initCloudEquiposRow(row, teamsCache, root),
  };

  root.addEventListener('cloud-admin-equipos-loaded', function (ev) {
    const detail = ev.detail || {};
    teamsCache = Array.isArray(detail.teams) ? detail.teams : [];
    handleEquiposPanelLoaded(root, panelCtx);
  });

  root.addEventListener('change', (ev) => handleEquiposPanelChange(ev, panelCtx));

  root.addEventListener('input', function (ev) {
    const search = ev.target instanceof Element ? ev.target.closest('[data-admin-equipos-search]') : null;
    if (search instanceof HTMLInputElement) applyEquiposFiltersFromToolbar(root);
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
    handleBulkSave() {
      return handleCloudEquiposBulkSave(root, teamsCache, deps.getApi, deps.toast);
    },
    handleBulkPurge() {
      return handleCloudEquiposBulkPurge(root, deps.getApi, deps.toast);
    },
    seedAgosto2026() {
      return handleSeedAgosto2026Equipos(root, deps.getApi, deps.toast);
    },
    refresh() {
      return loadAdminEquipos(root, deps.getApi);
    },
  };
}