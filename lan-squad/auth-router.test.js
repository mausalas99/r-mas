'use strict';

const assert = require('node:assert');
const http = require('node:http');
const express = require('express');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { test } = require('node:test');
const { createHostStore } = require('./host-store.js');
const { createTicketStore } = require('./ticket-store.js');
const { createAuthRouter } = require('./auth-router.js');
const { createWardHostRegistry } = require('./ward-host-registry.js');

function createTestApp({ hostToken, hostUrl, requiresMigrationNotice = false }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-auth-'));
  const statePath = path.join(dir, 'state.json');
  const wardPath = path.join(dir, 'lan-ward-host-registry.json');
  const store = createHostStore({ filePath: statePath, teamCodePlain: hostToken });
  const ticketStore = createTicketStore({ getHostToken: () => hostToken });
  const { createShiftPinStore } = require('./shift-pin-store.js');
  const shiftPinStore = createShiftPinStore({ getHostToken: () => hostToken });
  const wardHostRegistry = createWardHostRegistry({ filePath: wardPath });
  wardHostRegistry.recordUrl(hostUrl, { source: 'host' });
  wardHostRegistry.recordPrefix('10.0.57');
  const app = express();
  app.use(
    '/api/lan/v1',
    createAuthRouter({
      ticketStore,
      shiftPinStore,
      wardHostRegistry,
      getHostToken: () => hostToken,
      getHostUrl: () => hostUrl,
      getRequiresMigrationNotice: () => requiresMigrationNotice,
    })
  );
  return { app, dir, store, ticketStore, shiftPinStore, wardHostRegistry };
}

async function listen(app) {
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}/api/lan/v1` };
}

test('POST /auth/exchange returns bearer and burns ticket', async () => {
  const hostToken = 'a'.repeat(64);
  const hostUrl = 'http://192.168.1.5:3738';
  const { app, dir } = createTestApp({ hostToken, hostUrl });
  const { server, base } = await listen(app);
  try {
    const mintRes = await fetch(`${base}/auth/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert.strictEqual(mintRes.status, 200);
    const mintBody = await mintRes.json();
    assert.ok(mintBody.ticketId.startsWith('req_'));
    assert.ok(/^\d{6}$/.test(mintBody.pin));
    assert.strictEqual(mintBody.joinUrl, `${hostUrl}/join/${mintBody.ticketId}`);

    const ex = await fetch(`${base}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: mintBody.ticketId }),
    });
    assert.strictEqual(ex.status, 200);
    const body = await ex.json();
    assert.strictEqual(body.token, hostToken);
    assert.strictEqual(body.hostUrl, hostUrl);
    assert.strictEqual(body.persist, true);
    assert.strictEqual(body.storageTarget, 'userData');

    const again = await fetch(`${base}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: mintBody.ticketId }),
    });
    assert.strictEqual(again.status, 401);
    const againBody = await again.json();
    assert.strictEqual(againBody.error, 'invalid_ticket');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('POST /auth/tickets requires Bearer', async () => {
  const hostToken = 'b'.repeat(64);
  const { app, dir } = createTestApp({ hostToken, hostUrl: 'http://127.0.0.1:3738' });
  const { server, base } = await listen(app);
  try {
    const bad = await fetch(`${base}/auth/tickets`, { method: 'POST' });
    assert.strictEqual(bad.status, 401);

    const ok = await fetch(`${base}/auth/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert.strictEqual(ok.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('POST /auth/exchange by pin', async () => {
  const hostToken = 'c'.repeat(64);
  const { app, dir } = createTestApp({ hostToken, hostUrl: 'http://10.0.0.1:3738' });
  const { server, base } = await listen(app);
  try {
    const mintRes = await fetch(`${base}/auth/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    const { pin } = await mintRes.json();

    const ex = await fetch(`${base}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    assert.strictEqual(ex.status, 200);
    const body = await ex.json();
    assert.strictEqual(body.token, hostToken);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('POST /auth/exchange rejects ambiguous or missing credentials', async () => {
  const hostToken = 'd'.repeat(64);
  const { app, dir } = createTestApp({ hostToken, hostUrl: 'http://127.0.0.1:3738' });
  const { server, base } = await listen(app);
  try {
    const ambiguous = await fetch(`${base}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: 'req_abc', pin: '123456' }),
    });
    assert.strictEqual(ambiguous.status, 400);
    assert.strictEqual((await ambiguous.json()).error, 'ambiguous_credentials');

    const missing = await fetch(`${base}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(missing.status, 400);
    assert.strictEqual((await missing.json()).error, 'missing_credentials');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('auth routes emit forensic audit events when dbManager is unlocked', async () => {
  const { createUnlockedDbManager } = await import('../lib/db/test-open-db.mjs');
  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-auth-audit-'));
  const hostToken = 'f'.repeat(64);
  const hostUrl = 'http://127.0.0.1:3738';
  const auditEvents = [];
  const mgr = await createUnlockedDbManager(dbDir, () => 'lan-auth-audit');
  const { setLanDbManager, resetLanDbManagerForTests } = require('../lib/db/lan-db-bridge.cjs');
  resetLanDbManagerForTests();
  setLanDbManager({
    isUnlocked: () => true,
    withTransaction(fn) {
      return mgr.withTransaction((db, helpers) => {
        const wrapped = {
          audit(clientId, eventType, meta) {
            auditEvents.push({ clientId, eventType, meta });
            helpers.audit(clientId, eventType, meta);
          },
        };
        return fn(db, wrapped);
      });
    },
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-auth-audit-app-'));
  const statePath = path.join(dir, 'state.json');
  createHostStore({ filePath: statePath, teamCodePlain: hostToken });
  const ticketStore = createTicketStore({ getHostToken: () => hostToken });
  const { createShiftPinStore } = require('./shift-pin-store.js');
  const shiftPinStore = createShiftPinStore({ getHostToken: () => hostToken });
  const app = express();
  app.use(
    '/api/lan/v1',
    createAuthRouter({
      ticketStore,
      shiftPinStore,
      getHostToken: () => hostToken,
      getHostUrl: () => hostUrl,
      getRequiresMigrationNotice: () => false,
    })
  );
  const { server, base } = await listen(app);
  try {
    const mintRes = await fetch(`${base}/auth/tickets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert.strictEqual(mintRes.status, 200);
    const mintBody = await mintRes.json();

    const ex = await fetch(`${base}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: mintBody.ticketId }),
    });
    assert.strictEqual(ex.status, 200);

    const badBearer = await fetch(`${base}/auth/tickets`, { method: 'POST' });
    assert.strictEqual(badBearer.status, 401);

    const badExchange = await fetch(`${base}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: mintBody.ticketId }),
    });
    assert.strictEqual(badExchange.status, 401);

    assert.ok(auditEvents.some((e) => e.eventType === 'lan.ticket.mint'));
    assert.ok(auditEvents.some((e) => e.eventType === 'lan.ticket.exchange'));
    assert.ok(
      auditEvents.some((e) => e.eventType === 'lan.auth.fail' && e.meta.reason === 'invalid_token')
    );
    assert.ok(
      auditEvents.some((e) => e.eventType === 'lan.auth.fail' && e.meta.reason === 'invalid_ticket')
    );
  } finally {
    resetLanDbManagerForTests();
    mgr.lock();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(dbDir, { recursive: true, force: true });
  }
});

test('GET /beacon is unauthenticated', async () => {
  const hostToken = 'g'.repeat(64);
  const { app, dir, shiftPinStore } = createTestApp({
    hostToken,
    hostUrl: 'http://127.0.0.1:3738',
  });
  shiftPinStore.ensure();
  const { server, base } = await listen(app);
  try {
    const beacon = await fetch(`${base}/beacon`);
    assert.strictEqual(beacon.status, 200);
    const body = await beacon.json();
    assert.strictEqual(body.lan, true);
    assert.strictEqual(body.shiftPinActive, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('POST /auth/exchange by shiftPin is reusable', async () => {
  const hostToken = 'h'.repeat(64);
  const { app, dir, shiftPinStore } = createTestApp({
    hostToken,
    hostUrl: 'http://10.0.0.2:3738',
  });
  const { pin } = shiftPinStore.ensure();
  const { server, base } = await listen(app);
  try {
    const ex1 = await fetch(`${base}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftPin: pin }),
    });
    assert.strictEqual(ex1.status, 200);
    assert.strictEqual((await ex1.json()).token, hostToken);

    const ex2 = await fetch(`${base}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftPin: pin }),
    });
    assert.strictEqual(ex2.status, 200);
    assert.strictEqual((await ex2.json()).token, hostToken);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('POST /auth/exchange by shiftPin returns wardHostHints', async () => {
  const hostToken = 'w'.repeat(64);
  const hostUrl = 'http://10.0.57.52:3738';
  const { app, dir, shiftPinStore } = createTestApp({ hostToken, hostUrl });
  const { pin } = shiftPinStore.ensure();
  const { server, base } = await listen(app);
  try {
    const ex = await fetch(`${base}/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftPin: pin }),
    });
    assert.strictEqual(ex.status, 200);
    const body = await ex.json();
    assert.strictEqual(body.token, hostToken);
    assert.ok(body.wardHostHints);
    assert.ok(Array.isArray(body.wardHostHints.hostUrls));
    assert.ok(body.wardHostHints.hostUrls.some((row) => row.url === hostUrl));
    assert.ok(body.wardHostHints.prefixes.includes('10.0.57'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('GET /auth/ward-host-hints returns registry with Bearer', async () => {
  const hostToken = 'x'.repeat(64);
  const hostUrl = 'http://10.0.166.59:3738';
  const { app, dir } = createTestApp({ hostToken, hostUrl });
  const { server, base } = await listen(app);
  try {
    const res = await fetch(`${base}/auth/ward-host-hints`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.hostUrls));
    assert.ok(body.prefixes.includes('10.0.57'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('GET /host-status returns migration flag with Bearer', async () => {
  const hostToken = 'e'.repeat(64);
  const { app, dir } = createTestApp({
    hostToken,
    hostUrl: 'http://127.0.0.1:3738',
    requiresMigrationNotice: true,
  });
  const { server, base } = await listen(app);
  try {
    const bad = await fetch(`${base}/host-status`);
    assert.strictEqual(bad.status, 401);

    const ok = await fetch(`${base}/host-status`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    assert.strictEqual(ok.status, 200);
    const body = await ok.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.requiresMigrationNotice, true);
    assert.strictEqual(body.lan, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
