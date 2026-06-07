/** URLs de unión LAN / móvil (sin DOM). */

import { CLINICAL_SALA_VALUES, clinicalSalaRoomSlug } from '../../lib/clinical-salas.mjs';

const JOIN_TICKET_PATH_RE = /\/join\/(req_[a-f0-9]{12})\b/i;

/** roomId usados en LiveSync (coinciden con ⇄ Salas de guardia). */
export const LIVE_SYNC_SALA_DEFS = CLINICAL_SALA_VALUES.map((key) => ({
  id: clinicalSalaRoomSlug(key),
  label: key,
  key,
}));

/**
 * @param {string} [salaOrRoom] — "Sala 1", sala-1, etc.
 * @returns {string} roomId o ''
 */
export function resolveLiveSyncRoomIdFromSala(salaOrRoom) {
  const raw = String(salaOrRoom || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
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
 * SHA-256 truncated to 8 hex chars — ward identity token for QR/mDNS/UDP.
 * @param {string} teamCode
 * @returns {Promise<string>}
 */
export async function buildTeamHash(teamCode) {
  const code = String(teamCode || '');
  if (!code) return '';
  try {
    const buf = new TextEncoder().encode(code);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 8);
  } catch (_e) {
    return '';
  }
}

/** @param {string} url @param {string} th */
function appendTeamHashToUrl(url, th) {
  if (!th) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}th=${encodeURIComponent(th)}`;
}

/**
 * @param {string} hostUrl
 * @param {string} ticketId — p. ej. req_a1b2c3d4e5f6
 * @param {string} [teamCode]
 */
export async function buildLanJoinUrls(hostUrl, ticketId, teamCode) {
  const base = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  const id = encodeURIComponent(String(ticketId || '').trim());
  const th = teamCode ? await buildTeamHash(String(teamCode).trim()) : '';
  const path = `${base}/join/${id}`;
  const withTh = appendTeamHashToUrl(path, th);
  return {
    joinUrl: withTh,
    mobileUrl: withTh,
  };
}

/**
 * Bookmarkable iPad URL (team token in query — no one-time /join ticket).
 * @param {string} hostUrl
 * @param {string} teamCode — LAN bearer / código del equipo
 */
export async function buildPermanentMobileJoinUrl(hostUrl, teamCode) {
  const base = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  const code = String(teamCode || '').trim();
  if (!base || !code) return '';
  const u = new URL(`${base}/mobile/`);
  u.searchParams.set('token', code);
  const th = await buildTeamHash(code);
  if (th) u.searchParams.set('th', th);
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

/** True when pasted text is a ⇄ sala /join link (not a clinical team invite code). */
export function isLanSalaInvitePaste(raw) {
  const text = String(raw || '').trim();
  if (!text) return false;
  if (/https?:\/\//i.test(text) && /\/join\//i.test(text)) return true;
  if (JOIN_TICKET_PATH_RE.test(text)) return true;
  const parsed = parseLanInviteInput(text);
  return !!(parsed.ticketId || (parsed.hostUrl && parsed.teamCode));
}
