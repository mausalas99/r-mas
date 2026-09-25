/** Retired LAN join-link helpers — cloud mobile uses Nube URLs. */
export function isLanSalaInvitePaste(text) {
  const t = String(text || '').trim();
  return /\/join\//i.test(t) || /[?&]code=/i.test(t);
}

export function parseLanJoinQuery() {
  return { hostUrl: '', teamCode: '', roomId: '' };
}

export function liveSyncRoomLabel(roomId) {
  return String(roomId || '').trim();
}

export function resolveLiveSyncRoomIdFromSala() {
  return '';
}
