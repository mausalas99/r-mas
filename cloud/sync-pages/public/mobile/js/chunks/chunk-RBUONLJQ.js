import {
  CLINICAL_LS_KEYS,
  isDbMode
} from "/mobile/js/chunks/chunk-7CF6AX3C.js";

// public/js/features/db-unlock-migration.mjs
function needsPassphraseConfirm(status, probe) {
  if (!status || typeof status !== "object") return true;
  if (status.dbFileExists && status.hasKdfSalt) return false;
  if (status.migrationPending && !status.dbFileExists) return true;
  if (probe && probe.needed && !status.dbFileExists) return true;
  if (status.dbFileExists === false) return true;
  return false;
}
function collectClinicalLsSnapshot() {
  var snapshot = {};
  if (typeof localStorage === "undefined") return snapshot;
  for (var i = 0; i < CLINICAL_LS_KEYS.length; i++) {
    var key = CLINICAL_LS_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(localStorage, key)) continue;
    var raw = localStorage.getItem(key);
    if (raw != null) snapshot[key] = raw;
  }
  return snapshot;
}
function clearMigratedLocalStorageKeys(keys) {
  if (!keys || !keys.length || typeof localStorage === "undefined") return;
  for (var i = 0; i < keys.length; i++) {
    try {
      localStorage.removeItem(keys[i]);
    } catch (_e) {
      void _e;
    }
  }
}
async function runMigrationProbe(electron) {
  if (!electron || typeof electron.dbMigrationProbe !== "function") {
    return { needed: false, hasHostJson: false };
  }
  var lsSnapshot = collectClinicalLsSnapshot();
  try {
    var res = await electron.dbMigrationProbe({ lsSnapshot });
    if (res && res.ok !== false) {
      return { needed: !!res.needed, hasHostJson: !!res.hasHostJson };
    }
  } catch (_e) {
    void _e;
  }
  return { needed: false, hasHostJson: false };
}
function migrationUiPending(status, probe) {
  return !!(status && status.migrationPending) || !!(probe && probe.needed);
}

// public/js/features/db-unlock-state.mjs
var dbUnlockState = {
  unlockWaitResolve: null,
  lastMigrationProbe: null,
  lastNeedsConfirm: true,
  pendingUnlockCompletion: null
};
function electronApi() {
  return typeof window !== "undefined" ? window.electronAPI : null;
}

// public/js/features/db-unlock-completion.mjs
async function hydrateAppStateFromDb() {
  try {
    var appState = await import("/mobile/js/chunks/app-state-BWHOWEEK.js");
    if (appState && typeof appState.bootHydrateFromDb === "function") {
      await appState.bootHydrateFromDb();
    }
  } catch (err) {
    console.warn("[R+] DB hydrate after unlock:", err && err.message);
  }
}
async function initClinicalRuntimeAfterUnlock() {
  try {
    var settingsMod = await import("/mobile/js/chunks/clinical-settings-7XQJIPLW.js");
    var runtime = await import("/mobile/js/chunks/clinical-access-runtime-OFZ4WTIT.js");
    var settings = settingsMod.readRpcSettings();
    var clientId = settingsMod.resolveClinicalClientId(settings);
    if (runtime && typeof runtime.initClinicalAccessRuntime === "function") {
      await runtime.initClinicalAccessRuntime(settings, clientId);
    }
  } catch (err) {
    console.warn("[R+] Clinical runtime after unlock:", err && err.message);
  }
}
async function refreshOnboardingAfterUnlock() {
  try {
    var onboardingMain = await import("/mobile/js/chunks/clinical-onboarding-main-TRAQBRY5.js");
    if (onboardingMain && typeof onboardingMain.refreshMainClinicalOnboardingIfNeeded === "function") {
      await onboardingMain.refreshMainClinicalOnboardingIfNeeded();
    }
  } catch {
  }
}
async function applyClinicalDbUnlockCompletion(opts) {
  var refreshOnboarding = !opts || opts.refreshOnboarding !== false;
  if (!isDbMode() || typeof window === "undefined") return;
  await hydrateAppStateFromDb();
  await initClinicalRuntimeAfterUnlock();
  var cutoverShowing = false;
  try {
    var cutover = await import("/mobile/js/chunks/cutover-gate-AWBXI3R7.js");
    if (cutover && typeof cutover.run79CutoverGate === "function") {
      cutoverShowing = !!await cutover.run79CutoverGate();
    }
  } catch (err) {
    console.warn("[R+] 7.9 cutover gate:", err && err.message);
  }
  if (refreshOnboarding && !cutoverShowing) await refreshOnboardingAfterUnlock();
}
function handleUnlockSuccess(res) {
  if (res && res.clearKeys && res.clearKeys.length) {
    clearMigratedLocalStorageKeys(res.clearKeys);
  }
  if (res && res.migrationWarning) {
    var warnMsg = "La base cifrada se cre\xF3, pero la migraci\xF3n de datos locales fall\xF3: " + res.migrationWarning;
    if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(warnMsg, "error");
    }
  }
  dbUnlockState.lastMigrationProbe = { needed: false, hasHostJson: false };
}
async function tryAutoUnlockDb(electron) {
  if (!electron || typeof electron.dbAutoUnlock !== "function") return null;
  var lsSnapshot = collectClinicalLsSnapshot();
  try {
    return await electron.dbAutoUnlock({ lsSnapshot });
  } catch {
    return null;
  }
}

export {
  needsPassphraseConfirm,
  collectClinicalLsSnapshot,
  clearMigratedLocalStorageKeys,
  runMigrationProbe,
  migrationUiPending,
  dbUnlockState,
  electronApi,
  applyClinicalDbUnlockCompletion,
  handleUnlockSuccess,
  tryAutoUnlockDb
};
//# sourceMappingURL=/js/chunks/chunk-RBUONLJQ.js.map
