const WebSocket = require('ws');

function appendRelayPath(relayUrl, sessionId, token, deviceId) {
  const url = new URL(String(relayUrl || '').replace(/\/$/, '') + '/relay');
  url.searchParams.set('sessionId', sessionId);
  url.searchParams.set('token', token);
  url.searchParams.set('deviceId', deviceId);
  return url.toString();
}

function connectRelayPeer(opts) {
  const options = opts || {};
  const url = appendRelayPath(
    options.relayUrl,
    String(options.sessionId || ''),
    String(options.token || ''),
    String(options.deviceId || '')
  );
  const socket = new WebSocket(url);
  const listeners = [];
  let closed = false;

  return new Promise((resolve, reject) => {
    let settled = false;

    function cleanupOpeningListeners() {
      socket.off('open', onOpen);
      socket.off('error', onError);
      socket.off('unexpected-response', onUnexpectedResponse);
    }

    function fail(err) {
      if (settled) return;
      settled = true;
      cleanupOpeningListeners();
      reject(err);
    }

    function onOpen() {
      if (settled) return;
      settled = true;
      cleanupOpeningListeners();
      socket.on('message', (raw) => {
        const text = raw.toString();
        listeners.forEach((cb) => cb(text));
      });
      resolve({
        send(raw) {
          if (socket.readyState !== WebSocket.OPEN) return;
          socket.send(typeof raw === 'string' ? raw : JSON.stringify(raw));
        },
        onMessage(cb) {
          if (typeof cb === 'function') listeners.push(cb);
        },
        close() {
          if (closed || socket.readyState === WebSocket.CLOSED) {
            closed = true;
            return Promise.resolve();
          }
          closed = true;
          return new Promise((done) => {
            const timer = setTimeout(done, 150);
            if (timer.unref) timer.unref();
            socket.once('close', () => {
              clearTimeout(timer);
              done();
            });
            try {
              socket.close();
            } catch (_err) {
              clearTimeout(timer);
              done();
            }
          });
        },
      });
    }

    function onError(err) {
      fail(err);
    }

    function onUnexpectedResponse(_req, res) {
      fail(new Error(`Relay connection rejected (${res.statusCode})`));
    }

    socket.once('open', onOpen);
    socket.once('error', onError);
    socket.once('unexpected-response', onUnexpectedResponse);
  });
}

module.exports = { connectRelayPeer };
