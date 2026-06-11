import {
  CLINICAL_LS_KEYS,
  isDbMode
} from "/js/chunks/chunk-CDEKFL7E.js";

// public/js/features/db-unlock.mjs
var unlockWaitResolve = null;
var lastMigrationProbe = null;
var lastNeedsConfirm = true;
var pendingUnlockCompletion = null;
function api() {
  return typeof window !== "undefined" ? window.electronAPI : null;
}
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
  }
  return { needed: false, hasHostJson: false };
}
function migrationUiPending(status, probe) {
  return !!(status && status.migrationPending) || !!(probe && probe.needed);
}
function unlockErrorMessage(res, opts) {
  opts = opts || {};
  var code = res && res.code;
  if (code === "AUTH_RATE_LIMITED") {
    return "Demasiados intentos fallidos. Espera unos minutos e int\xE9ntalo de nuevo.";
  }
  if (code === "DB_UNLOCK_METADATA_MISSING") {
    return "Faltan metadatos de cifrado en el perfil local. Contacta soporte o restaura un respaldo.";
  }
  if (code === "DB_SETUP_RESET_FAILED") {
    return "No se pudo reiniciar la base cifrada anterior (archivo en uso). Cierra R+ por completo y vuelve a abrir.";
  }
  if (code === "DB_SETUP_FAILED" || opts.setup && code === "DB_UNLOCK_FAILED") {
    var setupDetail = res && (res.cause || res.error);
    return setupDetail ? "No se pudo crear la base cifrada: " + setupDetail : "No se pudo crear la base cifrada. Cierra R+, vuelve a abrir e intenta de nuevo.";
  }
  if (code === "DB_UNLOCK_FAILED") {
    var cause = res && (res.cause || res.error || "");
    if (/file is not a database|not a database/i.test(String(cause))) {
      return "C\xF3digo de recuperaci\xF3n incorrecto.";
    }
    return "C\xF3digo de recuperaci\xF3n incorrecto.";
  }
  if (code === "DB_RECOVERY_NOT_CONFIGURED") {
    return "La recuperaci\xF3n no est\xE1 disponible para esta base de datos.";
  }
  if (code === "DB_AUTO_UNLOCK_FAILED") {
    return "No se pudo abrir la base en este equipo. Usa tu c\xF3digo de recuperaci\xF3n si lo guardaste.";
  }
  if (code === "DB_NATIVE_ABI_MISMATCH" || code === "DB_NATIVE_BINDING_FAILED") {
    if (typeof window !== "undefined" && window.electronAPI) {
      var fromStatus = opts && opts.nativeError;
      if (fromStatus) return String(fromStatus);
      return "R+ no pudo cargar SQLCipher o el cifrado (argon2) en esta instalaci\xF3n. En Ajustes \u2192 Aplicaci\xF3n usa \xABRestaurar versi\xF3n estable\xBB o \xABAbrir instalador en GitHub\xBB.";
    }
    return "El m\xF3dulo SQLCipher no coincide con esta sesi\xF3n de R+ (suele pasar despu\xE9s de npm test). En la carpeta del proyecto ejecuta: npm run rebuild:db-native \u2014 cierra R+ por completo (Cmd+Q) y vuelve a abrir con npm start.";
  }
  if (code === "DB_SCHEMA_MIGRATION_FAILED") {
    var migDetail = res && (res.cause || res.error || "");
    return "No se pudo actualizar el esquema de la base cifrada" + (migDetail ? ": " + migDetail : ".") + " Si el problema contin\xFAa, exporta un respaldo .db y contacta soporte.";
  }
  var detail = res && (res.cause || res.error || res.message);
  if (detail && /NODE_MODULE_VERSION|was compiled against a different/i.test(String(detail))) {
    return "El m\xF3dulo SQLCipher no coincide con esta versi\xF3n de Electron. En la carpeta del proyecto ejecuta: npm run rebuild:db-native \u2014 luego cierra R+ por completo y vuelve a abrirlo.";
  }
  return detail || "No se pudo desbloquear la base de datos.";
}
function toggleDbUnlockSecretField(toggleBtn) {
  if (!toggleBtn) return;
  var controlId = toggleBtn.getAttribute("aria-controls");
  var input = controlId ? document.getElementById(controlId) : null;
  if (!input) return;
  var show = input.type === "password";
  input.type = show ? "text" : "password";
  toggleBtn.setAttribute("aria-pressed", show ? "true" : "false");
  toggleBtn.textContent = show ? "Ocultar" : "Mostrar";
  toggleBtn.setAttribute("aria-label", show ? "Ocultar contrase\xF1a" : "Mostrar contrase\xF1a");
}
function wireDbUnlockSecretToggles() {
  if (typeof document === "undefined") return;
  var toggles = document.querySelectorAll("[data-db-unlock-secret-toggle]");
  for (var i = 0; i < toggles.length; i += 1) {
    var btn = toggles[i];
    if (btn.dataset.dbUnlockSecretWired === "1") continue;
    btn.dataset.dbUnlockSecretWired = "1";
    btn.addEventListener("click", function(ev) {
      toggleDbUnlockSecretField(ev.currentTarget);
    });
  }
}
function resetDbUnlockSecretFields() {
  var ids = ["rpc-db-unlock-pass", "rpc-db-unlock-confirm"];
  for (var i = 0; i < ids.length; i += 1) {
    var input = document.getElementById(ids[i]);
    if (input) input.type = "password";
  }
  var toggles = document.querySelectorAll("[data-db-unlock-secret-toggle]");
  for (var j = 0; j < toggles.length; j += 1) {
    toggles[j].setAttribute("aria-pressed", "false");
    toggles[j].textContent = "Mostrar";
    toggles[j].setAttribute("aria-label", "Mostrar contrase\xF1a");
  }
  resetDbUnlockRecoveryMode();
}
function resetDbUnlockRecoveryMode() {
  var recoveryWrap = document.getElementById("rpc-db-unlock-recovery-wrap");
  var submitBtn = document.getElementById("rpc-db-unlock-submit");
  if (recoveryWrap) recoveryWrap.style.display = "none";
  if (submitBtn) submitBtn.setAttribute("onclick", "submitDbUnlockPassphrase()");
  var recCode = document.getElementById("rpc-db-unlock-recovery-code");
  if (recCode) recCode.value = "";
}
function setOverlayVisible(visible) {
  var overlay = document.getElementById("rpc-db-unlock-overlay");
  if (!overlay) return;
  overlay.style.display = visible ? "flex" : "none";
  overlay.setAttribute("aria-hidden", visible ? "false" : "true");
  if (visible) {
    document.body.classList.add("rpc-db-unlock-active");
    resetDbUnlockSecretFields();
    wireDbUnlockSecretToggles();
    var recCode = document.getElementById("rpc-db-unlock-recovery-code");
    if (recCode) {
      recCode.value = "";
      recCode.focus();
    }
  } else {
    document.body.classList.remove("rpc-db-unlock-active");
  }
}
function finishUnlockFlow(result) {
  pendingUnlockCompletion = result;
  if (result && result.recoveryCodeToShow) {
    showRecoveryCodeReveal(String(result.recoveryCodeToShow));
    return;
  }
  setOverlayVisible(false);
  if (unlockWaitResolve) {
    var done = unlockWaitResolve;
    unlockWaitResolve = null;
    done(result);
  }
  void applyClinicalDbUnlockCompletion();
}
function showRecoveryCodeReveal(code) {
  var reveal = document.getElementById("rpc-db-unlock-recovery-reveal");
  var codeEl = document.getElementById("rpc-db-unlock-recovery-reveal-code");
  var panelMain = document.getElementById("rpc-db-unlock-form-main");
  if (!reveal || !codeEl) {
    var fallback = pendingUnlockCompletion || { unlocked: true, status: {} };
    pendingUnlockCompletion = null;
    setOverlayVisible(false);
    if (unlockWaitResolve) {
      var doneMissing = unlockWaitResolve;
      unlockWaitResolve = null;
      doneMissing(fallback);
    }
    return;
  }
  codeEl.textContent = code;
  if (panelMain) panelMain.style.display = "none";
  reveal.style.display = "block";
}
function dismissRecoveryCodeReveal() {
  var reveal = document.getElementById("rpc-db-unlock-recovery-reveal");
  var panelMain = document.getElementById("rpc-db-unlock-form-main");
  if (reveal) reveal.style.display = "none";
  if (panelMain) panelMain.style.display = "";
  var result = pendingUnlockCompletion || { unlocked: true, status: {} };
  pendingUnlockCompletion = null;
  setOverlayVisible(false);
  if (unlockWaitResolve) {
    var done = unlockWaitResolve;
    unlockWaitResolve = null;
    done(result);
  }
  void applyClinicalDbUnlockCompletion();
}
function setUnlockError(msg) {
  var err = document.getElementById("rpc-db-unlock-error");
  if (!err) return;
  if (msg) {
    err.textContent = msg;
    err.style.display = "block";
  } else {
    err.textContent = "";
    err.style.display = "none";
  }
}
function configureUnlockForm(status, probe) {
  var needsConfirm = needsPassphraseConfirm(status, probe);
  lastNeedsConfirm = needsConfirm;
  var confirmWrap = document.getElementById("rpc-db-unlock-confirm-wrap");
  var confirmInput = document.getElementById("rpc-db-unlock-confirm");
  if (confirmWrap) confirmWrap.style.display = needsConfirm ? "" : "none";
  if (confirmInput) confirmInput.value = "";
  var title = document.getElementById("rpc-db-unlock-title");
  var hint = document.getElementById("rpc-db-unlock-hint");
  if (title) {
    title.textContent = needsConfirm ? "Protege tus datos cl\xEDnicos" : "Desbloquear base de datos";
  }
  if (hint) {
    if (migrationUiPending(status, probe)) {
      hint.textContent = "Hay datos locales por migrar a la base cifrada. Elige una contrase\xF1a maestra (m\xEDnimo 8 caracteres) y conf\xEDrmala.";
    } else if (needsConfirm) {
      hint.textContent = "Primera vez: crea una contrase\xF1a maestra para cifrar pacientes, notas y labs en este equipo (m\xEDnimo 8 caracteres). No es la contrase\xF1a de Mi Perfil.";
    } else {
      hint.textContent = "Ingresa la contrase\xF1a maestra que elegiste al activar la base cifrada. No es la contrase\xF1a de Mi Perfil ni el PIN de bloqueo por inactividad.";
    }
  }
  var passInput = document.getElementById("rpc-db-unlock-pass");
  var confirmInput = document.getElementById("rpc-db-unlock-confirm");
  if (passInput) {
    passInput.autocomplete = needsConfirm ? "new-password" : "current-password";
  }
  if (confirmInput) {
    confirmInput.autocomplete = "new-password";
  }
  var rate = document.getElementById("rpc-db-unlock-rate-limited");
  if (rate) rate.style.display = status && status.rateLimited ? "block" : "none";
  var submit = document.getElementById("rpc-db-unlock-submit");
  var nativeBlocked = !!(status && !isSqlcipherNativeReady(status));
  if (submit) {
    submit.disabled = !!(status && status.rateLimited) || nativeBlocked;
    submit.textContent = needsConfirm ? "Crear contrase\xF1a y continuar" : "Desbloquear";
  }
  var recoveryToggle = document.getElementById("rpc-db-unlock-recovery-toggle");
  if (recoveryToggle) recoveryToggle.style.display = needsConfirm || nativeBlocked ? "none" : "";
  if (nativeBlocked) {
    setUnlockError(
      status.nativeError || unlockErrorMessage({ code: "DB_NATIVE_ABI_MISMATCH" }, { nativeError: status.nativeError })
    );
    if (title) title.textContent = "Instalaci\xF3n incompleta";
    if (hint) {
      hint.textContent = "Esta copia de R+ no carg\xF3 los m\xF3dulos nativos necesarios. Restaura una versi\xF3n estable en Ajustes \u2192 Aplicaci\xF3n o descarga el instalador desde GitHub.";
    }
  } else {
    setUnlockError("");
  }
  wireDbUnlockSecretToggles();
  return nativeBlocked;
}
async function tryAutoUnlockDb(electron) {
  if (!electron || typeof electron.dbAutoUnlock !== "function") return null;
  var lsSnapshot = collectClinicalLsSnapshot();
  try {
    return await electron.dbAutoUnlock({ lsSnapshot });
  } catch (_e) {
    return null;
  }
}
function delayMs(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}
function getClinicalBootDelays() {
  if (typeof window !== "undefined" && window.electronAPI) {
    var flags = typeof window.electronAPI.getWindowChromeFlags === "function" ? window.electronAPI.getWindowChromeFlags() : null;
    if (flags && flags.isWindows) {
      return [0, 200, 500, 1e3, 2e3, 3500, 5e3];
    }
  }
  return [0, 120, 300, 600, 1200];
}
async function ensureClinicalDbUnlocked() {
  if (!isDbMode()) return { unlocked: true };
  var electron = api();
  if (!electron || typeof electron.dbStatus !== "function") {
    return { unlocked: false, reason: "no_api" };
  }
  var delays = getClinicalBootDelays();
  for (var i = 0; i < delays.length; i += 1) {
    if (delays[i] > 0) await delayMs(delays[i]);
    var status;
    try {
      status = await electron.dbStatus();
    } catch (_e) {
      continue;
    }
    if (status && !isSqlcipherNativeReady(status)) {
      return { unlocked: false, reason: "native_blocked", status };
    }
    if (!status || status.state === "unlocked") {
      return { unlocked: true, status: status || {} };
    }
    var autoRes = await tryAutoUnlockDb(electron);
    if (autoRes && autoRes.ok !== false && autoRes.state === "unlocked") {
      handleUnlockSuccess(autoRes);
      return { unlocked: true, status: autoRes };
    }
  }
  var final = await waitForDbUnlock();
  return {
    unlocked: !!(final && final.unlocked),
    status: final && final.status,
    reason: final && final.unlocked ? void 0 : "locked"
  };
}
function isSqlcipherNativeReady(status) {
  if (!status) return true;
  if (status.sqlcipherReady === true) return true;
  if (status.sqlcipherReady === false) return false;
  if (status.nativeReady !== false) return true;
  var failures = status.nativeFailures;
  if (!Array.isArray(failures) || !failures.length) return true;
  return !failures.some(function(f) {
    return f && f.module === "sqlcipher";
  });
}
function waitForUnlockOverlay() {
  return new Promise(function(resolve) {
    unlockWaitResolve = resolve;
  });
}
async function presentDbUnlockGate(status) {
  var electron = api();
  var probe = await runMigrationProbe(electron);
  lastMigrationProbe = probe;
  configureUnlockForm(status, probe);
  setOverlayVisible(true);
  var passInput = document.getElementById("rpc-db-unlock-pass");
  if (passInput) passInput.focus();
  return waitForUnlockOverlay();
}
async function applyClinicalDbUnlockCompletion(opts) {
  var refreshOnboarding = !opts || opts.refreshOnboarding !== false;
  if (!isDbMode() || typeof window === "undefined") return;
  try {
    var appState = await import("/js/chunks/app-state-ZNMSF3BS.js");
    if (appState && typeof appState.bootHydrateFromDb === "function") {
      await appState.bootHydrateFromDb();
    }
  } catch (err) {
    console.warn("[R+] DB hydrate after unlock:", err && err.message);
  }
  try {
    var settingsMod = await import("/js/chunks/clinical-settings-75NOHFDI.js");
    var runtime = await import("/js/chunks/clinical-access-runtime-SPIL5GQY.js");
    var settings = settingsMod.readRpcSettings();
    var clientId = settingsMod.resolveClinicalClientId(settings);
    if (runtime && typeof runtime.initClinicalAccessRuntime === "function") {
      await runtime.initClinicalAccessRuntime(settings, clientId);
    }
  } catch (err) {
    console.warn("[R+] Clinical runtime after unlock:", err && err.message);
  }
  if (refreshOnboarding) {
    try {
      var onboardingMain = await import("/js/chunks/clinical-onboarding-main-2QKKJMK5.js");
      if (onboardingMain && typeof onboardingMain.refreshMainClinicalOnboardingIfNeeded === "function") {
        await onboardingMain.refreshMainClinicalOnboardingIfNeeded();
      }
    } catch (_e) {
    }
  }
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
  lastMigrationProbe = { needed: false, hasHostJson: false };
}
async function waitForDbUnlock() {
  if (!isDbMode()) return { unlocked: true };
  var electron = api();
  if (!electron || typeof electron.dbStatus !== "function") {
    return { unlocked: true };
  }
  var status;
  try {
    status = await electron.dbStatus();
  } catch (_e) {
    return { unlocked: false };
  }
  if (!status || status.state === "unlocked") {
    return { unlocked: true, status: status || {} };
  }
  if (!isSqlcipherNativeReady(status)) {
    var nativeMsg = unlockErrorMessage(
      { code: "DB_NATIVE_ABI_MISMATCH" },
      { nativeError: status.nativeError }
    );
    if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast(nativeMsg, "error");
    }
    return { unlocked: false, status };
  }
  var autoRes = await tryAutoUnlockDb(electron);
  if (autoRes && autoRes.ok !== false && autoRes.state === "unlocked") {
    handleUnlockSuccess(autoRes);
    return { unlocked: true, status: autoRes };
  }
  if (status.dbFileExists && status.hasKdfSalt) {
    var overlayResult = await presentDbUnlockGate(status);
    if (overlayResult && overlayResult.unlocked) {
      handleUnlockSuccess(overlayResult.status || {});
      return { unlocked: true, status: overlayResult.status || status };
    }
    return { unlocked: false, status: overlayResult?.status || autoRes || status };
  }
  var errMsg = autoRes && (autoRes.cause || autoRes.error || autoRes.message) || "No se pudo abrir la base de datos cl\xEDnica.";
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(errMsg, "error");
  }
  return { unlocked: false, status: autoRes || status };
}
function toggleRecoveryMode() {
  var recoveryWrap = document.getElementById("rpc-db-unlock-recovery-wrap");
  var toggleBtn = document.getElementById("rpc-db-unlock-recovery-toggle");
  var passEl = document.getElementById("rpc-db-unlock-pass");
  var confirmWrap = document.getElementById("rpc-db-unlock-confirm-wrap");
  var rememberLabel = document.querySelector(".rpc-db-unlock-remember");
  var rememberHint = document.querySelector(".settings-acc-hint--tight");
  var submitBtn = document.getElementById("rpc-db-unlock-submit");
  var isRecovery = recoveryWrap && recoveryWrap.style.display !== "none";
  if (isRecovery) {
    if (recoveryWrap) recoveryWrap.style.display = "none";
    if (toggleBtn) toggleBtn.style.display = "";
    if (passEl) {
      passEl.style.display = "";
      passEl.parentElement.style.display = "";
    }
    if (confirmWrap) confirmWrap.style.display = lastNeedsConfirm ? "" : "none";
    if (rememberLabel) rememberLabel.style.display = lastNeedsConfirm ? "" : "";
    if (rememberHint) rememberHint.style.display = lastNeedsConfirm ? "" : "";
    if (submitBtn) {
      submitBtn.textContent = lastNeedsConfirm ? "Crear contrase\xF1a y continuar" : "Desbloquear";
      submitBtn.setAttribute("onclick", "submitDbUnlockPassphrase()");
    }
  } else {
    if (recoveryWrap) recoveryWrap.style.display = "";
    if (toggleBtn) toggleBtn.style.display = "none";
    if (passEl) {
      passEl.style.display = "none";
      passEl.parentElement.style.display = "none";
    }
    if (confirmWrap) confirmWrap.style.display = "none";
    if (rememberLabel) rememberLabel.style.display = "none";
    if (rememberHint) rememberHint.style.display = "none";
    if (submitBtn) {
      submitBtn.textContent = "Recuperar acceso";
      submitBtn.setAttribute("onclick", "submitRecoveryCode()");
    }
    var recCode = document.getElementById("rpc-db-unlock-recovery-code");
    if (recCode) recCode.focus();
  }
  setUnlockError("");
}
async function submitRecoveryCode() {
  var electron = api();
  if (!electron || typeof electron.dbUnlockRecovery !== "function") return;
  var codeEl = document.getElementById("rpc-db-unlock-recovery-code");
  var code = codeEl ? String(codeEl.value || "").trim() : "";
  if (!code) {
    setUnlockError("Ingresa el c\xF3digo de recuperaci\xF3n.");
    return;
  }
  setUnlockError("");
  var submitBtn = document.getElementById("rpc-db-unlock-submit");
  if (submitBtn) submitBtn.disabled = true;
  try {
    var res = await electron.dbUnlockRecovery({ code });
    if (!res || res.ok === false) {
      setUnlockError(unlockErrorMessage(res || {}, {}));
      if (submitBtn) submitBtn.disabled = false;
      try {
        var st2 = await electron.dbStatus();
        configureUnlockForm(st2, lastMigrationProbe);
      } catch (_e2) {
      }
      return;
    }
    finishUnlockFlow({ unlocked: true, status: res, recoveryCodeToShow: res.recoveryCodeToShow });
  } catch (err) {
    setUnlockError(err && err.message || "Error al recuperar.");
    if (submitBtn) submitBtn.disabled = false;
  }
}
async function submitDbUnlockPassphrase() {
  var electron = api();
  if (!electron || typeof electron.dbUnlock !== "function") return;
  var passEl = document.getElementById("rpc-db-unlock-pass");
  var confirmEl = document.getElementById("rpc-db-unlock-confirm");
  var rememberEl = document.getElementById("rpc-db-unlock-remember");
  var passphrase = passEl ? String(passEl.value || "") : "";
  var remember = !!(rememberEl && rememberEl.checked);
  var status = { migrationPending: false, dbFileExists: true };
  try {
    status = await electron.dbStatus();
  } catch (_e) {
  }
  var probe = lastMigrationProbe;
  if (!probe) {
    probe = await runMigrationProbe(electron);
    lastMigrationProbe = probe;
  }
  var isSetup = needsPassphraseConfirm(status, probe);
  if (isSetup) {
    var confirm = confirmEl ? String(confirmEl.value || "") : "";
    if (passphrase.length < 8) {
      setUnlockError("La contrase\xF1a debe tener al menos 8 caracteres.");
      return;
    }
    if (!confirm) {
      setUnlockError("Confirma la contrase\xF1a en el segundo campo.");
      return;
    }
    if (passphrase !== confirm) {
      setUnlockError("La confirmaci\xF3n no coincide con la contrase\xF1a.");
      return;
    }
  } else if (!passphrase) {
    setUnlockError("Ingresa la contrase\xF1a maestra.");
    return;
  }
  setUnlockError("");
  var submitBtn = document.getElementById("rpc-db-unlock-submit");
  if (submitBtn) submitBtn.disabled = true;
  try {
    var unlockPayload = { passphrase, remember, setup: isSetup };
    if (probe && probe.needed) {
      unlockPayload.lsSnapshot = collectClinicalLsSnapshot();
    }
    var res = await electron.dbUnlock(unlockPayload);
    if (!res || res.ok === false) {
      setUnlockError(unlockErrorMessage(res || {}, { setup: isSetup }));
      if (submitBtn) submitBtn.disabled = !!(status && status.rateLimited);
      try {
        var st2 = await electron.dbStatus();
        configureUnlockForm(st2, lastMigrationProbe);
      } catch (_e2) {
      }
      return;
    }
    if (res.clearKeys && res.clearKeys.length) {
      clearMigratedLocalStorageKeys(res.clearKeys);
    }
    if (res.migrationWarning) {
      var warnMsg = "La base cifrada se cre\xF3, pero la migraci\xF3n de datos locales fall\xF3: " + res.migrationWarning;
      if (typeof window !== "undefined" && typeof window.showToast === "function") {
        window.showToast(warnMsg, "error");
      } else {
        setUnlockError(warnMsg);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
    }
    lastMigrationProbe = { needed: false, hasHostJson: false };
    finishUnlockFlow({ unlocked: true, status: res, recoveryCodeToShow: res.recoveryCodeToShow });
  } catch (err) {
    setUnlockError(err && err.message || "Error al desbloquear.");
    if (submitBtn) submitBtn.disabled = false;
  }
}
function syncDbSecuritySectionUi() {
  var section = document.getElementById("settings-accordion-db-security");
  if (!section) return;
  section.style.display = "none";
}
function setChangePassError(msg) {
  var err = document.getElementById("rpc-db-change-pass-error");
  if (!err) return;
  if (msg) {
    err.textContent = msg;
    err.style.display = "block";
  } else {
    err.textContent = "";
    err.style.display = "none";
  }
}
function changePassphraseErrorMessage(res) {
  var code = res && res.code;
  if (code === "DB_PASSPHRASE_MISMATCH") {
    return "La contrase\xF1a actual no es correcta.";
  }
  if (code === "DB_PASSPHRASE_TOO_SHORT") {
    return "La contrase\xF1a nueva debe tener al menos 8 caracteres.";
  }
  if (code === "DB_PASSPHRASE_INVALID") {
    return "Completa la contrase\xF1a actual y la nueva.";
  }
  if (code === "DB_LOCKED") {
    return "La base est\xE1 bloqueada. Desbloqu\xE9ala antes de cambiar la contrase\xF1a.";
  }
  return res && (res.cause || res.error || res.message) || "No se pudo cambiar la contrase\xF1a.";
}
function openChangeMasterPasswordModal() {
}
function closeChangeMasterPasswordModal() {
  var overlay = document.getElementById("rpc-db-change-pass-overlay");
  if (!overlay) return;
  overlay.style.display = "none";
  overlay.setAttribute("aria-hidden", "true");
  setChangePassError("");
}
async function submitChangeMasterPassword() {
  var electron = api();
  if (!electron || typeof electron.dbChangePassphrase !== "function") return;
  var currentEl = document.getElementById("rpc-db-change-pass-current");
  var newEl = document.getElementById("rpc-db-change-pass-new");
  var confirmEl = document.getElementById("rpc-db-change-pass-confirm");
  var rememberEl = document.getElementById("rpc-db-change-pass-remember");
  var current = currentEl ? String(currentEl.value || "") : "";
  var next = newEl ? String(newEl.value || "") : "";
  var confirm = confirmEl ? String(confirmEl.value || "") : "";
  var remember = !!(rememberEl && rememberEl.checked);
  if (!current) {
    setChangePassError("Ingresa tu contrase\xF1a actual.");
    return;
  }
  if (next.length < 8) {
    setChangePassError("La contrase\xF1a nueva debe tener al menos 8 caracteres.");
    return;
  }
  if (!confirm) {
    setChangePassError("Confirma la contrase\xF1a nueva.");
    return;
  }
  if (next !== confirm) {
    setChangePassError("La confirmaci\xF3n no coincide con la contrase\xF1a nueva.");
    return;
  }
  if (current === next) {
    setChangePassError("La contrase\xF1a nueva debe ser distinta de la actual.");
    return;
  }
  setChangePassError("");
  var submitBtn = document.getElementById("rpc-db-change-pass-submit");
  if (submitBtn) submitBtn.disabled = true;
  try {
    var res = await electron.dbChangePassphrase({
      currentPassphrase: current,
      newPassphrase: next,
      remember
    });
    if (!res || res.ok === false) {
      setChangePassError(changePassphraseErrorMessage(res || {}));
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    closeChangeMasterPasswordModal();
    if (typeof window !== "undefined" && typeof window.showToast === "function") {
      window.showToast("Contrase\xF1a maestra actualizada", "success");
    }
  } catch (err) {
    setChangePassError(err && err.message || "No se pudo cambiar la contrase\xF1a.");
    if (submitBtn) submitBtn.disabled = false;
  }
}
function __resetDbUnlockWaitForTests() {
  unlockWaitResolve = null;
  lastMigrationProbe = null;
  setOverlayVisible(false);
}
async function retryClinicalDbUnlockForOnboarding() {
  if (!isDbMode()) return false;
  const result = await ensureClinicalDbUnlocked();
  if (!result || !result.unlocked) return false;
  await applyClinicalDbUnlockCompletion({ refreshOnboarding: true });
  return true;
}
var dbUnlockWindowHandlers = {
  dismissRecoveryCodeReveal,
  submitDbUnlockPassphrase,
  submitRecoveryCode,
  toggleRecoveryMode,
  openChangeMasterPasswordModal,
  closeChangeMasterPasswordModal,
  submitChangeMasterPassword,
  retryClinicalDbUnlockForOnboarding
};
var __test = {
  toggleDbUnlockSecretField
};

export {
  needsPassphraseConfirm,
  collectClinicalLsSnapshot,
  showRecoveryCodeReveal,
  dismissRecoveryCodeReveal,
  getClinicalBootDelays,
  ensureClinicalDbUnlocked,
  isSqlcipherNativeReady,
  applyClinicalDbUnlockCompletion,
  waitForDbUnlock,
  toggleRecoveryMode,
  submitRecoveryCode,
  submitDbUnlockPassphrase,
  syncDbSecuritySectionUi,
  openChangeMasterPasswordModal,
  closeChangeMasterPasswordModal,
  submitChangeMasterPassword,
  __resetDbUnlockWaitForTests,
  retryClinicalDbUnlockForOnboarding,
  dbUnlockWindowHandlers,
  __test
};
//# sourceMappingURL=/js/chunks/chunk-GWP7SFLC.js.map
