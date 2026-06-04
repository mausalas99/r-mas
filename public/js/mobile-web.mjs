/** R+ Móvil: misma UI que escritorio en navegador (Safari/iPad), sin exportación Word. */

import { isMobileWebModePersisted } from './mobile-lan-query-persist.mjs';

function mobileRuntimeGlobal() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof window !== 'undefined') return window;
  return null;
}

export function isMobileWeb() {
  var g = mobileRuntimeGlobal();
  if (!g) return false;
  return !!(
    g.__RPC_MOBILE_WEB__ ||
    (typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.classList.contains('rpc-mobile-web')) ||
    isMobileWebModePersisted()
  );
}

export function activateMobileWebRoot() {
  if (typeof document === 'undefined') return;
  var g = mobileRuntimeGlobal();
  if (g) g.__RPC_MOBILE_WEB__ = true;
  document.documentElement.classList.add('rpc-mobile-web');
}

/** @returns {boolean} true si se bloqueó la acción */
export function blockIfMobileDocExport() {
  if (!isMobileWeb()) return false;
  return true;
}

export function mobileDocExportToast(showToastFn) {
  if (typeof showToastFn === 'function') {
    showToastFn(
      'En R+ Móvil no se generan documentos (.docx). Usa la app de escritorio para Word y salida rápida.',
      'error'
    );
  }
}

/** Oculta chrome de escritorio (censo, perfil, ajustes, pestaña Salida). */
export function syncMobileBarebonesChrome() {
  if (!isMobileWeb() || typeof document === 'undefined') return;
  var hideIds = [
    'btn-export-censo-header',
    'profile-toggle-btn',
    'btn-open-settings',
    'itab-salida',
    'sidebar-censo-export-wrap',
  ];
  hideIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  var salidaBar = document.getElementById('exp-segment-salida');
  if (salidaBar) salidaBar.style.display = 'none';
  var brand = document.getElementById('app-brand');
  if (brand) {
    brand.removeAttribute('onclick');
    brand.removeAttribute('onkeydown');
    brand.removeAttribute('role');
    brand.removeAttribute('tabindex');
    brand.title = 'R+ Móvil';
    brand.setAttribute('aria-label', 'R+ Móvil');
  }
  closeSettingsDropdownIfPresent();
  closeProfileModalIfPresent();
}

function closeSettingsDropdownIfPresent() {
  var dd = document.getElementById('settings-dropdown');
  var bg = document.getElementById('settings-dropdown-backdrop');
  if (dd) dd.classList.remove('open');
  if (bg) bg.classList.remove('open');
}

function closeProfileModalIfPresent() {
  var modal = document.getElementById('profile-modal');
  if (modal) modal.classList.remove('open');
}
