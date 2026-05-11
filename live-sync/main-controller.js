const { app, ipcMain } = require('electron');
const os = require('os');
const { createSessionToken, createDeviceId, makeWireMessage, parseWireMessage } = require('./protocol');
const { startLanHost, connectLanPeer } = require('./lan-transport');
const { connectRelayPeer } = require('./relay-client');

function getDeviceName() {
  return os.hostname() || 'R+';
}

function parseRelayMessage(raw) {
  try {
    const parsed = JSON.parse(String(raw || ''));
    const wire = parseWireMessage(JSON.stringify(parsed));
    return wire.ok === false ? { kind: 'raw', payload: raw } : wire;
  } catch (_err) {
    return { kind: 'raw', payload: raw };
  }
}

function createLiveSyncController(opts) {
  const mainWindowRef = opts.mainWindowRef;
  let current = null;
  let pendingDeepLink = null;
  let ipcWired = false;

  function send(channel, payload) {
    const win = mainWindowRef();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  }

  function registerProtocol() {
    try {
      app.setAsDefaultProtocolClient('rplus');
    } catch (_err) {
      // Protocol registration can fail in some dev/sandboxed contexts.
    }
  }

  function handleDeepLink(url) {
    pendingDeepLink = url;
    send('live-sync-deep-link', { url });
  }

  async function startHost(_event, input) {
    await stopSession();
    const cfg = input || {};
    const sessionId = cfg.sessionId || (Date.now().toString(36) + Math.random().toString(36).slice(2));
    const token = createSessionToken();
    const deviceId = createDeviceId(cfg.deviceId);
    const host = await startLanHost({ token, preferredPort: cfg.preferredPort || 3741 });
    const relayUrl = String(cfg.relayUrl || '').trim();
    let relayPeer = null;

    try {
      if (relayUrl) {
        relayPeer = await connectRelayPeer({ relayUrl, sessionId, token, deviceId });
        relayPeer.onMessage((raw) => send('live-sync-message', parseRelayMessage(raw)));
      }
    } catch (err) {
      await host.close();
      throw err;
    }

    current = { role: 'host', sessionId, token, deviceId, host, relayPeer };
    host.onMessage((msg) => send('live-sync-message', msg));

    return {
      ok: true,
      role: 'host',
      sessionId,
      token,
      deviceId,
      deviceName: getDeviceName(),
      lanUrl: host.url,
      relayUrl,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  async function joinSession(_event, invite) {
    await stopSession();
    const cfg = invite || {};
    const deviceId = createDeviceId(cfg.deviceId);
    try {
      const peer = await connectLanPeer({ url: cfg.lanUrl, token: cfg.token, timeoutMs: 2500 });
      current = { role: 'peer', transport: 'lan', sessionId: cfg.sessionId, token: cfg.token, deviceId, peer };
      peer.onMessage((msg) => send('live-sync-message', msg));
      return { ok: true, transport: 'lan', deviceId };
    } catch (_lanErr) {
      if (!cfg.relayUrl) return { ok: false, error: 'lan-failed-no-relay' };
      const peer = await connectRelayPeer({
        relayUrl: cfg.relayUrl,
        sessionId: cfg.sessionId,
        token: cfg.token,
        deviceId,
      });
      current = { role: 'peer', transport: 'relay', sessionId: cfg.sessionId, token: cfg.token, deviceId, peer };
      peer.onMessage((raw) => send('live-sync-message', parseRelayMessage(raw)));
      return { ok: true, transport: 'relay', deviceId };
    }
  }

  async function sendMessage(_event, msg) {
    if (!current) return { ok: false, error: 'no-session' };
    if (current.host) current.host.broadcast(msg);
    if (current.relayPeer) current.relayPeer.send(makeWireMessage(msg));
    if (current.peer) {
      current.peer.send(current.transport === 'relay' ? makeWireMessage(msg) : msg);
    }
    return { ok: true };
  }

  async function stopSession() {
    const prev = current;
    current = null;
    if (prev && prev.host) await prev.host.close();
    if (prev && prev.relayPeer) await prev.relayPeer.close();
    if (prev && prev.peer) await prev.peer.close();
    return { ok: true };
  }

  function wireIpc() {
    if (ipcWired) return;
    ipcWired = true;
    ipcMain.handle('live-sync-start-host', startHost);
    ipcMain.handle('live-sync-join', joinSession);
    ipcMain.handle('live-sync-send', sendMessage);
    ipcMain.handle('live-sync-stop', stopSession);
    ipcMain.handle('live-sync-pending-link', () => ({ url: pendingDeepLink }));
  }

  return {
    registerProtocol,
    handleDeepLink,
    wireIpc,
    stopSession,
  };
}

module.exports = { createLiveSyncController };
