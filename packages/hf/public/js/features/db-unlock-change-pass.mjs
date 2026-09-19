import { changePassphraseErrorMessage } from './db-unlock-errors.mjs';
import { electronApi } from './db-unlock-state.mjs';
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { hasProgramAdminPrivileges } from '../clinical-privileges.mjs';

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

function readChangePassFormValues() {
  var currentEl = document.getElementById('rpc-db-change-pass-current');
  var newEl = document.getElementById('rpc-db-change-pass-new');
  var confirmEl = document.getElementById('rpc-db-change-pass-confirm');
  var rememberEl = document.getElementById('rpc-db-change-pass-remember');
  return {
    current: currentEl ? String(currentEl.value || '') : '',
    next: newEl ? String(newEl.value || '') : '',
    confirm: confirmEl ? String(confirmEl.value || '') : '',
    remember: !!(rememberEl && rememberEl.checked),
  };
}

function validateChangePassForm(current, next, confirm) {
  if (!current) return 'Ingresa tu contraseña actual.';
  if (next.length < 8) return 'La contraseña nueva debe tener al menos 8 caracteres.';
  if (!confirm) return 'Confirma la contraseña nueva.';
  if (next !== confirm) return 'La confirmación no coincide con la contraseña nueva.';
  if (current === next) return 'La contraseña nueva debe ser distinta de la actual.';
  return '';
}

export function openChangeMasterPasswordModal() {
  /* Master password removed — DB unlocks automatically on this device. */
}

export function closeChangeMasterPasswordModal() {
  var overlay = document.getElementById('rpc-db-change-pass-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  setChangePassError('');
}

export async function submitChangeMasterPassword() {
  var electron = electronApi();
  if (!electron || typeof electron.dbChangePassphrase !== 'function') return;

  var form = readChangePassFormValues();
  var validationError = validateChangePassForm(form.current, form.next, form.confirm);
  if (validationError) {
    setChangePassError(validationError);
    return;
  }

  setChangePassError('');
  var submitBtn = document.getElementById('rpc-db-change-pass-submit');
  if (submitBtn) submitBtn.disabled = true;

  try {
    var res = await electron.dbChangePassphrase({
      currentPassphrase: form.current,
      newPassphrase: form.next,
      remember: form.remember,
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

export async function changeAdminAccessCode() {
  if (!window.electronAPI || typeof window.electronAPI.dbAdminAccessCodeSet !== 'function') {
    if (typeof window.showToast === 'function') {
      window.showToast('Solo disponible en la app de escritorio.', 'error');
    }
    return;
  }
  var current = prompt('Ingresa el código de administración actual:', '');
  if (current == null) return;
  var next = prompt('Ingresa el nuevo código (mínimo 6 caracteres):', '');
  if (next == null) return;
  var confirm = prompt('Confirma el nuevo código:', '');
  if (confirm == null) return;
  if (next !== confirm) {
    if (typeof window.showToast === 'function') window.showToast('Los códigos no coinciden.', 'error');
    return;
  }
  var res = await window.electronAPI.dbAdminAccessCodeSet(current, next);
  if (!res || res.ok === false) {
    if (typeof window.showToast === 'function') {
      window.showToast((res && res.error) || 'No se pudo cambiar el código.', 'error');
    }
    return;
  }
  if (typeof window.showToast === 'function') window.showToast('Código de administración actualizado.', 'success');
}

export function syncDbSecuritySectionUi() {
  var section = document.getElementById('settings-accordion-db-security');
  if (!section) return;
  var isAdmin = hasProgramAdminPrivileges(clinicalSessionContext.user);
  section.style.display = isAdmin ? '' : 'none';
  void import('./settings-help/settings-dropdown.mjs')
    .then(function (m) {
      if (typeof m.syncSettingsNavVisibility === 'function') m.syncSettingsNavVisibility();
    })
    .catch(function () {});
}
