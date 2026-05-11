function getParam(url, name) {
  return (url.searchParams.get(name) || '').trim();
}

function isValidEndpoint(value) {
  if (!value) return true;
  var endpoint;
  try {
    endpoint = new URL(value);
  } catch (_err) {
    return false;
  }
  return (endpoint.protocol === 'ws:' || endpoint.protocol === 'wss:') && !!endpoint.hostname;
}

export function buildLiveSyncInviteLink(input) {
  var i = input || {};
  var url = new URL('rplus://sync/join');
  url.searchParams.set('sessionId', i.sessionId || '');
  url.searchParams.set('token', i.token || '');
  url.searchParams.set('lanUrl', i.lanUrl || '');
  url.searchParams.set('relayUrl', i.relayUrl || '');
  url.searchParams.set('expiresAt', i.expiresAt || '');
  url.searchParams.set('hostDeviceName', i.hostDeviceName || '');
  return url.toString();
}

export function parseLiveSyncInviteLink(raw, opts) {
  var url;
  try {
    url = new URL(String(raw || ''));
  } catch (_err) {
    return { ok: false, error: 'invalid-link' };
  }
  if (
    url.protocol !== 'rplus:' ||
    url.hostname.toLowerCase() !== 'sync' ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== '/join'
  ) {
    return { ok: false, error: 'invalid-link' };
  }
  var token = getParam(url, 'token');
  if (!token) return { ok: false, error: 'missing-token' };
  var sessionId = getParam(url, 'sessionId');
  if (!sessionId) return { ok: false, error: 'missing-session' };
  var lanUrl = getParam(url, 'lanUrl');
  var relayUrl = getParam(url, 'relayUrl');
  if (!lanUrl && !relayUrl) return { ok: false, error: 'missing-endpoint' };
  if (!isValidEndpoint(lanUrl) || !isValidEndpoint(relayUrl)) {
    return { ok: false, error: 'invalid-endpoint' };
  }
  var expiresAt = getParam(url, 'expiresAt');
  if (!expiresAt) return { ok: false, error: 'missing-expiry' };
  var nowMs = Date.parse((opts && opts.now) || new Date().toISOString());
  var expMs = Date.parse(expiresAt);
  if (!Number.isFinite(expMs)) return { ok: false, error: 'invalid-expiry' };
  if (Number.isFinite(nowMs) && expMs <= nowMs) return { ok: false, error: 'expired' };
  return {
    ok: true,
    invite: {
      sessionId: sessionId,
      token: token,
      lanUrl: lanUrl,
      relayUrl: relayUrl,
      expiresAt: expiresAt,
      hostDeviceName: getParam(url, 'hostDeviceName'),
    },
  };
}
