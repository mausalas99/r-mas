/** Legacy mobile LAN query persistence — cloud mobile uses Nube session. */
export function isMobileWebModePersisted() {
  try {
    return localStorage.getItem('rpc-mobile-web-mode') === '1';
  } catch {
    return false;
  }
}

export function persistMobilePairingFromSearch() {}

export function restoreMobilePairingFromStorage() {}

export function resolveStoredMobileRoomId() {
  return '';
}
