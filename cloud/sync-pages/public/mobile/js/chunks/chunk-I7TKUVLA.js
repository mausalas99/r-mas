import {
  applyClinicalDbUnlockCompletion,
  clearMigratedLocalStorageKeys,
  collectClinicalLsSnapshot,
  dbUnlockState,
  electronApi,
  handleUnlockSuccess,
  migrationUiPending,
  needsPassphraseConfirm,
  runMigrationProbe,
  tryAutoUnlockDb
} from "/mobile/js/chunks/chunk-RI6AP5AE.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-IIOGZLID.js";

// public/js/features/db-unlock-errors.mjs
function nativeAbiMismatchMessage(opts) {
  opts = opts || {};
  if (typeof window !== "undefined" && window.electronAPI) {
    if (opts.nativeError) return String(opts.nativeError);
    return "R+ no pudo cargar SQLCipher o el cifrado (argon2) en esta instalaci\xF3n. En Ajustes \u2192 Aplicaci\xF3n usa \xABRestaurar versi\xF3n estable\xBB o \xABAbrir instalador en GitHub\xBB.";
  }
  return "El m\xF3dulo SQLCipher no coincide con esta sesi\xF3n de R+ (suele pasar despu\xE9s de npm test). En la carpeta del proyecto ejecuta: npm run rebuild:db-native \u2014 cierra R+ por completo (Cmd+Q) y vuelve a abrir con npm start.";
}
function setupFailedMessage(res) {
  var setupDetail = res && (res.cause || res.error);
  return setupDetail ? "No se pudo crear la base cifrada: " + setupDetail : "No se pudo crear la base cifrada. Cierra R+, vuelve a abrir e intenta de nuevo.";
}
function schemaMigrationFailedMessage(res) {
  var migDetail = res && (res.cause || res.error || "");
  return "No se pudo actualizar el esquema de la base cifrada" + (migDetail ? ": " + migDetail : ".") + " Si el problema contin\xFAa, exporta un respaldo .db y contacta soporte.";
}
function nodeModuleVersionMismatchMessage() {
  return "El m\xF3dulo SQLCipher no coincide con esta versi\xF3n de Electron. En la carpeta del proyecto ejecuta: npm run rebuild:db-native \u2014 luego cierra R+ por completo y vuelve a abrirlo.";
}
var UNLOCK_ERROR_BY_CODE = {
  AUTH_RATE_LIMITED: function() {
    return "Demasiados intentos fallidos. Espera unos minutos e int\xE9ntalo de nuevo.";
  },
  DB_UNLOCK_METADATA_MISSING: function() {
    return "Faltan metadatos de cifrado en el perfil local. Contacta soporte o restaura un respaldo.";
  },
  DB_SETUP_RESET_FAILED: function() {
    return "No se pudo reiniciar la base cifrada anterior (archivo en uso). Cierra R+ por completo y vuelve a abrir.";
  },
  DB_UNLOCK_FAILED: function() {
    return "C\xF3digo de recuperaci\xF3n incorrecto.";
  },
  DB_RECOVERY_NOT_CONFIGURED: function() {
    return "La recuperaci\xF3n no est\xE1 disponible para esta base de datos.";
  },
  DB_AUTO_UNLOCK_FAILED: function() {
    return "No se pudo abrir la base en este equipo. Usa tu c\xF3digo de recuperaci\xF3n si lo guardaste.";
  }
};
function unlockErrorMessageForCode(code, res, opts) {
  if (code === "DB_SETUP_FAILED" || opts.setup && code === "DB_UNLOCK_FAILED") {
    return setupFailedMessage(res);
  }
  if (code === "DB_NATIVE_ABI_MISMATCH" || code === "DB_NATIVE_BINDING_FAILED") {
    return nativeAbiMismatchMessage(opts);
  }
  if (code === "DB_SCHEMA_MIGRATION_FAILED") {
    return schemaMigrationFailedMessage(res);
  }
  var handler = UNLOCK_ERROR_BY_CODE[code];
  return handler ? handler(res, opts) : null;
}
function unlockErrorMessage(res, opts) {
  opts = opts || {};
  var code = res && res.code;
  var byCode = unlockErrorMessageForCode(code, res, opts);
  if (byCode) return byCode;
  var detail = res && (res.cause || res.error || res.message);
  if (detail && /NODE_MODULE_VERSION|was compiled against a different/i.test(String(detail))) {
    return nodeModuleVersionMismatchMessage();
  }
  return detail || "No se pudo desbloquear la base de datos.";
}
function describeClinicalDbBootFailure(unlockResult) {
  if (!unlockResult || unlockResult.unlocked) return "";
  if (unlockResult.reason === "native_blocked") {
    return unlockErrorMessage(
      { code: "DB_NATIVE_ABI_MISMATCH" },
      { nativeError: unlockResult.status && unlockResult.status.nativeError }
    );
  }
  if (unlockResult.reason === "locked") {
    return "La base cl\xEDnica est\xE1 bloqueada. Usa tu c\xF3digo de recuperaci\xF3n en el di\xE1logo de desbloqueo \u2014 tus pacientes siguen en el disco.";
  }
  return unlockErrorMessage(unlockResult.status || {}, {});
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

// public/js/features/db-unlock-native.mjs
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
function getClinicalBootDelays() {
  if (typeof window !== "undefined" && window.electronAPI) {
    var flags = typeof window.electronAPI.getWindowChromeFlags === "function" ? window.electronAPI.getWindowChromeFlags() : null;
    if (flags && flags.isWindows) {
      return [0, 200, 500, 1e3, 2e3, 3500, 5e3];
    }
  }
  return [0, 120, 300, 600, 1200];
}
function delayMs(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

// public/js/features/db-unlock-overlay.mjs
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
  for (var i = 0; i < ids.length; i++) {
    var input = document.getElementById(ids[i]);
    if (input) input.type = "password";
  }
  var toggles = document.querySelectorAll("[data-db-unlock-secret-toggle]");
  for (var j = 0; j < toggles.length; j++) {
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
  dbUnlockState.pendingUnlockCompletion = result;
  if (result && result.recoveryCodeToShow) {
    showRecoveryCodeReveal(String(result.recoveryCodeToShow));
    return;
  }
  setOverlayVisible(false);
  if (dbUnlockState.unlockWaitResolve) {
    var done = dbUnlockState.unlockWaitResolve;
    dbUnlockState.unlockWaitResolve = null;
    done(result);
  }
  void import("/mobile/js/chunks/db-unlock-completion-3HHR3KHM.js").then((mod) => mod.applyClinicalDbUnlockCompletion());
}
function showRecoveryCodeReveal(code) {
  var reveal = document.getElementById("rpc-db-unlock-recovery-reveal");
  var codeEl = document.getElementById("rpc-db-unlock-recovery-reveal-code");
  var panelMain = document.getElementById("rpc-db-unlock-form-main");
  if (!reveal || !codeEl) {
    var fallback = dbUnlockState.pendingUnlockCompletion || { unlocked: true, status: {} };
    dbUnlockState.pendingUnlockCompletion = null;
    setOverlayVisible(false);
    if (dbUnlockState.unlockWaitResolve) {
      var doneMissing = dbUnlockState.unlockWaitResolve;
      dbUnlockState.unlockWaitResolve = null;
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
  var result = dbUnlockState.pendingUnlockCompletion || { unlocked: true, status: {} };
  dbUnlockState.pendingUnlockCompletion = null;
  setOverlayVisible(false);
  if (dbUnlockState.unlockWaitResolve) {
    var done = dbUnlockState.unlockWaitResolve;
    dbUnlockState.unlockWaitResolve = null;
    done(result);
  }
  void import("/mobile/js/chunks/db-unlock-completion-3HHR3KHM.js").then((mod) => mod.applyClinicalDbUnlockCompletion());
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
function configureUnlockConfirmSection(needsConfirm) {
  var confirmWrap = document.getElementById("rpc-db-unlock-confirm-wrap");
  var confirmInput = document.getElementById("rpc-db-unlock-confirm");
  if (confirmWrap) confirmWrap.style.display = needsConfirm ? "" : "none";
  if (confirmInput) confirmInput.value = "";
  return confirmInput;
}
function unlockHintForMode(status, probe, needsConfirm) {
  if (migrationUiPending(status, probe)) {
    return "Hay datos locales por migrar a la base cifrada. Elige una contrase\xF1a maestra (m\xEDnimo 8 caracteres) y conf\xEDrmala.";
  }
  if (needsConfirm) {
    return "Primera vez: crea una contrase\xF1a maestra para cifrar pacientes, notas y labs en este equipo (m\xEDnimo 8 caracteres). No es la contrase\xF1a de Mi Perfil.";
  }
  return "Ingresa la contrase\xF1a maestra que elegiste al activar la base cifrada. No es la contrase\xF1a de Mi Perfil ni el PIN de bloqueo por inactividad.";
}
function configureUnlockTitleAndHint(status, probe, needsConfirm) {
  var title = document.getElementById("rpc-db-unlock-title");
  var hint = document.getElementById("rpc-db-unlock-hint");
  if (title) {
    title.textContent = needsConfirm ? "Protege tus datos cl\xEDnicos" : "Desbloquear base de datos";
  }
  if (hint) hint.textContent = unlockHintForMode(status, probe, needsConfirm);
  return { title, hint };
}
function configureUnlockPassAutocomplete(needsConfirm, confirmInput) {
  var passInput = document.getElementById("rpc-db-unlock-pass");
  if (passInput) {
    passInput.autocomplete = needsConfirm ? "new-password" : "current-password";
  }
  if (confirmInput) {
    confirmInput.autocomplete = "new-password";
  }
}
function configureUnlockSubmitControls(status, needsConfirm, nativeBlocked) {
  var rate = document.getElementById("rpc-db-unlock-rate-limited");
  if (rate) rate.style.display = status && status.rateLimited ? "block" : "none";
  var submit = document.getElementById("rpc-db-unlock-submit");
  if (submit) {
    submit.disabled = !!(status && status.rateLimited) || nativeBlocked;
    submit.textContent = needsConfirm ? "Crear contrase\xF1a y continuar" : "Desbloquear";
  }
  var recoveryToggle = document.getElementById("rpc-db-unlock-recovery-toggle");
  if (recoveryToggle) recoveryToggle.style.display = needsConfirm || nativeBlocked ? "none" : "";
}
function applyNativeBlockedUi(status, title, hint) {
  setUnlockError(
    status.nativeError || unlockErrorMessage({ code: "DB_NATIVE_ABI_MISMATCH" }, { nativeError: status.nativeError })
  );
  if (title) title.textContent = "Instalaci\xF3n incompleta";
  if (hint) {
    hint.textContent = "Esta copia de R+ no carg\xF3 los m\xF3dulos nativos necesarios. Restaura una versi\xF3n estable en Ajustes \u2192 Aplicaci\xF3n o descarga el instalador desde GitHub.";
  }
}
function configureUnlockForm(status, probe) {
  var needsConfirm = needsPassphraseConfirm(status, probe);
  dbUnlockState.lastNeedsConfirm = needsConfirm;
  var confirmInput = configureUnlockConfirmSection(needsConfirm);
  var titleHint = configureUnlockTitleAndHint(status, probe, needsConfirm);
  configureUnlockPassAutocomplete(needsConfirm, confirmInput);
  var nativeBlocked = !!(status && !isSqlcipherNativeReady(status));
  configureUnlockSubmitControls(status, needsConfirm, nativeBlocked);
  if (nativeBlocked) {
    applyNativeBlockedUi(status, titleHint.title, titleHint.hint);
  } else {
    setUnlockError("");
  }
  wireDbUnlockSecretToggles();
  return nativeBlocked;
}
function waitForUnlockOverlay() {
  return new Promise(function(resolve) {
    dbUnlockState.unlockWaitResolve = resolve;
  });
}
async function presentDbUnlockGate(status) {
  var electron = electronApi();
  var probe = await runMigrationProbe(electron);
  dbUnlockState.lastMigrationProbe = probe;
  configureUnlockForm(status, probe);
  setOverlayVisible(true);
  var passInput = document.getElementById("rpc-db-unlock-pass");
  if (passInput) passInput.focus();
  return waitForUnlockOverlay();
}
function __resetDbUnlockWaitForTests() {
  dbUnlockState.unlockWaitResolve = null;
  dbUnlockState.lastMigrationProbe = null;
  setOverlayVisible(false);
}

// public/js/features/db-unlock-boot.mjs
function isUnlockedDbStatus(status) {
  return !status || status.state === "unlocked";
}
async function readDbStatus(electron) {
  try {
    return await electron.dbStatus();
  } catch {
    return null;
  }
}
function isAutoUnlockSuccess(autoRes) {
  return !!(autoRes && autoRes.ok !== false && autoRes.state === "unlocked");
}
async function tryAutoUnlockAttempt(electron) {
  var autoRes = await tryAutoUnlockDb(electron);
  if (!isAutoUnlockSuccess(autoRes)) return { unlocked: false, autoRes };
  handleUnlockSuccess(autoRes);
  return { unlocked: true, status: autoRes };
}
async function pollBootUnlockAttempt(electron) {
  var status = await readDbStatus(electron);
  if (!status) return null;
  if (!isSqlcipherNativeReady(status)) {
    return { unlocked: false, reason: "native_blocked", status };
  }
  if (isUnlockedDbStatus(status)) {
    return { unlocked: true, status };
  }
  var autoAttempt = await tryAutoUnlockAttempt(electron);
  if (autoAttempt.unlocked) return { unlocked: true, status: autoAttempt.status };
  return null;
}
function showToastIfAvailable(msg, kind) {
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(msg, kind);
  }
}
async function handleNativeBlockedUnlock(status) {
  var nativeMsg = unlockErrorMessage(
    { code: "DB_NATIVE_ABI_MISMATCH" },
    { nativeError: status.nativeError }
  );
  showToastIfAvailable(nativeMsg, "error");
  return { unlocked: false, status };
}
async function tryManualUnlockGate(status, autoRes) {
  if (!status.dbFileExists || !status.hasKdfSalt) return null;
  var overlayResult = await presentDbUnlockGate(status);
  if (overlayResult && overlayResult.unlocked) {
    handleUnlockSuccess(overlayResult.status || {});
    return { unlocked: true, status: overlayResult.status || status };
  }
  return { unlocked: false, status: overlayResult?.status || autoRes || status };
}
function buildAutoUnlockFailureResult(autoRes, status) {
  var errMsg = autoRes && (autoRes.cause || autoRes.error || autoRes.message) || "No se pudo abrir la base de datos cl\xEDnica.";
  showToastIfAvailable(errMsg, "error");
  return { unlocked: false, status: autoRes || status };
}
async function ensureClinicalDbUnlocked() {
  if (!isDbMode()) return { unlocked: true };
  var electron = electronApi();
  if (!electron || typeof electron.dbStatus !== "function") {
    return { unlocked: false, reason: "no_api" };
  }
  var delays = getClinicalBootDelays();
  for (var i = 0; i < delays.length; i += 1) {
    if (delays[i] > 0) await delayMs(delays[i]);
    var attempt = await pollBootUnlockAttempt(electron);
    if (attempt) return attempt;
  }
  var final = await waitForDbUnlock();
  return {
    unlocked: !!(final && final.unlocked),
    status: final && final.status,
    reason: final && final.unlocked ? void 0 : "locked"
  };
}
async function waitForDbUnlock() {
  if (!isDbMode()) return { unlocked: true };
  var electron = electronApi();
  if (!electron || typeof electron.dbStatus !== "function") {
    return { unlocked: true };
  }
  var status = await readDbStatus(electron);
  if (!status) return { unlocked: false };
  if (isUnlockedDbStatus(status)) {
    return { unlocked: true, status };
  }
  if (!isSqlcipherNativeReady(status)) {
    return handleNativeBlockedUnlock(status);
  }
  var autoAttempt = await tryAutoUnlockAttempt(electron);
  if (autoAttempt.unlocked) return { unlocked: true, status: autoAttempt.status };
  var gateResult = await tryManualUnlockGate(status, autoAttempt.autoRes);
  if (gateResult) return gateResult;
  return buildAutoUnlockFailureResult(autoAttempt.autoRes, status);
}

// public/js/features/db-unlock-submit.mjs
function getRecoveryModeElements() {
  return {
    recoveryWrap: document.getElementById("rpc-db-unlock-recovery-wrap"),
    toggleBtn: document.getElementById("rpc-db-unlock-recovery-toggle"),
    passEl: document.getElementById("rpc-db-unlock-pass"),
    confirmWrap: document.getElementById("rpc-db-unlock-confirm-wrap"),
    rememberLabel: document.querySelector(".rpc-db-unlock-remember"),
    rememberHint: document.querySelector(".settings-acc-hint--tight"),
    submitBtn: document.getElementById("rpc-db-unlock-submit")
  };
}
function showPassphraseUnlockMode(els) {
  var needsConfirm = dbUnlockState.lastNeedsConfirm;
  if (els.recoveryWrap) els.recoveryWrap.style.display = "none";
  if (els.toggleBtn) els.toggleBtn.style.display = "";
  if (els.passEl) {
    els.passEl.style.display = "";
    els.passEl.parentElement.style.display = "";
  }
  if (els.confirmWrap) els.confirmWrap.style.display = needsConfirm ? "" : "none";
  if (els.rememberLabel) els.rememberLabel.style.display = needsConfirm ? "" : "";
  if (els.rememberHint) els.rememberHint.style.display = needsConfirm ? "" : "";
  if (els.submitBtn) {
    els.submitBtn.textContent = needsConfirm ? "Crear contrase\xF1a y continuar" : "Desbloquear";
    els.submitBtn.setAttribute("onclick", "submitDbUnlockPassphrase()");
  }
}
function showRecoveryUnlockMode(els) {
  if (els.recoveryWrap) els.recoveryWrap.style.display = "";
  if (els.toggleBtn) els.toggleBtn.style.display = "none";
  if (els.passEl) {
    els.passEl.style.display = "none";
    els.passEl.parentElement.style.display = "none";
  }
  if (els.confirmWrap) els.confirmWrap.style.display = "none";
  if (els.rememberLabel) els.rememberLabel.style.display = "none";
  if (els.rememberHint) els.rememberHint.style.display = "none";
  if (els.submitBtn) {
    els.submitBtn.textContent = "Recuperar acceso";
    els.submitBtn.setAttribute("onclick", "submitRecoveryCode()");
  }
  var recCode = document.getElementById("rpc-db-unlock-recovery-code");
  if (recCode) recCode.focus();
}
function toggleRecoveryMode() {
  var els = getRecoveryModeElements();
  var isRecovery = els.recoveryWrap && els.recoveryWrap.style.display !== "none";
  if (isRecovery) showPassphraseUnlockMode(els);
  else showRecoveryUnlockMode(els);
  setUnlockError("");
}
async function refreshUnlockFormFromStatus(electron) {
  try {
    var st2 = await electron.dbStatus();
    configureUnlockForm(st2, dbUnlockState.lastMigrationProbe);
  } catch {
  }
}
function validatePassphraseSubmit(passphrase, confirm, isSetup) {
  if (isSetup) {
    if (passphrase.length < 8) return "La contrase\xF1a debe tener al menos 8 caracteres.";
    if (!confirm) return "Confirma la contrase\xF1a en el segundo campo.";
    if (passphrase !== confirm) return "La confirmaci\xF3n no coincide con la contrase\xF1a.";
    return "";
  }
  if (!passphrase) return "Ingresa la contrase\xF1a maestra.";
  return "";
}
async function resolveUnlockProbe(electron) {
  var probe = dbUnlockState.lastMigrationProbe;
  if (probe) return probe;
  probe = await runMigrationProbe(electron);
  dbUnlockState.lastMigrationProbe = probe;
  return probe;
}
async function readUnlockDbStatus(electron) {
  try {
    return await electron.dbStatus();
  } catch {
    return { migrationPending: false, dbFileExists: true };
  }
}
function buildUnlockPayload(passphrase, remember, isSetup, probe) {
  var unlockPayload = { passphrase, remember, setup: isSetup };
  if (probe && probe.needed) {
    unlockPayload.lsSnapshot = collectClinicalLsSnapshot();
  }
  return unlockPayload;
}
function handleUnlockMigrationWarning(res, submitBtn) {
  if (!res.migrationWarning) return true;
  var warnMsg = "La base cifrada se cre\xF3, pero la migraci\xF3n de datos locales fall\xF3: " + res.migrationWarning;
  if (typeof window !== "undefined" && typeof window.showToast === "function") {
    window.showToast(warnMsg, "error");
    return true;
  }
  setUnlockError(warnMsg);
  if (submitBtn) submitBtn.disabled = false;
  return false;
}
async function submitRecoveryCode() {
  var electron = electronApi();
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
      await refreshUnlockFormFromStatus(electron);
      return;
    }
    finishUnlockFlow({ unlocked: true, status: res, recoveryCodeToShow: res.recoveryCodeToShow });
  } catch (err) {
    setUnlockError(err && err.message || "Error al recuperar.");
    if (submitBtn) submitBtn.disabled = false;
  }
}
function readUnlockPassphraseForm() {
  var passEl = document.getElementById("rpc-db-unlock-pass");
  var confirmEl = document.getElementById("rpc-db-unlock-confirm");
  var rememberEl = document.getElementById("rpc-db-unlock-remember");
  return {
    passphrase: passEl ? String(passEl.value || "") : "",
    confirm: confirmEl ? String(confirmEl.value || "") : "",
    remember: !!(rememberEl && rememberEl.checked)
  };
}
async function handleUnlockSubmitFailure(electron, res, isSetup, status, submitBtn) {
  setUnlockError(unlockErrorMessage(res || {}, { setup: isSetup }));
  if (submitBtn) submitBtn.disabled = !!(status && status.rateLimited);
  await refreshUnlockFormFromStatus(electron);
}
function finalizeUnlockSubmitSuccess(res, submitBtn) {
  if (res.clearKeys && res.clearKeys.length) {
    clearMigratedLocalStorageKeys(res.clearKeys);
  }
  if (!handleUnlockMigrationWarning(res, submitBtn)) return false;
  dbUnlockState.lastMigrationProbe = { needed: false, hasHostJson: false };
  finishUnlockFlow({ unlocked: true, status: res, recoveryCodeToShow: res.recoveryCodeToShow });
  return true;
}
async function submitDbUnlockPassphrase() {
  var electron = electronApi();
  if (!electron || typeof electron.dbUnlock !== "function") return;
  var form = readUnlockPassphraseForm();
  var status = await readUnlockDbStatus(electron);
  var probe = await resolveUnlockProbe(electron);
  var isSetup = needsPassphraseConfirm(status, probe);
  var validationError = validatePassphraseSubmit(form.passphrase, form.confirm, isSetup);
  if (validationError) {
    setUnlockError(validationError);
    return;
  }
  setUnlockError("");
  var submitBtn = document.getElementById("rpc-db-unlock-submit");
  if (submitBtn) submitBtn.disabled = true;
  try {
    var res = await electron.dbUnlock(
      buildUnlockPayload(form.passphrase, form.remember, isSetup, probe)
    );
    if (!res || res.ok === false) {
      await handleUnlockSubmitFailure(electron, res, isSetup, status, submitBtn);
      return;
    }
    finalizeUnlockSubmitSuccess(res, submitBtn);
  } catch (err) {
    setUnlockError(err && err.message || "Error al desbloquear.");
    if (submitBtn) submitBtn.disabled = false;
  }
}

// public/js/features/db-unlock-change-pass.mjs
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
function readChangePassFormValues() {
  var currentEl = document.getElementById("rpc-db-change-pass-current");
  var newEl = document.getElementById("rpc-db-change-pass-new");
  var confirmEl = document.getElementById("rpc-db-change-pass-confirm");
  var rememberEl = document.getElementById("rpc-db-change-pass-remember");
  return {
    current: currentEl ? String(currentEl.value || "") : "",
    next: newEl ? String(newEl.value || "") : "",
    confirm: confirmEl ? String(confirmEl.value || "") : "",
    remember: !!(rememberEl && rememberEl.checked)
  };
}
function validateChangePassForm(current, next, confirm) {
  if (!current) return "Ingresa tu contrase\xF1a actual.";
  if (next.length < 8) return "La contrase\xF1a nueva debe tener al menos 8 caracteres.";
  if (!confirm) return "Confirma la contrase\xF1a nueva.";
  if (next !== confirm) return "La confirmaci\xF3n no coincide con la contrase\xF1a nueva.";
  if (current === next) return "La contrase\xF1a nueva debe ser distinta de la actual.";
  return "";
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
  var electron = electronApi();
  if (!electron || typeof electron.dbChangePassphrase !== "function") return;
  var form = readChangePassFormValues();
  var validationError = validateChangePassForm(form.current, form.next, form.confirm);
  if (validationError) {
    setChangePassError(validationError);
    return;
  }
  setChangePassError("");
  var submitBtn = document.getElementById("rpc-db-change-pass-submit");
  if (submitBtn) submitBtn.disabled = true;
  try {
    var res = await electron.dbChangePassphrase({
      currentPassphrase: form.current,
      newPassphrase: form.next,
      remember: form.remember
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
function syncDbSecuritySectionUi() {
  var section = document.getElementById("settings-accordion-db-security");
  if (!section) return;
  section.style.display = "none";
  void import("/mobile/js/chunks/settings-dropdown-I3LWLXOL.js").then(function(m) {
    if (typeof m.syncSettingsNavVisibility === "function") m.syncSettingsNavVisibility();
  }).catch(function() {
  });
}

// public/js/features/db-unlock.mjs
async function retryClinicalDbUnlockForOnboarding() {
  const { isDbMode: isDbMode2 } = await import("/mobile/js/chunks/db-storage-bridge-OVJR54PH.js");
  if (!isDbMode2()) return false;
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
  describeClinicalDbBootFailure,
  isSqlcipherNativeReady,
  getClinicalBootDelays,
  toggleDbUnlockSecretField,
  showRecoveryCodeReveal,
  dismissRecoveryCodeReveal,
  __resetDbUnlockWaitForTests,
  ensureClinicalDbUnlocked,
  waitForDbUnlock,
  toggleRecoveryMode,
  submitRecoveryCode,
  submitDbUnlockPassphrase,
  openChangeMasterPasswordModal,
  closeChangeMasterPasswordModal,
  submitChangeMasterPassword,
  syncDbSecuritySectionUi,
  retryClinicalDbUnlockForOnboarding,
  dbUnlockWindowHandlers,
  __test
};
//# sourceMappingURL=/js/chunks/chunk-I7TKUVLA.js.map
