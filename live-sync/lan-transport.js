const os = require('os');
const WebSocket = require('ws');
const { parseWireMessage, makeWireMessage, isTokenAccepted } = require('./protocol');

function isIpv4Address(details) {
  return details && (details.family === 'IPv4' || details.family === 4);
}

function chooseLanHostAddress(interfaces) {
  const networkInterfaces = interfaces || os.networkInterfaces();
  for (const detailsList of Object.values(networkInterfaces)) {
    for (const details of detailsList || []) {
      if (isIpv4Address(details) && !details.internal && details.address) {
        return details.address;
      }
    }
  }
  return '127.0.0.1';
}

function withToken(rawUrl, token) {
  const url = new URL(String(rawUrl || ''));
  if (typeof token === 'string' && token !== '') {
    url.searchParams.set('token', token);
  }
  return url.toString();
}

function closeSocket(socket) {
  if (!socket || socket.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise((resolve) => {
    socket.once('close', () => resolve());
    try {
      socket.close();
    } catch (_err) {
      resolve();
    }
  });
}

function startLanHost(opts) {
  const token = opts && opts.token;
  const port = opts && opts.preferredPort != null ? opts.preferredPort : 3741;
  const hostAddress = opts && opts.hostAddress ? opts.hostAddress : chooseLanHostAddress();
  const listeners = [];
  const server = new WebSocket.Server({
    port,
    verifyClient(info, done) {
      const url = new URL(info.req.url || '/', 'ws://localhost');
      if (isTokenAccepted(token, url.searchParams.get('token'))) {
        done(true);
        return;
      }
      done(false, 401, 'bad-token');
    },
  });
  let closed = false;

  server.on('connection', (socket) => {
    socket.on('message', (raw) => {
      const parsed = parseWireMessage(raw.toString());
      if (parsed.ok === false) return;
      listeners.forEach((cb) => cb(parsed, socket));
    });
  });

  return new Promise((resolve, reject) => {
    function onError(err) {
      reject(err);
    }

    server.once('error', onError);
    server.once('listening', () => {
      server.off('error', onError);
      const address = server.address();
      const url = `ws://${hostAddress}:${address.port}/sync?token=${encodeURIComponent(token)}`;

      resolve({
        url,
        onMessage(cb) {
          listeners.push(cb);
        },
        broadcast(msg) {
          const wire = JSON.stringify(makeWireMessage(msg));
          server.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) client.send(wire);
          });
        },
        close() {
          if (closed) return Promise.resolve();
          closed = true;
          server.clients.forEach((client) => {
            try {
              client.close();
            } catch (_err) {}
          });
          return new Promise((done) => {
            server.close(() => done());
          });
        },
      });
    });
  });
}

function connectLanPeer(opts) {
  const url = withToken(opts && opts.url, opts && opts.token);
  const timeoutMs = opts && opts.timeoutMs ? opts.timeoutMs : 3000;
  const listeners = [];
  const socket = new WebSocket(url);
  let timer;
  let settled = false;
  let closed = false;

  return new Promise((resolve, reject) => {
    function fail(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    }

    timer = setTimeout(() => {
      try {
        socket.close();
      } catch (_err) {}
      fail(new Error('LAN connection timed out'));
    }, timeoutMs);

    socket.once('open', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.on('message', (raw) => {
        const parsed = parseWireMessage(raw.toString());
        if (parsed.ok === false) return;
        listeners.forEach((cb) => cb(parsed));
      });
      resolve({
        send(msg) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(makeWireMessage(msg)));
          }
        },
        onMessage(cb) {
          listeners.push(cb);
        },
        close() {
          if (closed) return Promise.resolve();
          closed = true;
          return closeSocket(socket);
        },
      });
    });

    socket.once('error', fail);
    socket.once('unexpected-response', (_req, res) => {
      if (res && typeof res.resume === 'function') res.resume();
      fail(new Error(`LAN connection rejected: ${res ? res.statusCode : 'unexpected response'}`));
    });
  });
}

module.exports = { startLanHost, connectLanPeer, chooseLanHostAddress };
