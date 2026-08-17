import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { publishClinicalTeamsAfterChange } from '../clinical-teams/teams-guardia-bridge.mjs';
import { confirmAction } from './panel-admin-helpers.mjs';
import { loadAdminEquipos } from './panel-admin-equipos-data.mjs';
import {
  equiposDbApi,
  persistEquiposRowDraft,
  readEquiposRowDraft,
} from './panel-admin-equipos-row-persist.mjs';
import { purgeEquiposRowTarget } from './panel-admin-equipos-purge.mjs';

/** @param {HTMLElement} row */
function rowCheckbox(row) {
  return row.querySelector('[data-admin-equipos-select]');
}

/** @param {unknown} el */
function isChecked(el) {
  return !!(el && typeof el === 'object' && /** @type {{ checked?: unknown }} */ (el).checked === true);
}

/** @param {unknown} btn @param {boolean} disabled */
function setBulkButtonDisabled(btn, disabled) {
  if (btn && typeof btn === 'object' && 'disabled' in btn) {
    /** @type {{ disabled: boolean }} */ (btn).disabled = disabled;
  }
}

/** @param {HTMLElement} root */
export function listVisibleEquiposRows(root) {
  const list = root.querySelector('[data-admin-equipos-list]');
  if (!list) return [];
  return [...list.querySelectorAll('.cloud-sync-admin-equipos-row')].filter(
    (row) => row instanceof HTMLElement && !row.hidden
  );
}

/** @param {HTMLElement} root */
export function listSelectedEquiposRows(root) {
  const list = root.querySelector('[data-admin-equipos-list]');
  if (!list) return [];
  return [...list.querySelectorAll('.cloud-sync-admin-equipos-row')].filter(
    (row) => row instanceof HTMLElement && isChecked(rowCheckbox(row))
  );
}

/** @param {HTMLElement} root @param {boolean} checked */
export function setSelectAllVisibleEquipos(root, checked) {
  for (const row of listVisibleEquiposRows(root)) {
    const cb = rowCheckbox(row);
    if (cb && typeof cb === 'object' && 'checked' in cb) {
      /** @type {{ checked: boolean }} */ (cb).checked = checked;
    }
  }
  const master = root.querySelector('[data-admin-equipos-select-all]');
  if (master && typeof master === 'object' && 'checked' in master) {
    /** @type {{ checked: boolean }} */ (master).checked = checked;
  }
}

/** @param {ReturnType<typeof readEquiposRowDraft>[]} drafts */
function validateBulkSaveDrafts(drafts) {
  const withTeam = drafts.filter((d) => d.teamId);
  const missingCycle = withTeam.filter((d) => !d.subAreaFraction);
  if (!missingCycle.length) return { ok: true };
  return { ok: false, error: 'Falta el ciclo en ' + missingCycle.length + ' seleccionado(s).' };
}

/**
 * @param {ReturnType<typeof readEquiposRowDraft>[]} drafts
 * @param {ReturnType<typeof equiposDbApi>} api
 */
async function persistBulkEquiposDrafts(drafts, api) {
  let saved = 0;
  let assigned = 0;
  /** @type {string[]} */
  const warnings = [];

  for (const draft of drafts) {
    const res = await persistEquiposRowDraft(api, draft);
    if (!res.ok) return { ok: false, error: res.error || 'Error al guardar.' };
    if (draft.row && res.resolvedUserId) {
      draft.row.setAttribute('data-user-id', res.resolvedUserId);
      draft.row.setAttribute('data-user-rank', draft.rank);
    }
    saved += 1;
    if (res.assigned) assigned += 1;
    if (res.warnings?.[0]) warnings.push(String(res.warnings[0]));
  }
  return { ok: true, saved, assigned, warnings };
}

/**
 * Save rank (+ team/cycle when set) for every checked visible row — one reload at the end.
 * @param {HTMLElement} root
 * @param {object[]} teams
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {(msg: string, kind?: string) => void} toast
 */
export async function handleCloudEquiposBulkSave(root, teams, getApi, toast) {
  const selected = listSelectedEquiposRows(root);
  if (!selected.length) {
    toast('Marca uno o más usuarios y elige equipo/ciclo; luego Guardar seleccionados.', 'info');
    return;
  }

  const api = equiposDbApi();
  if (!api) {
    toast('Requiere R+ de escritorio con base clínica desbloqueada.', 'error');
    return;
  }

  const drafts = selected.map((row) => readEquiposRowDraft(row, teams));
  const validation = validateBulkSaveDrafts(drafts);
  if (!validation.ok) {
    toast(validation.error || 'Error al guardar.', 'error');
    return;
  }

  const btn = root.querySelector('[data-admin-action="save-equipos-bulk"]');
  setBulkButtonDisabled(btn, true);

  try {
    const result = await persistBulkEquiposDrafts(drafts, api);
    if (!result.ok) {
      toast(result.error || 'Error al guardar.', 'error');
      return;
    }
    for (const warning of result.warnings || []) toast(warning, 'warn');

    // Push to the sala(s) just assigned, not only the admin's own teams —
    // otherwise a rotation change never reaches the target sala's room.
    const changedSalas = [...new Set(drafts.map((d) => d.sala).filter(Boolean))];
    try {
      if (changedSalas.length) {
        for (const sala of changedSalas) await publishClinicalTeamsAfterChange({ sala });
      } else {
        await publishClinicalTeamsAfterChange();
      }
    } catch {
      /* best-effort */
    }

    document.dispatchEvent(
      new CustomEvent('rpc-clinical-teams-changed', {
        detail: { source: 'admin-equipos-bulk', sala: changedSalas[0] },
      })
    );
    toast(
      'Guardado: ' +
        result.saved +
        ' usuario(s)' +
        (result.assigned ? ', ' + result.assigned + ' asignado(s) a equipo' : '') +
        '.',
      'success'
    );
    await loadAdminEquipos(root, getApi);
  } catch (err) {
    toast(err?.message || 'No se pudo guardar en masa.', 'error');
  } finally {
    setBulkButtonDisabled(btn, false);
  }
}

/**
 * @param {Element | null | undefined} row
 * @returns {{ userId: string, cloudId: string, handle: string }}
 */
export function readEquiposRowPurgeTarget(row) {
  return {
    userId: String(row?.getAttribute?.('data-user-id') || '').trim(),
    cloudId: String(row?.getAttribute?.('data-cloud-id') || '').trim(),
    handle: String(row?.getAttribute?.('data-cloud-username') || '').trim(),
  };
}

export { purgeEquiposRowTarget } from './panel-admin-equipos-purge.mjs';

/** @param {number} count @param {{ cloud: number, local: number }} stats */
export function equiposBulkPurgeConfirmMessage(count, stats) {
  const n = Math.max(0, Number(count) || 0);
  const cloud = Math.max(0, Number(stats?.cloud) || 0);
  const local = Math.max(0, Number(stats?.local) || 0);
  return (
    '¿Quitar ' +
    n +
    ' usuario(s) seleccionado(s)?\n\n' +
    (cloud ? cloud + ' con cuenta Nube. ' : '') +
    (local ? local + ' con perfil clínico. ' : '') +
    '\nSe eliminan de la nube (si aplica) y de la base clínica local. No puedes eliminarte a ti mismo.'
  );
}

/**
 * @param {{ userId: string, cloudId: string, handle: string }[]} targets
 * @param {string} callerUserId
 */
function filterActionablePurgeTargets(targets, callerUserId) {
  return targets.filter((t) => !(callerUserId && t.userId && t.userId === callerUserId));
}

/**
 * @param {{ userId: string, cloudId: string, handle: string }[]} actionable
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {string} callerUserId
 */
async function runBulkEquiposPurge(actionable, getApi, callerUserId) {
  let removed = 0;
  let failed = 0;
  let skippedSelf = 0;

  for (const target of actionable) {
    try {
      const res = await purgeEquiposRowTarget(target, getApi, callerUserId);
      if (res.skipped && res.error === 'self') {
        skippedSelf += 1;
        continue;
      }
      if (res.ok) removed += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { removed, failed, skippedSelf };
}

/**
 * @param {number} removed
 * @param {number} failed
 * @param {number} skippedSelf
 * @param {(msg: string, kind?: string) => void} toast
 */
function toastBulkPurgeSummary(removed, failed, skippedSelf, toast) {
  const parts = ['Quitados: ' + removed];
  if (failed) parts.push('fallaron: ' + failed);
  if (skippedSelf) parts.push('omitidos (cuenta actual): ' + skippedSelf);
  toast(parts.join(' · ') + '.', removed ? 'success' : 'error');
}

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {number} removed
 */
async function finalizeBulkEquiposPurge(root, getApi, removed) {
  if (!removed) {
    await loadAdminEquipos(root, getApi);
    return;
  }
  try {
    await publishClinicalTeamsAfterChange({ sala: clinicalSessionContext.user?.sala });
  } catch {
    /* best-effort */
  }
  document.dispatchEvent(
    new CustomEvent('rpc-clinical-teams-changed', {
      detail: { source: 'admin-equipos-bulk-purge' },
    })
  );
  await loadAdminEquipos(root, getApi);
}

/**
 * Bulk Quitar for checked Equipos rows (Nube + clinical).
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {(msg: string, kind?: string) => void} toast
 */
export async function handleCloudEquiposBulkPurge(root, getApi, toast) {
  const selected = listSelectedEquiposRows(root);
  const targets = selected.map((row) => readEquiposRowPurgeTarget(row)).filter((t) => t.userId || t.cloudId);
  if (!targets.length) {
    toast('Marca uno o más usuarios y usa Quitar seleccionados.', 'info');
    return;
  }

  const callerUserId = String(clinicalSessionContext.user?.user_id || '');
  const actionable = filterActionablePurgeTargets(targets, callerUserId);
  if (!actionable.length) {
    toast('No puedes eliminarte a ti mismo.', 'error');
    return;
  }

  const stats = {
    cloud: actionable.filter((t) => t.cloudId).length,
    local: actionable.filter((t) => t.userId).length,
  };
  if (!confirmAction(equiposBulkPurgeConfirmMessage(actionable.length, stats))) return;

  const btn = root.querySelector('[data-admin-action="purge-equipos-bulk"]');
  setBulkButtonDisabled(btn, true);

  try {
    const { removed, failed, skippedSelf } = await runBulkEquiposPurge(
      actionable,
      getApi,
      callerUserId
    );
    await finalizeBulkEquiposPurge(root, getApi, removed);
    toastBulkPurgeSummary(removed, failed, skippedSelf, toast);
  } catch (err) {
    toast(err?.data?.message || err?.message || 'No se pudo quitar en masa.', 'error');
  } finally {
    setBulkButtonDisabled(btn, false);
  }
}
