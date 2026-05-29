/** Failover de anfitrión LAN: suplente en escritorio y reconexión entre pares. */

const PEERS_KEY = 'rpc-lan-live-peers';
const SURROGATE_KEY = 'rpc-lan-surrogate-host';
const PRIMARY_HOST_KEY = 'rpc-lan-primary-host-url';
const PEER_TTL_MS = 5 * 60 * 1000;

export function rememberPrimaryHostUrl(hostUrl) {
  const url = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (!url) return;
  try {
    localStorage.setItem(PRIMARY_HOST_KEY, url);
  } catch (_e) {}
}

export function getPrimaryHostUrl() {
  try {
    return String(localStorage.getItem(PRIMARY_HOST_KEY) || '')
      .trim()
      .replace(/\/+$/, '');
  } catch (_e) {
    return '';
  }
}

function readPeersRaw() {
  try {
    const raw = localStorage.getItem(PEERS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch (_e) {
    return {};
  }
}

function writePeersRaw(map) {
  try {
    localStorage.setItem(PEERS_KEY, JSON.stringify(map || {}));
  } catch (_e) {}
}

export function pruneLivePeers(nowMs) {
  const now = nowMs != null ? nowMs : Date.now();
  const map = readPeersRaw();
  let changed = false;
  Object.keys(map).forEach((id) => {
    const row = map[id];
    if (!row || now - Number(row.seenAt || 0) > PEER_TTL_MS) {
      delete map[id];
      changed = true;
    }
  });
  if (changed) writePeersRaw(map);
  return map;
}

/** Registra hostUrl de un par a partir de livesync:hello / host-handoff. */
export function recordLivePeer(clientId, meta) {
  const id = String(clientId || '').trim();
  const hostUrl = String(meta && meta.hostUrl ? meta.hostUrl : '')
    .trim()
    .replace(/\/+$/, '');
  if (!id || !hostUrl) return;
  const map = pruneLivePeers();
  map[id] = {
    hostUrl,
    canHost: !!(meta && meta.canHost),
    seenAt: Date.now(),
    clientId: id,
  };
  writePeersRaw(map);
}

export function listLivePeerHostUrls(excludeClientId) {
  const skip = String(excludeClientId || '').trim();
  const map = pruneLivePeers();
  const urls = [];
  const seen = new Set();
  Object.keys(map).forEach((id) => {
    if (id === skip) return;
    const row = map[id];
    if (!row || !row.canHost || !row.hostUrl) return;
    if (seen.has(row.hostUrl)) return;
    seen.add(row.hostUrl);
    urls.push(row.hostUrl);
  });
  urls.sort();
  return urls;
}

/** Retraso determinista para evitar que dos Mac promuevan a la vez. */
export function surrogateElectionDelayMs(clientId) {
  const s = String(clientId || 'lc');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 400 + (h % 2400);
}

export async function pingLanHostUrl(hostUrl, teamCode) {
  const url = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (!url) return false;
  const code = String(teamCode || '').trim();
  try {
    const r = await fetch(`${url}/api/lan/v1/ping`, {
      method: 'GET',
      headers: { 'X-Lan-Team-Code': code },
    });
    return !!(r && r.ok);
  } catch (_e) {
    return false;
  }
}

export function getSurrogateHostState() {
  try {
    const raw = localStorage.getItem(SURROGATE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !String(o.formerHostUrl || '').trim()) return null;
    return {
      formerHostUrl: String(o.formerHostUrl).trim().replace(/\/+$/, ''),
      formerTeamCode: String(o.formerTeamCode || '').trim(),
      localHostUrl: String(o.localHostUrl || '').trim().replace(/\/+$/, ''),
      promotedAt: String(o.promotedAt || ''),
      roomId: String(o.roomId || '').trim(),
    };
  } catch (_e) {
    return null;
  }
}

export function setSurrogateHostState(state) {
  if (!state || !state.formerHostUrl) {
    clearSurrogateHostState();
    return;
  }
  try {
    localStorage.setItem(
      SURROGATE_KEY,
      JSON.stringify({
        formerHostUrl: String(state.formerHostUrl).trim().replace(/\/+$/, ''),
        formerTeamCode: String(state.formerTeamCode || '').trim(),
        localHostUrl: String(state.localHostUrl || '').trim().replace(/\/+$/, ''),
        promotedAt: state.promotedAt || new Date().toISOString(),
        roomId: String(state.roomId || '').trim(),
      })
    );
  } catch (_e) {}
}

export function clearSurrogateHostState() {
  try {
    localStorage.removeItem(SURROGATE_KEY);
  } catch (_e) {}
}

export function isSurrogateHostActive() {
  return !!getSurrogateHostState();
}
