const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const WebSocket = require('ws');
const { startRelayServer } = require('./live-sync-relay');
const { connectRelayPeer } = require('../live-sync/relay-client');

function connect(url) {
  const ws = new WebSocket(url);
  return new Promise((resolve, reject) => {
    function cleanup() {
      ws.off('open', onOpen);
      ws.off('error', onError);
    }
    function onOpen() {
      cleanup();
      resolve(ws);
    }
    function onError(err) {
      cleanup();
      reject(err);
    }
    ws.once('open', onOpen);
    ws.once('error', onError);
  });
}

function withTimeout(promise, label, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs || 500);
    if (timer.unref) timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForRawMessage(ws) {
  return withTimeout(new Promise((resolve) => {
    ws.once('message', (raw) => resolve(raw.toString()));
  }), 'message');
}

function closeSocket(ws) {
  if (!ws || ws.readyState === WebSocket.CLOSED) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 100);
    if (timer.unref) timer.unref();
    ws.once('close', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.close();
  });
}

function getJson(wsUrl) {
  const httpUrl = wsUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:');
  return new Promise((resolve, reject) => {
    http.get(httpUrl, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
      });
    }).once('error', reject);
  });
}

function expectRejectedConnect(url) {
  const ws = new WebSocket(url);
  return withTimeout(new Promise((resolve, reject) => {
    let settled = false;
    function done(err) {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
    }
    ws.once('open', () => {
      ws.close();
      done(new Error('connection unexpectedly opened'));
    });
    ws.once('error', () => done());
    ws.once('close', () => done());
  }), 'rejected connection');
}

test('relay serves health response and closes idempotently', async () => {
  const relay = await startRelayServer({ port: 0 });
  try {
    const res = await getJson(relay.url);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ok: true, app: 'r-plus-live-sync-relay' });
  } finally {
    await relay.close();
    await relay.close();
  }
});

test('relay forwards opaque message to peer in same session', async () => {
  const relay = await startRelayServer({ port: 0 });
  const sockets = [];
  try {
    const a = await connect(`${relay.url}/relay?sessionId=s1&token=tok&deviceId=a`);
    const b = await connect(`${relay.url}/relay?sessionId=s1&token=tok&deviceId=b`);
    sockets.push(a, b);

    const got = new Promise((resolve) => {
      b.once('message', (raw) => resolve(JSON.parse(raw.toString())));
    });

    a.send(JSON.stringify({ encrypted: true, ciphertext: 'abc' }));
    const msg = await withTimeout(got, 'relay forward');

    assert.equal(msg.encrypted, true);
    assert.equal(msg.ciphertext, 'abc');
  } finally {
    await Promise.all(sockets.map(closeSocket));
    await relay.close();
  }
});

test('relay does not echo sender or leak across rooms', async () => {
  const relay = await startRelayServer({ port: 0 });
  const sockets = [];
  try {
    const a = await connect(`${relay.url}/relay?sessionId=s1&token=tok&deviceId=a`);
    const b = await connect(`${relay.url}/relay?sessionId=s1&token=tok&deviceId=b`);
    const outsider = await connect(`${relay.url}/relay?sessionId=s1&token=other&deviceId=c`);
    sockets.push(a, b, outsider);

    let echoed = false;
    let leaked = false;
    a.once('message', () => {
      echoed = true;
    });
    outsider.once('message', () => {
      leaked = true;
    });

    const got = waitForRawMessage(b);
    a.send('opaque-clinical-payload');

    assert.equal(await got, 'opaque-clinical-payload');
    await wait(50);
    assert.equal(echoed, false);
    assert.equal(leaked, false);
  } finally {
    await Promise.all(sockets.map(closeSocket));
    await relay.close();
  }
});

test('relay rejects non-relay paths and missing auth fields', async () => {
  const relay = await startRelayServer({ port: 0 });
  try {
    await expectRejectedConnect(`${relay.url}/not-relay?sessionId=s1&token=tok&deviceId=a`);
    await expectRejectedConnect(`${relay.url}/relay?sessionId=s1&token=tok`);
    await expectRejectedConnect(`${relay.url}/relay?sessionId=s1&deviceId=a`);
    await expectRejectedConnect(`${relay.url}/relay?token=tok&deviceId=a`);
  } finally {
    await relay.close();
  }
});

test('relay client sends raw strings and stringifies objects', async () => {
  const relay = await startRelayServer({ port: 0 });
  let a;
  let b;
  try {
    a = await connectRelayPeer({
      relayUrl: relay.url,
      sessionId: 's-client',
      token: 'tok',
      deviceId: 'a',
    });
    b = await connectRelayPeer({
      relayUrl: relay.url,
      sessionId: 's-client',
      token: 'tok',
      deviceId: 'b',
    });

    const objectMessage = withTimeout(new Promise((resolve) => {
      b.onMessage(resolve);
    }), 'client object message');
    a.send({ encrypted: true, ciphertext: 'client' });
    assert.deepEqual(JSON.parse(await objectMessage), { encrypted: true, ciphertext: 'client' });

    const rawMessage = withTimeout(new Promise((resolve) => {
      b.onMessage(resolve);
    }), 'client raw message');
    a.send('already-serialized');
    assert.equal(await rawMessage, 'already-serialized');
  } finally {
    if (a) {
      await a.close();
      await a.close();
    }
    if (b) await b.close();
    await relay.close();
  }
});
