/** SQLCipher unlock overlay (Electron db mode only). */
import { CLINICAL_LS_KEYS, isDbMode } from '../db-storage-bridge.mjs';

/** @type {((result: { unlocked: boolean, status?: object }) => void) | null} */
let unlockWaitResolve = null;

/** @type {{ needed: boolean, hasHostJson?: boolean } | null} */
let lastMigrationProbe = null;

let lastNeedsConfirm = true;

function api() {
  return typeof window !== 'undefined' ? window.electronAPI : null;
}

export function needsPassphraseConfirm(status, probe) {
  if (!status || typeof status !== 'object') return true;
  // Existing encrypted database → unlock only, never re-run setup (would wipe data).
  if (status.dbFileExists && status.hasKdfSalt) return false;
  if (status.migrationPending && !status.dbFileExists) return true;
  if (probe && probe.needed && !status.dbFileExists) return true;
  if (status.dbFileExists === false) return true;
  return false;
}

export function collectClinicalLsSnapshot() {
  var snapshot = {};
  if (typeof localStorage === 'undefined') return snapshot;
  for (var i = 0; i < CLINICAL_LS_KEYS.length; i++) {
    var key = CLINICAL_LS_KEYS[i];
    if (!Object.prototype.hasOwnProperty.call(localStorage, key)) continue;
    var raw = localStorage.getItem(key);
    if (raw != null) snapshot[key] = raw;
  }
  return snapshot;
}

function clearMigratedLocalStorageKeys(keys) {
  if (!keys || !keys.length || typeof localStorage === 'undefined') return;
  for (var i = 0; i < keys.length; i++) {
    try {
      localStorage.removeItem(keys[i]);
    } catch (_e) {}
  }
}

async function runMigrationProbe(electron) {
  if (!electron || typeof electron.dbMigrationProbe !== 'function') {
    return { needed: false, hasHostJson: false };
  }
  var lsSnapshot = collectClinicalLsSnapshot();
  try {
    var res = await electron.dbMigrationProbe({ lsSnapshot: lsSnapshot });
    if (res && res.ok !== false) {
      return { needed: !!res.needed, hasHostJson: !!res.hasHostJson };
    }
  } catch (_e) {}
  return { needed: false, hasHostJson: false };
}

function migrationUiPending(status, probe) {
  return !!(status && status.migrationPending) || !!(probe && probe.needed);
}

function unlockErrorMessage(res, opts) {
  opts = opts || {};
  var code = res && res.code;
  if (code === 'AUTH_RATE_LIMITED') {
    return 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (code === 'DB_UNLOCK_METADATA_MISSING') {
    return 'Faltan metadatos de cifrado en el perfil local. Contacta soporte o restaura un respaldo.';
  }
  if (code === 'DB_SETUP_RESET_FAILED') {
    return (
      'No se pudo reiniciar la base cifrada anterior (archivo en uso). Cierra R+ por completo y vuelve a abrir.'
    );
  }
  if (code === 'DB_SETUP_FAILED' || (opts.setup && code === 'DB_UNLOCK_FAILED')) {
    var setupDetail = res && (res.cause || res.error);
    return setupDetail
      ? 'No se pudo crear la base cifrada: ' + setupDetail
      : 'No se pudo crear la base cifrada. Cierra R+, vuelve a abrir e intenta de nuevo.';
  }
  if (code === 'DB_UNLOCK_FAILED') {
    var cause = res && (res.cause || res.error || '');
    if (/file is not a database|not a database/i.test(String(cause))) {
      return 'Código de recuperación incorrecto.';
    }
    return 'Código de recuperación incorrecto.';
  }
  if (code === 'DB_RECOVERY_NOT_CONFIGURED') {
    return 'La recuperación no está disponible para esta base de datos.';
  }
  if (code === 'DB_NATIVE_ABI_MISMATCH') {
    return (
      'El módulo SQLCipher no coincide con esta sesión de R+ (suele pasar después de npm test). ' +
      'En la carpeta del proyecto ejecuta: npm run rebuild:db-native — cierra R+ por completo (Cmd+Q) y vuelve a abrir con npm start.'
    );
  }
  if (code === 'DB_SCHEMA_MIGRATION_FAILED') {
    var migDetail = res && (res.cause || res.error || '');
    return (
      'No se pudo actualizar el esquema de la base cifrada' +
      (migDetail ? ': ' + migDetail : '.') +
      ' Si el problema continúa, exporta un respaldo .db y contacta soporte.'
    );
  }
  var detail = res && (res.cause || res.error || res.message);
  if (detail && /NODE_MODULE_VERSION|was compiled against a different/i.test(String(detail))) {
    return (
      'El módulo SQLCipher no coincide con esta versión de Electron. En la carpeta del proyecto ejecuta: npm run rebuild:db-native — luego cierra R+ por completo y vuelve a abrirlo.'
    );
  }
  return detail || 'No se pudo desbloquear la base de datos.';
}

function toggleDbUnlockSecretField(toggleBtn) {
  if (!toggleBtn) return;
  var controlId = toggleBtn.getAttribute('aria-controls');
  var input = controlId ? document.getElementById(controlId) : null;
  if (!input) return;
  var show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  toggleBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
  toggleBtn.textContent = show ? 'Ocultar' : 'Mostrar';
  toggleBtn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
}

function wireDbUnlockSecretToggles() {
  if (typeof document === 'undefined') return;
  var toggles = document.querySelectorAll('[data-db-unlock-secret-toggle]');
  for (var i = 0; i < toggles.length; i += 1) {
    var btn = toggles[i];
    if (btn.dataset.dbUnlockSecretWired === '1') continue;
    btn.dataset.dbUnlockSecretWired = '1';
    btn.addEventListener('click', function (ev) {
      toggleDbUnlockSecretField(ev.currentTarget);
    });
  }
}

function resetDbUnlockSecretFields() {
  var ids = ['rpc-db-unlock-pass', 'rpc-db-unlock-confirm'];
  for (var i = 0; i < ids.length; i += 1) {
    var input = document.getElementById(ids[i]);
    if (input) input.type = 'password';
  }
  var toggles = document.querySelectorAll('[data-db-unlock-secret-toggle]');
  for (var j = 0; j < toggles.length; j += 1) {
    toggles[j].setAttribute('aria-pressed', 'false');
    toggles[j].textContent = 'Mostrar';
    toggles[j].setAttribute('aria-label', 'Mostrar contraseña');
  }
  resetDbUnlockRecoveryMode();
}

function resetDbUnlockRecoveryMode() {
  var recoveryWrap = document.getElementById('rpc-db-unlock-recovery-wrap');
  var submitBtn = document.getElementById('rpc-db-unlock-submit');
  if (recoveryWrap) recoveryWrap.style.display = 'none';
  if (submitBtn) submitBtn.setAttribute('onclick', 'submitDbUnlockPassphrase()');
  var recCode = document.getElementById('rpc-db-unlock-recovery-code');
  if (recCode) recCode.value = '';
}

function setOverlayVisible(visible) {
  var overlay = document.getElementById('rpc-db-unlock-overlay');
  if (!overlay) return;
  overlay.style.display = visible ? 'flex' : 'none';
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
  if (visible) {
    document.body.classList.add('rpc-db-unlock-active');
    resetDbUnlockSecretFields();
    wireDbUnlockSecretToggles();
    var pass = document.getElementById('rpc-db-unlock-pass');
    if (pass) {
      pass.value = '';
      pass.focus();
    }
  } else {
    document.body.classList.remove('rpc-db-unlock-active');
  }
}

function setUnlockError(msg) {
  var err = document.getElementById('rpc-db-unlock-error');
  if (!err) return;
  if (msg) {
    err.textContent = msg;
    err.style.display = 'block';
  } else {
    err.textContent = '';
    err.style.display = 'none';
  }
}

function configureUnlockForm(status, probe) {
  var needsConfirm = needsPassphraseConfirm(status, probe);
  lastNeedsConfirm = needsConfirm;
  var confirmWrap = document.getElementById('rpc-db-unlock-confirm-wrap');
  var confirmInput = document.getElementById('rpc-db-unlock-confirm');
  if (confirmWrap) confirmWrap.style.display = needsConfirm ? '' : 'none';
  if (confirmInput) confirmInput.value = '';

  var title = document.getElementById('rpc-db-unlock-title');
  var hint = document.getElementById('rpc-db-unlock-hint');
  if (title) {
    title.textContent = needsConfirm
      ? 'Protege tus datos clínicos'
      : 'Desbloquear base de datos';
  }
  if (hint) {
    if (migrationUiPending(status, probe)) {
      hint.textContent =
        'Hay datos locales por migrar a la base cifrada. Elige una contraseña maestra (mínimo 8 caracteres) y confírmala.';
    } else if (needsConfirm) {
      hint.textContent =
        'Primera vez: crea una contraseña maestra para cifrar pacientes, notas y labs en este equipo (mínimo 8 caracteres). No es la contraseña de Mi Perfil.';
    } else {
      hint.textContent =
        'Ingresa la contraseña maestra que elegiste al activar la base cifrada. No es la contraseña de Mi Perfil ni el PIN de bloqueo por inactividad.';
    }
  }

  var passInput = document.getElementById('rpc-db-unlock-pass');
  var confirmInput = document.getElementById('rpc-db-unlock-confirm');
  if (passInput) {
    passInput.autocomplete = needsConfirm ? 'new-password' : 'current-password';
  }
  if (confirmInput) {
    confirmInput.autocomplete = 'new-password';
  }

  var rate = document.getElementById('rpc-db-unlock-rate-limited');
  if (rate) rate.style.display = status && status.rateLimited ? 'block' : 'none';
  var submit = document.getElementById('rpc-db-unlock-submit');
  var nativeBlocked = !!(status && status.nativeReady === false);
  if (submit) {
    submit.disabled = !!(status && status.rateLimited) || nativeBlocked;
    submit.textContent = needsConfirm ? 'Crear contraseña y continuar' : 'Desbloquear';
  }
  var recoveryToggle = document.getElementById('rpc-db-unlock-recovery-toggle');
  if (recoveryToggle) recoveryToggle.style.display = needsConfirm ? 'none' : '';
  wireDbUnlockSecretToggles();
  return nativeBlocked;
}

/**
 * Blocks until DB is unlocked (no-op outside db mode).
 * @returns {Promise<{ unlocked: boolean, status?: object }>}
 */
export async function waitForDbUnlock() {
  if (!isDbMode()) return { unlocked: true };
  var electron = api();
  if (!electron || typeof electron.dbStatus !== 'function') {
    return { unlocked: true };
  }
  var status;
  try {
    status = await electron.dbStatus();
  } catch (_e) {
    return { unlocked: false };
  }
  if (!status || status.state === 'unlocked') {
    return { unlocked: true, status: status || {} };
  }
  lastMigrationProbe = await runMigrationProbe(electron);
  return new Promise(function (resolve) {
    unlockWaitResolve = resolve;
    var nativeBlocked = configureUnlockForm(status, lastMigrationProbe);
    if (nativeBlocked) {
      setUnlockError(unlockErrorMessage({ code: 'DB_NATIVE_ABI_MISMATCH' }));
    } else if (status.rateLimited) {
      setUnlockError(unlockErrorMessage({ code: 'AUTH_RATE_LIMITED' }));
    } else {
      setUnlockError('');
    }
    setOverlayVisible(true);
  });
}

export function toggleRecoveryMode() {
  var recoveryWrap = document.getElementById('rpc-db-unlock-recovery-wrap');
  var toggleBtn = document.getElementById('rpc-db-unlock-recovery-toggle');
  var passEl = document.getElementById('rpc-db-unlock-pass');
  var confirmWrap = document.getElementById('rpc-db-unlock-confirm-wrap');
  var rememberLabel = document.querySelector('.rpc-db-unlock-remember');
  var rememberHint = document.querySelector('.settings-acc-hint--tight');
  var submitBtn = document.getElementById('rpc-db-unlock-submit');
  var isRecovery = recoveryWrap && recoveryWrap.style.display !== 'none';
  if (isRecovery) {
    if (recoveryWrap) recoveryWrap.style.display = 'none';
    if (toggleBtn) toggleBtn.style.display = '';
    if (passEl) { passEl.style.display = ''; passEl.parentElement.style.display = ''; }
    if (confirmWrap) confirmWrap.style.display = lastNeedsConfirm ? '' : 'none';
    if (rememberLabel) rememberLabel.style.display = lastNeedsConfirm ? '' : '';
    if (rememberHint) rememberHint.style.display = lastNeedsConfirm ? '' : '';
    if (submitBtn) {
      submitBtn.textContent = lastNeedsConfirm ? 'Crear contraseña y continuar' : 'Desbloquear';
      submitBtn.setAttribute('onclick', 'submitDbUnlockPassphrase()');
    }
  } else {
    if (recoveryWrap) recoveryWrap.style.display = '';
    if (toggleBtn) toggleBtn.style.display = 'none';
    if (passEl) { passEl.style.display = 'none'; passEl.parentElement.style.display = 'none'; }
    if (confirmWrap) confirmWrap.style.display = 'none';
    if (rememberLabel) rememberLabel.style.display = 'none';
    if (rememberHint) rememberHint.style.display = 'none';
    if (submitBtn) { submitBtn.textContent = 'Recuperar acceso'; submitBtn.setAttribute('onclick', 'submitRecoveryCode()'); }
    var recCode = document.getElementById('rpc-db-unlock-recovery-code');
    if (recCode) recCode.focus();
  }
  setUnlockError('');
}

export async function submitRecoveryCode() {
  var electron = api();
  if (!electron || typeof electron.dbUnlockRecovery !== 'function') return;

  var codeEl = document.getElementById('rpc-db-unlock-recovery-code');
  var code = codeEl ? String(codeEl.value || '').trim() : '';

  if (!code) {
    setUnlockError('Ingresa el código de recuperación.');
    return;
  }

  setUnlockError('');
  var submitBtn = document.getElementById('rpc-db-unlock-submit');
  if (submitBtn) submitBtn.disabled = true;

  try {
    var res = await electron.dbUnlockRecovery({ code: code });
    if (!res || res.ok === false) {
      setUnlockError(unlockErrorMessage(res || {}, {}));
      if (submitBtn) submitBtn.disabled = false;
      try {
        var st2 = await electron.dbStatus();
        configureUnlockForm(st2, lastMigrationProbe);
      } catch (_e2) {}
      return;
    }
    setOverlayVisible(false);
    if (unlockWaitResolve) {
      var done = unlockWaitResolve;
      unlockWaitResolve = null;
      done({ unlocked: true, status: res });
    }
  } catch (err) {
    setUnlockError((err && err.message) || 'Error al recuperar.');
    if (submitBtn) submitBtn.disabled = false;
  }
}

export async function submitDbUnlockPassphrase() {
  var electron = api();
  if (!electron || typeof electron.dbUnlock !== 'function') return;

  var passEl = document.getElementById('rpc-db-unlock-pass');
  var confirmEl = document.getElementById('rpc-db-unlock-confirm');
  var rememberEl = document.getElementById('rpc-db-unlock-remember');
  var passphrase = passEl ? String(passEl.value || '') : '';
  var remember = !!(rememberEl && rememberEl.checked);

  var status = { migrationPending: false, dbFileExists: true };
  try {
    status = await electron.dbStatus();
  } catch (_e) {}

  var probe = lastMigrationProbe;
  if (!probe) {
    probe = await runMigrationProbe(electron);
    lastMigrationProbe = probe;
  }

  var isSetup = needsPassphraseConfirm(status, probe);

  if (isSetup) {
    var confirm = confirmEl ? String(confirmEl.value || '') : '';
    if (passphrase.length < 8) {
      setUnlockError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!confirm) {
      setUnlockError('Confirma la contraseña en el segundo campo.');
      return;
    }
    if (passphrase !== confirm) {
      setUnlockError('La confirmación no coincide con la contraseña.');
      return;
    }
  } else if (!passphrase) {
    setUnlockError('Ingresa la contraseña maestra.');
    return;
  }

  setUnlockError('');
  var submitBtn = document.getElementById('rpc-db-unlock-submit');
  if (submitBtn) submitBtn.disabled = true;

  try {
    var unlockPayload = { passphrase: passphrase, remember: remember, setup: isSetup };
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
      } catch (_e2) {}
      return;
    }
    if (res.clearKeys && res.clearKeys.length) {
      clearMigratedLocalStorageKeys(res.clearKeys);
    }
    if (res.migrationWarning) {
      var warnMsg =
        'La base cifrada se creó, pero la migración de datos locales falló: ' + res.migrationWarning;
      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast(warnMsg, 'error');
      } else {
        setUnlockError(warnMsg);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
    }
    lastMigrationProbe = { needed: false, hasHostJson: false };
    setOverlayVisible(false);
    if (unlockWaitResolve) {
      var done = unlockWaitResolve;
      unlockWaitResolve = null;
      done({ unlocked: true, status: res });
    }
  } catch (err) {
    setUnlockError((err && err.message) || 'Error al desbloquear.');
    if (submitBtn) submitBtn.disabled = false;
  }
}

export function syncDbSecuritySectionUi() {
  var section = document.getElementById('settings-accordion-db-security');
  if (!section) return;
  section.style.display = isDbMode() ? '' : 'none';
}

function setChangePassError(msg) {
  var err = document.getElementById('rpc-db-change-pass-error');
  if (!err) return;
  if (msg) {
    err.textContent = msg;
    err.style.display = 'block';
  } else {
    err.textContent = '';
    err.style.display = 'none';
  }
}

function changePassphraseErrorMessage(res) {
  var code = res && res.code;
  if (code === 'DB_PASSPHRASE_MISMATCH') {
    return 'La contraseña actual no es correcta.';
  }
  if (code === 'DB_PASSPHRASE_TOO_SHORT') {
    return 'La contraseña nueva debe tener al menos 8 caracteres.';
  }
  if (code === 'DB_PASSPHRASE_INVALID') {
    return 'Completa la contraseña actual y la nueva.';
  }
  if (code === 'DB_LOCKED') {
    return 'La base está bloqueada. Desbloquéala antes de cambiar la contraseña.';
  }
  return (res && (res.cause || res.error || res.message)) || 'No se pudo cambiar la contraseña.';
}

export function openChangeMasterPasswordModal() {
  if (!isDbMode()) return;
  var electron = api();
  if (!electron || typeof electron.dbChangePassphrase !== 'function') return;

  var overlay = document.getElementById('rpc-db-change-pass-overlay');
  if (!overlay) return;

  var ids = ['rpc-db-change-pass-current', 'rpc-db-change-pass-new', 'rpc-db-change-pass-confirm'];
  for (var i = 0; i < ids.length; i += 1) {
    var el = document.getElementById(ids[i]);
    if (el) el.value = '';
  }
  var remember = document.getElementById('rpc-db-change-pass-remember');
  if (remember) remember.checked = false;

  setChangePassError('');
  var submitBtn = document.getElementById('rpc-db-change-pass-submit');
  if (submitBtn) submitBtn.disabled = false;
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  wireDbUnlockSecretToggles();
  var first = document.getElementById('rpc-db-change-pass-current');
  if (first) first.focus();
}

export function closeChangeMasterPasswordModal() {
  var overlay = document.getElementById('rpc-db-change-pass-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  setChangePassError('');
}

export async function submitChangeMasterPassword() {
  var electron = api();
  if (!electron || typeof electron.dbChangePassphrase !== 'function') return;

  var currentEl = document.getElementById('rpc-db-change-pass-current');
  var newEl = document.getElementById('rpc-db-change-pass-new');
  var confirmEl = document.getElementById('rpc-db-change-pass-confirm');
  var rememberEl = document.getElementById('rpc-db-change-pass-remember');
  var current = currentEl ? String(currentEl.value || '') : '';
  var next = newEl ? String(newEl.value || '') : '';
  var confirm = confirmEl ? String(confirmEl.value || '') : '';
  var remember = !!(rememberEl && rememberEl.checked);

  if (!current) {
    setChangePassError('Ingresa tu contraseña actual.');
    return;
  }
  if (next.length < 8) {
    setChangePassError('La contraseña nueva debe tener al menos 8 caracteres.');
    return;
  }
  if (!confirm) {
    setChangePassError('Confirma la contraseña nueva.');
    return;
  }
  if (next !== confirm) {
    setChangePassError('La confirmación no coincide con la contraseña nueva.');
    return;
  }
  if (current === next) {
    setChangePassError('La contraseña nueva debe ser distinta de la actual.');
    return;
  }

  setChangePassError('');
  var submitBtn = document.getElementById('rpc-db-change-pass-submit');
  if (submitBtn) submitBtn.disabled = true;

  try {
    var res = await electron.dbChangePassphrase({
      currentPassphrase: current,
      newPassphrase: next,
      remember: remember,
    });
    if (!res || res.ok === false) {
      setChangePassError(changePassphraseErrorMessage(res || {}));
      if (submitBtn) submitBtn.disabled = false;
      return;
    }
    closeChangeMasterPasswordModal();
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast('Contraseña maestra actualizada', 'success');
    }
  } catch (err) {
    setChangePassError((err && err.message) || 'No se pudo cambiar la contraseña.');
    if (submitBtn) submitBtn.disabled = false;
  }
}

/** @internal tests */
export function __resetDbUnlockWaitForTests() {
  unlockWaitResolve = null;
  lastMigrationProbe = null;
  setOverlayVisible(false);
}

export const dbUnlockWindowHandlers = {
  submitDbUnlockPassphrase,
  submitRecoveryCode,
  toggleRecoveryMode,
  openChangeMasterPasswordModal,
  closeChangeMasterPasswordModal,
  submitChangeMasterPassword,
};

/** @internal tests */
export const __test = {
  toggleDbUnlockSecretField,
};
