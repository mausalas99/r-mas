import { buildCutoverSnapshot, loadCutoverSnapshot, saveCutoverSnapshot } from './cutover-snapshot.mjs';
import { getCutoverFlag, is79CutoverVersion, isCutoverDone, setCutoverFlag } from './cutover-flags.mjs';

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

/**
 * Crash-safe: if snapshot already exists and pending, skip re-wipe.
 * Otherwise export → snapshot → wipe users → pending.
 * @param {{ getPatients?: () => object[], api?: object }} [deps]
 * @returns {Promise<{ ran: boolean, reason?: string, snapshot?: object }>}
 */
export async function ensure79CutoverSnapshotAndWipe(deps = {}) {
  const early = earlyCutoverExit();
  if (early) return early;

  const api = deps.api || dbApi();
  const apiErr = validateWipeApi(api);
  if (apiErr) return apiErr;

  const ops = await exportClinicalOps(api);
  if (ops.error) return ops.error;

  const patients = await loadPatientsForSnapshot(deps);
  const snapshot = buildCutoverSnapshot({ ops: ops.value, patients });
  saveCutoverSnapshot(snapshot);
  setCutoverFlag('pending');

  const wipeErr = await runCutoverWipe(api, snapshot);
  if (wipeErr) return wipeErr;

  await refreshRuntimeAfterWipe();
  return { ran: true, snapshot };
}

function earlyCutoverExit() {
  if (isCutoverDone()) return { ran: false, reason: 'done' };
  if (!is79CutoverVersion()) return { ran: false, reason: 'version' };
  const existing = loadCutoverSnapshot();
  if (existing && getCutoverFlag() === 'pending') {
    return { ran: false, reason: 'already_pending', snapshot: existing };
  }
  return null;
}

function validateWipeApi(api) {
  if (!api || typeof api.dbClinicalOpsExport !== 'function') {
    return { ran: false, reason: 'no_api' };
  }
  if (typeof api.dbClinical79CutoverWipe !== 'function') {
    return { ran: false, reason: 'no_wipe_api' };
  }
  return null;
}

async function exportClinicalOps(api) {
  try {
    const res = await api.dbClinicalOpsExport();
    const value = res?.ok !== false ? res?.snapshot || res : null;
    return { value };
  } catch (err) {
    console.warn('[R+] 7.9 cutover export failed', err);
    return { error: { ran: false, reason: 'export_failed' } };
  }
}

async function loadPatientsForSnapshot(deps) {
  try {
    if (typeof deps.getPatients === 'function') return deps.getPatients() || [];
    const appState = await import('../../app-state.mjs');
    return Array.isArray(appState.patients) ? appState.patients : [];
  } catch {
    return [];
  }
}

async function runCutoverWipe(api, snapshot) {
  try {
    const wipeRes = await api.dbClinical79CutoverWipe();
    if (wipeRes?.ok === false) {
      console.warn('[R+] 7.9 cutover wipe failed', wipeRes);
      return { ran: false, reason: 'wipe_failed', snapshot };
    }
    return null;
  } catch (err) {
    console.warn('[R+] 7.9 cutover wipe threw', err);
    return { ran: false, reason: 'wipe_threw', snapshot };
  }
}

async function refreshRuntimeAfterWipe() {
  try {
    const runtime = await import('../../clinical-access-runtime.mjs');
    if (typeof runtime.initClinicalAccessRuntime !== 'function') return;
    const settingsMod = await import('../../clinical-settings.mjs');
    const settings = settingsMod.readRpcSettings();
    const clientId = settingsMod.resolveClinicalClientId(settings);
    await runtime.initClinicalAccessRuntime(settings, clientId);
  } catch {
    /* refresh optional */
  }
}
