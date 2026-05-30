/** URLs de unión LAN / móvil (sin DOM). */

const JOIN_TICKET_PATH_RE = /\/join\/(req_[a-f0-9]{12})\b/i;

/**
 * @param {string} hostUrl
 * @param {string} ticketId — p. ej. req_a1b2c3d4e5f6
 */
export function buildLanJoinUrls(hostUrl, ticketId) {
  const base = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  const id = encodeURIComponent(String(ticketId || '').trim());
  return {
    joinUrl: `${base}/join/${id}`,
    mobileUrl: `${base}/join/${id}`,
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

function hostFromUrl(u) {
  return `${u.protocol}//${u.host}`;
}

function emptyInviteParse() {
  return { hostUrl: '', teamCode: '', roomId: '', ticketId: '', legacyInvite: false };
}

/**
 * Parsea texto pegado: URL de ticket /join/req_…, URL legacy con ?code=, query suelta.
 * @param {string} raw
 * @returns {{ hostUrl: string, teamCode: string, roomId: string, ticketId: string, legacyInvite: boolean }}
 */
export function parseLanInviteInput(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    return emptyInviteParse();
  }

  const urlMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  if (urlMatch) {
    try {
      const u = new URL(urlMatch[0]);
      const hostUrl = hostFromUrl(u);
      const ticketM = u.pathname.match(JOIN_TICKET_PATH_RE);
      if (ticketM) {
        return { hostUrl, teamCode: '', roomId: '', ticketId: ticketM[1], legacyInvite: false };
      }
      const search = u.search || '';
      if (search.includes('code=') || search.includes('token=')) {
        const room = String(new URLSearchParams(search).get('room') || '').trim();
        return { hostUrl, teamCode: '', roomId: room, ticketId: '', legacyInvite: true };
      }
    } catch (_e) {
      /* fall through */
    }
  }

  const pathTicket = text.match(JOIN_TICKET_PATH_RE);
  if (pathTicket) {
    return { hostUrl: '', teamCode: '', roomId: '', ticketId: pathTicket[1], legacyInvite: false };
  }

  if (text.includes('code=') || text.includes('token=') || text.includes('room=')) {
    const q = text.includes('?') ? text.slice(text.indexOf('?')) : text.startsWith('?') ? text : `?${text}`;
    const parsed = parseLanJoinQuery(q, '');
    if (parsed.teamCode || parsed.roomId) {
      return {
        hostUrl: parsed.hostUrl,
        teamCode: '',
        roomId: parsed.roomId,
        ticketId: '',
        legacyInvite: true,
      };
    }
  }

  return emptyInviteParse();
}
