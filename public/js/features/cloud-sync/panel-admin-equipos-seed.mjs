import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import {
  AGOSTO_2026_TEAMS,
  agostoTeamCreatePayload,
  planAgosto2026TeamSeed,
} from '../../../../lib/clinical-rotation/agosto-2026-teams.mjs';
import { publishClinicalTeamsAfterChange } from '../clinical-teams/teams-guardia-bridge.mjs';
import { confirmAction } from './panel-admin-helpers.mjs';
import { loadAdminEquipos } from './panel-admin-equipos-data.mjs';

/** @returns {import('../../preload.js').ElectronAPI | null} */
function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/**
 * @param {import('../../preload.js').ElectronAPI} api
 * @param {object[]} renamePlan
 * @param {string} createdBy
 * @param {Set<string>} salas
 */
async function applyAgosto2026Renames(api, renamePlan, createdBy, salas) {
  let renamed = 0;
  for (const item of renamePlan) {
    if (!item.teamId || typeof api.dbClinicalTeamsUpdate !== 'function') continue;
    const res = await api.dbClinicalTeamsUpdate({
      teamId: item.teamId,
      name: item.spec.name,
      callerUserId: createdBy,
    });
    if (res?.ok === false) {
      return { ok: false, error: res?.error || 'No se pudo renombrar ' + item.fromName };
    }
    renamed += 1;
    salas.add(item.spec.sala);
  }
  return { ok: true, renamed };
}

/**
 * @param {import('../../preload.js').ElectronAPI} api
 * @param {object[]} createPlan
 * @param {string} createdBy
 * @param {Set<string>} salas
 */
async function applyAgosto2026Creates(api, createPlan, createdBy, salas) {
  let created = 0;
  for (const item of createPlan) {
    const payload = agostoTeamCreatePayload(item.spec, createdBy);
    const res = await api.dbClinicalTeamsCreate(payload);
    if (!res || res.ok === false) {
      return { ok: false, error: res?.error || 'No se pudo crear ' + payload.name };
    }
    created += 1;
    salas.add(item.spec.sala);
  }
  return { ok: true, created };
}

/**
 * @param {HTMLElement} root
 * @param {() => ReturnType<import('./api-client.mjs').createCloudSyncApi>} getApi
 * @param {(msg: string, kind?: string) => void} toast
 */
export async function handleSeedAgosto2026Equipos(root, getApi, toast) {
  const api = dbApi();
  if (!api || typeof api.dbClinicalTeamsCreate !== 'function') {
    toast('Requiere R+ de escritorio con base clínica desbloqueada.', 'error');
    return;
  }

  const listRes = await api.dbClinicalTeamsList();
  const existing = listRes?.ok && Array.isArray(listRes.teams) ? listRes.teams : [];
  const plan = planAgosto2026TeamSeed(existing, AGOSTO_2026_TEAMS);
  const pending = plan.create.length + plan.rename.length;
  if (!pending) {
    toast('Los 32 equipos de agosto 2026 ya están en la base.', 'info');
    return;
  }

  const ok = confirmAction(
    'Crear equipos agosto 2026\n\n' +
      'Se crearán ' +
      plan.create.length +
      ' equipos y se renombrarán ' +
      plan.rename.length +
      ' (mismo ciclo). Saltados: ' +
      plan.skip.length +
      '.\n\nSin UCIA / POSQX / Infecto. ¿Continuar?'
  );
  if (!ok) return;

  const createdBy = String(clinicalSessionContext.user?.user_id || '');
  /** @type {Set<string>} */
  const salas = new Set();

  const renameResult = await applyAgosto2026Renames(api, plan.rename, createdBy, salas);
  if (!renameResult.ok) {
    toast(renameResult.error || 'No se pudo renombrar.', 'error');
    return;
  }

  const createResult = await applyAgosto2026Creates(api, plan.create, createdBy, salas);
  if (!createResult.ok) {
    toast(createResult.error || 'No se pudo crear.', 'error');
    return;
  }

  for (const sala of salas) {
    await publishClinicalTeamsAfterChange({ sala });
  }

  toast(
    'Agosto 2026: ' +
      createResult.created +
      ' creados, ' +
      renameResult.renamed +
      ' renombrados, ' +
      plan.skip.length +
      ' ya ok.',
    'success'
  );
  void loadAdminEquipos(root, getApi);
}
