/** SQLCipher unlock overlay (Electron db mode only). */
import { isDbMode } from '../db-storage-bridge.mjs';

/** @type {((result: { unlocked: boolean, status?: object }) => void) | null} */
let unlockWaitResolve = null;

function api() {
  return typeof window !== 'undefined' ? window.electronAPI : null;
}

export function needsPassphraseConfirm(status) {
  if (!status || typeof status !== 'object') return true;
  if (status.migrationPending) return true;
  if (status.dbFileExists === false) return true;
  return false;
}

function unlockErrorMessage(res) {
  var code = res && res.code;
  if (code === 'AUTH_RATE_LIMITED') {
    return 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (code === 'DB_UNLOCK_METADATA_MISSING') {
    return 'Faltan metadatos de cifrado en el perfil local. Contacta soporte o restaura un respaldo.';
  }
  if (code === 'DB_UNLOCK_FAILED') {
    return 'Contraseña incorrecta. Verifica mayúsculas, espacios y vuelve a intentar.';
  }
  return (res && (res.error || res.message)) || 'No se pudo desbloquear la base de datos.';
}

function setOverlayVisible(visible) {
  var overlay = document.getElementById('rpc-db-unlock-overlay');
  if (!overlay) return;
  overlay.style.display = visible ? 'flex' : 'none';
  overlay.setAttribute('aria-hidden', visible ? 'false' : 'true');
  if (visible) {
    document.body.classList.add('rpc-db-unlock-active');
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

function configureUnlockForm(status) {
  var needsConfirm = needsPassphraseConfirm(status);
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
    if (status && status.migrationPending) {
      hint.textContent =
        'Hay datos locales por migrar a la base cifrada. Elige una contraseña maestra (mínimo 8 caracteres) y confírmala.';
    } else if (needsConfirm) {
      hint.textContent =
        'Primera vez: crea una contraseña maestra para cifrar pacientes, notas y labs en este equipo (mínimo 8 caracteres).';
    } else {
      hint.textContent =
        'Ingresa la contraseña maestra de la base de datos clínica en este equipo.';
    }
  }

  var rate = document.getElementById('rpc-db-unlock-rate-limited');
  if (rate) rate.style.display = status && status.rateLimited ? 'block' : 'none';
  var submit = document.getElementById('rpc-db-unlock-submit');
  if (submit) submit.disabled = !!(status && status.rateLimited);
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
  return new Promise(function (resolve) {
    unlockWaitResolve = resolve;
    configureUnlockForm(status);
    setUnlockError(status.rateLimited ? unlockErrorMessage({ code: 'AUTH_RATE_LIMITED' }) : '');
    setOverlayVisible(true);
  });
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

  if (needsPassphraseConfirm(status)) {
    var confirm = confirmEl ? String(confirmEl.value || '') : '';
    if (passphrase.length < 8) {
      setUnlockError('La contraseña debe tener al menos 8 caracteres.');
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
    var res = await electron.dbUnlock({ passphrase: passphrase, remember: remember });
    if (!res || res.ok === false) {
      setUnlockError(unlockErrorMessage(res || {}));
      if (submitBtn) submitBtn.disabled = !!(status && status.rateLimited);
      try {
        var st2 = await electron.dbStatus();
        configureUnlockForm(st2);
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
    setUnlockError((err && err.message) || 'Error al desbloquear.');
    if (submitBtn) submitBtn.disabled = false;
  }
}

export function syncDbSecuritySectionUi() {
  var section = document.getElementById('settings-accordion-db-security');
  if (!section) return;
  section.style.display = isDbMode() ? '' : 'none';
}

/** @internal tests */
export function __resetDbUnlockWaitForTests() {
  unlockWaitResolve = null;
  setOverlayVisible(false);
}

export const dbUnlockWindowHandlers = {
  submitDbUnlockPassphrase,
};
