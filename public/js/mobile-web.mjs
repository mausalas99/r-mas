/** R+ Móvil: misma UI que escritorio en navegador (Safari/iPad), sin exportación Word. */

export function isMobileWeb() {
  if (typeof window === 'undefined') return false;
  return !!(
    window.__RPC_MOBILE_WEB__ ||
    (document.documentElement && document.documentElement.classList.contains('rpc-mobile-web'))
  );
}

export function activateMobileWebRoot() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.__RPC_MOBILE_WEB__ = true;
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
