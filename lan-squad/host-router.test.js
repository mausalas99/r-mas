'use strict';
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { test } = require('node:test');
const { createHostStore } = require('./host-store.js');
const { createLanRouter } = require('./host-router.js');

function bearerHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

test('LAN /ping requiere Authorization Bearer válido', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-ping-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  const app = express();
  app.use('/api/lan/v1', createLanRouter({ store, broadcast: () => {} }));
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });
  try {
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}/api/lan/v1/ping`;
    const bad = await fetch(base);
    assert.strictEqual(bad.status, 401);
    const withQuery = await fetch(`${base}?code=${encodeURIComponent(code)}`);
    assert.strictEqual(withQuery.status, 401);
    const ok = await fetch(base, { headers: bearerHeaders(code) });
    assert.strictEqual(ok.status, 200);
    const body = await ok.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.lan, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('LAN GET /rooms con código válido', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-rooms-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  store.createRoom('Sala prueba');
  const app = express();
  app.use('/api/lan/v1', createLanRouter({ store, broadcast: () => {} }));
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });
  try {
    const { port } = server.address();
    const base = `http://127.0.0.1:${port}/api/lan/v1/rooms`;
    const res = await fetch(base, { headers: bearerHeaders(code) });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.rooms));
    assert.strictEqual(body.rooms.length, 1);
    assert.strictEqual(body.rooms[0].displayName, 'Sala prueba');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
