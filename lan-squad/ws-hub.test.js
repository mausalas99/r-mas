'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const WebSocket = require('ws');
const { createHostStore } = require('./host-store.js');
const { attachWsHub, AUTH_TIMEOUT_MS } = require('./ws-hub.js');

function listen(httpServer) {
  return new Promise((resolve, reject) => {
    httpServer.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });
}

test('WebSocket requires auth frame; invalid token terminates', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-ws-auth-'));
  const filePath = path.join(dir, 'state.json');
  const token = 'b'.repeat(64);
  const store = createHostStore({ filePath, teamCodePlain: token });
  const httpServer = http.createServer();
  attachWsHub(httpServer, { getState: () => store.getState() });
  await listen(httpServer);
  const { port } = httpServer.address();
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/lan/v1/ws?channel=sync`);
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });
    ws.send(JSON.stringify({ type: 'auth', token: 'wrong-token' }));
    await new Promise((resolve) => {
      ws.on('close', resolve);
      setTimeout(resolve, AUTH_TIMEOUT_MS + 200);
    });
    assert.notStrictEqual(ws.readyState, WebSocket.OPEN);
  } finally {
    await new Promise((resolve) => httpServer.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('WebSocket joins channel after valid auth frame', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-ws-ok-'));
  const filePath = path.join(dir, 'state.json');
  const token = 'c'.repeat(64);
  const store = createHostStore({ filePath, teamCodePlain: token });
  const httpServer = http.createServer();
  attachWsHub(httpServer, { getState: () => store.getState() });
  await listen(httpServer);
  const { port } = httpServer.address();
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/lan/v1/ws?channel=live:room1`);
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });
    ws.send(JSON.stringify({ type: 'auth', token }));
    await new Promise((r) => setTimeout(r, 50));
    assert.strictEqual(ws.readyState, WebSocket.OPEN);
    const got = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), 2000);
      ws.on('message', (raw) => {
        clearTimeout(t);
        resolve(JSON.parse(String(raw)));
      });
      ws.send(JSON.stringify({ type: 'ping', n: 1 }));
    });
    assert.strictEqual(got.type, 'ping');
    assert.strictEqual(got.n, 1);
    ws.close();
  } finally {
    await new Promise((resolve) => httpServer.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
