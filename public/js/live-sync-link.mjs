function getParam(url, name) {
  return url.searchParams.get(name) || '';
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
  if (url.protocol !== 'rplus:' || url.hostname !== 'sync' || url.pathname !== '/join') {
    return { ok: false, error: 'invalid-link' };
  }
  var token = getParam(url, 'token');
  if (!token) return { ok: false, error: 'missing-token' };
  var expiresAt = getParam(url, 'expiresAt');
  if (!expiresAt) return { ok: false, error: 'missing-expiry' };
  var nowMs = Date.parse((opts && opts.now) || new Date().toISOString());
  var expMs = Date.parse(expiresAt);
  if (!Number.isFinite(expMs)) return { ok: false, error: 'invalid-expiry' };
  if (Number.isFinite(nowMs) && expMs <= nowMs) return { ok: false, error: 'expired' };
  return {
    ok: true,
    invite: {
      sessionId: getParam(url, 'sessionId'),
      token: token,
      lanUrl: getParam(url, 'lanUrl'),
      relayUrl: getParam(url, 'relayUrl'),
      expiresAt: expiresAt,
      hostDeviceName: getParam(url, 'hostDeviceName'),
    },
  };
}
