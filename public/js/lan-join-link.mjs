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
  const code = String(params.get('code') || params.get('token') || '').trim();
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

/**
 * Parsea texto pegado: URL completa, query suelta o bloque con enlace embebido.
 * @param {string} raw
 * @returns {{ hostUrl: string, teamCode: string, roomId: string }}
 */
export function parseLanInviteInput(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    return { hostUrl: '', teamCode: '', roomId: '' };
  }

  const urlMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  if (urlMatch) {
    try {
      const u = new URL(urlMatch[0]);
      const parsed = parseLanJoinQuery(u.search, u.origin);
      if (parsed.teamCode) {
        return parsed;
      }
    } catch (_e) {
      /* fall through */
    }
  }

  if (text.includes('code=') || text.includes('token=') || text.includes('room=')) {
    const q = text.includes('?') ? text.slice(text.indexOf('?')) : text.startsWith('?') ? text : `?${text}`;
    const parsed = parseLanJoinQuery(q, '');
    if (parsed.teamCode) {
      return parsed;
    }
  }

  return { hostUrl: '', teamCode: '', roomId: '' };
}
