import { isDbMode } from '../db-storage-bridge.mjs';
import { getBlobCache } from '../storage/storage-core.mjs';
import {
  clearMigratedLocalStorageKeys,
  collectClinicalLsSnapshot,
  sweepLegacyClinicalLocalStorage,
} from './db-unlock-migration.mjs';
import { dbUnlockState, electronApi } from './db-unlock-state.mjs';

async function hydrateAppStateFromDb() {
  try {
    var appState = await import('../app-state.mjs');
    if (appState && typeof appState.bootHydrateFromDb === 'function') {
      await appState.bootHydrateFromDb();
    }
  } catch (err) {
    console.warn('[R+] DB hydrate after unlock:', err && err.message);
  }
}

async function initClinicalRuntimeAfterUnlock() {
  try {
    var settingsMod = await import('../clinical-settings.mjs');
    var runtime = await import('../clinical-access-runtime.mjs');
    var settings = settingsMod.readRpcSettings();
    var clientId = settingsMod.resolveClinicalClientId(settings);
    if (runtime && typeof runtime.initClinicalAccessRuntime === 'function') {
      await runtime.initClinicalAccessRuntime(settings, clientId);
    }
  } catch (err) {
    console.warn('[R+] Clinical runtime after unlock:', err && err.message);
  }
}

async function refreshOnboardingAfterUnlock() {
  try {
    var onboardingMain = await import('./clinical-onboarding-main.mjs');
    if (onboardingMain && typeof onboardingMain.refreshMainClinicalOnboardingIfNeeded === 'function') {
      await onboardingMain.refreshMainClinicalOnboardingIfNeeded();
    }
  } catch {
    /* onboarding refresh optional */
  }
}

/**
 * A clinicalOps merge deferred earlier (DB locked) only gets retried from the
 * onboarding-incomplete path — an already-onboarded user unlocking normally
 * never flushes it, so a stale team roster can sit forever. Every unlock
 * retries it here too; a no-op when nothing is pending.
 */
async function flushPendingClinicalOpsAfterUnlock() {
  try {
    var opsSync = await import('../clinical-ops-sync.mjs');
    var flushed = await opsSync.flushPendingClinicalOpsSnapshot();
    if (flushed && flushed.changed && typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('rpc-clinical-ops-synced'));
    }
  } catch {
    /* flush optional */
  }
}

/**
 * Rehydrate clinical session after a late DB unlock (overlay / recovery).
 * @param {{ refreshOnboarding?: boolean }} [opts]
 */
export async function applyClinicalDbUnlockCompletion(opts) {
  var refreshOnboarding = !opts || opts.refreshOnboarding !== false;
  if (!isDbMode() || typeof window === 'undefined') return;
  await hydrateAppStateFromDb();
  await initClinicalRuntimeAfterUnlock();
  await flushPendingClinicalOpsAfterUnlock();
  if (refreshOnboarding) await refreshOnboardingAfterUnlock();
  sweepLegacyClinicalLocalStorage(getBlobCache());
  await showReleasedPatientsNotice();
}

async function showReleasedPatientsNotice() {
  try {
    var api = electronApi();
    if (!api || typeof api.dbTakeUnlockNotice !== 'function') return;
    var n = (await api.dbTakeUnlockNotice()).releasedPatients | 0;
    if (n > 0 && typeof window.showToast === 'function') {
      window.showToast(
        n === 1
          ? '1 paciente quedó sin equipo porque su equipo se archivó.'
          : n + ' pacientes quedaron sin equipo porque su equipo se archivó.',
        'info'
      );
    }
  } catch (_e) { void _e; }
}

export function handleUnlockSuccess(res) {
  if (res && res.clearKeys && res.clearKeys.length) {
    clearMigratedLocalStorageKeys(res.clearKeys);
  }
  if (res && res.migrationWarning) {
    var warnMsg =
      'La base cifrada se creó, pero la migración de datos locales falló: ' + res.migrationWarning;
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast(warnMsg, 'error');
    }
  }
  if (res && res.archivedEncryptedDb && typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(
      'Se encontró una base de datos cifrada antigua que ya no se puede abrir. R+ empezó con una base vacía. ' +
        'La copia anterior se guardó en: ' + res.archivedEncryptedDb +
        '. Si usas Nube, tus pacientes vuelven al sincronizar.',
      'error'
    );
  }
  dbUnlockState.lastMigrationProbe = { needed: false, hasHostJson: false };
}

export async function tryAutoUnlockDb(electron) {
  if (!electron || typeof electron.dbAutoUnlock !== 'function') return null;
  var lsSnapshot = collectClinicalLsSnapshot();
  try {
    return await electron.dbAutoUnlock({ lsSnapshot: lsSnapshot });
  } catch {
    return null;
  }
}
