const http = require('http');
const WebSocket = require('ws');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function closeClient(client) {
  return new Promise((resolve) => {
    if (!client || client.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, 150);
    if (timer.unref) timer.unref();
    client.once('close', () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      client.close();
    } catch (_err) {
      clearTimeout(timer);
      resolve();
    }
  });
}

function startRelayServer(opts) {
  const options = opts || {};
  const port = options.port == null ? Number(process.env.PORT || 3740) : options.port;
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, app: 'r-plus-live-sync-relay' }));
  });
  const wss = new WebSocket.Server({ noServer: true });
  const rooms = new Map();
  let closed = false;

  function rejectUpgrade(socket) {
    try {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    } catch (_err) {
      // Ignore socket write failures while rejecting malformed upgrades.
    }
    socket.destroy();
  }

  server.on('upgrade', (req, socket, head) => {
    let url;
    try {
      url = new URL(req.url || '/', 'http://localhost');
    } catch (_err) {
      rejectUpgrade(socket);
      return;
    }

    if (url.pathname !== '/relay') {
      rejectUpgrade(socket);
      return;
    }

    const sessionId = String(url.searchParams.get('sessionId') || '').trim();
    const token = String(url.searchParams.get('token') || '').trim();
    const deviceId = String(url.searchParams.get('deviceId') || '').trim();
    if (!isNonEmptyString(sessionId) || !isNonEmptyString(token) || !isNonEmptyString(deviceId)) {
      rejectUpgrade(socket);
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.sessionId = sessionId;
      ws.token = token;
      ws.deviceId = deviceId;
      wss.emit('connection', ws);
    });
  });

  wss.on('connection', (ws) => {
    const key = `${ws.sessionId}:${ws.token}`;
    if (!rooms.has(key)) rooms.set(key, new Set());
    const room = rooms.get(key);
    room.add(ws);

    ws.on('message', (raw) => {
      const payload = raw.toString();
      room.forEach((peer) => {
        if (peer !== ws && peer.readyState === WebSocket.OPEN) {
          peer.send(payload);
        }
      });
    });

    ws.on('close', () => {
      room.delete(ws);
      if (room.size === 0) rooms.delete(key);
    });
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      const address = server.address();
      resolve({
        url: `ws://127.0.0.1:${address.port}`,
        close() {
          if (closed) return Promise.resolve();
          closed = true;
          const clients = Array.from(wss.clients || []);
          return Promise.all(clients.map(closeClient)).then(() => new Promise((done) => {
            wss.close(() => {
              server.close(() => done());
            });
          }));
        },
      });
    });
  });
}

if (require.main === module) {
  startRelayServer({}).then((relay) => {
    console.log(`R+ live sync relay -> ${relay.url}`);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { startRelayServer };
