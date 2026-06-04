/** URLs de unión LAN / móvil (sin DOM). */

const JOIN_TICKET_PATH_RE = /\/join\/(req_[a-f0-9]{12})\b/i;

/** roomId usados en LiveSync (coinciden con ⇄ Salas de guardia). */
export const LIVE_SYNC_SALA_DEFS = [
  { id: 'sala-1', label: 'Sala 1', key: 'Sala 1' },
  { id: 'sala-2', label: 'Sala 2', key: 'Sala 2' },
  { id: 'sala-e', label: 'Sala E', key: 'Sala E' },
];

/**
 * @param {string} [salaOrRoom] — "Sala 1", sala-1, etc.
 * @returns {string} roomId o ''
 */
export function resolveLiveSyncRoomIdFromSala(salaOrRoom) {
  const raw = String(salaOrRoom || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (/^sala-[12e]$/i.test(lower)) return lower;
  const hit = LIVE_SYNC_SALA_DEFS.find(
    (d) => d.id === lower || d.key === raw || d.label === raw
  );
  return hit ? hit.id : '';
}

/** @param {string} roomId */
export function liveSyncRoomLabel(roomId) {
  const id = String(roomId || '').trim();
  const hit = LIVE_SYNC_SALA_DEFS.find((d) => d.id === id);
  return hit ? hit.label : id;
}

/** Prefer page origin when server/config points at localhost (iPad cannot reach loopback). */
export function resolveLanJoinHostUrl(fromServer, pageOrigin) {
  try {
    const u = new URL(String(fromServer || '').trim());
    if (u.hostname && !/^(localhost|127\.0\.0\.1)$/i.test(u.hostname)) {
      return `${u.protocol}//${u.host}`;
    }
  } catch (_e) {
    /* fall through */
  }
  const origin = String(pageOrigin || '').trim();
  if (origin) {
    try {
      const o = new URL(origin);
      if (o.hostname && !/^(localhost|127\.0\.0\.1)$/i.test(o.hostname)) {
        return `${o.protocol}//${o.host}`;
      }
    } catch (_e2) {
      /* ignore */
    }
  }
  return '';
}

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
 * Bookmarkable iPad URL (team token in query — no one-time /join ticket).
 * @param {string} hostUrl
 * @param {string} teamCode — LAN bearer / código del equipo
 */
export function buildPermanentMobileJoinUrl(hostUrl, teamCode) {
  const base = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  const code = String(teamCode || '').trim();
  if (!base || !code) return '';
  const u = new URL(`${base}/mobile/`);
  u.searchParams.set('token', code);
  return u.toString();
}

/**
 * @param {string} [search] — location.search
 * @param {string} [origin] — location.origin
 */
export function parseLanJoinQuery(search, origin) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const code = String(params.get('code') || params.get('token') || '').trim();
  const roomParam = String(params.get('room') || '').trim();
  const salaParam = String(params.get('sala') || '').trim();
  const roomId =
    resolveLiveSyncRoomIdFromSala(roomParam) ||
    resolveLiveSyncRoomIdFromSala(salaParam) ||
    roomParam;
  const hostParam = String(params.get('host') || '').trim().replace(/\/+$/, '');
  let hostUrl = resolveLanJoinHostUrl(hostParam, origin);
  if (!hostUrl && hostParam) hostUrl = hostParam;
  return { hostUrl, teamCode: code, roomId, sala: salaParam };
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
      if (/\/mobile\/?$/i.test(u.pathname)) {
        const mobileParsed = parseLanJoinQuery(search, hostUrl);
        if (mobileParsed.teamCode) {
          return {
            hostUrl,
            teamCode: mobileParsed.teamCode,
            roomId: mobileParsed.roomId,
            ticketId: '',
            legacyInvite: false,
          };
        }
      }
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
