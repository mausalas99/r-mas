/** URLs de unión LAN / móvil (sin DOM). */

/**
 * @param {string} hostUrl
 * @param {string} teamCode
 * @param {string} [roomId]
 */
export function buildLanJoinUrls(hostUrl, teamCode, roomId) {
  const base = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  const code = encodeURIComponent(String(teamCode || '').trim());
  const room = String(roomId || '').trim();
  const q = `code=${code}` + (room ? `&room=${encodeURIComponent(room)}` : '');
  return {
    joinUrl: `${base}/join?${q}`,
    mobileUrl: `${base}/mobile/?${q}`,
  };
}

/**
 * @param {string} [search] — location.search
 * @param {string} [origin] — location.origin
 */
export function parseLanJoinQuery(search, origin) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const code = String(params.get('code') || '').trim();
  const room = String(params.get('room') || '').trim();
  let hostUrl = String(params.get('host') || '').trim().replace(/\/+$/, '');
  if (!hostUrl && origin) {
    try {
      const u = new URL(origin);
      hostUrl = `${u.protocol}//${u.host}`;
    } catch (_e) {
      hostUrl = '';
    }
  }
  return { hostUrl, teamCode: code, roomId: room };
}
