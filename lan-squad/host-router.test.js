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
const { createConflictResolver } = require('./conflict-resolver.js');

function bearerHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function mountLanRouter(store, broadcast = () => {}) {
  const resolver = createConflictResolver({ store });
  const app = express();
  app.use('/api/lan/v1', createLanRouter({ store, broadcast, resolver }));
  return app;
}

test('LAN /ping requiere Authorization Bearer válido', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-ping-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  const app = mountLanRouter(store);
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
  const app = mountLanRouter(store);
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

test('PUT /patients/:id auto-merge returns 200 with autoMerged', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-put-merge-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  store.upsertPatient({ id: 'p1', nombre: 'Ana' }, null);
  store.upsertPatient({ id: 'p1', nombre: 'Ana', cuarto: '201' }, 1);
  const app = mountLanRouter(store);
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });
  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/api/lan/v1/patients/p1`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...bearerHeaders(code), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedVersion: 1,
        baseData: { id: 'p1', nombre: 'Ana', cuarto: '101' },
        changedKeys: ['cama'],
        data: { id: 'p1', nombre: 'Ana', cuarto: '101', cama: 'B' },
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.autoMerged, true);
    assert.strictEqual(body.data.cuarto, '201');
    assert.strictEqual(body.data.cama, 'B');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('PUT /rooms/:id/sync-bundle stale entity version returns 409', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-bundle-conf-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  const room = store.createRoom('Sala sync');
  store.putRoomSyncBundle(room.id, {
    baseRevision: 0,
    baseEntityVersions: {},
    agenda: [{ id: 'e1', patientId: 'p1', procedure: 'A' }],
    todos: {},
  });
  const cur = store.getRoomSyncBundle(room.id);
  const app = mountLanRouter(store);
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });
  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/api/lan/v1/rooms/${encodeURIComponent(room.id)}/sync-bundle`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...bearerHeaders(code), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bundle: {
          baseRevision: cur.revision,
          baseEntityVersions: { 'a:e1': 0 },
          agenda: [{ id: 'e1', patientId: 'p1', procedure: 'STALE' }],
          todos: {},
        },
      }),
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.error, 'conflict');
    assert.ok(Array.isArray(body.conflicts));
    assert.ok(body.conflicts.length >= 1);
    assert.ok(body.bundle);
    assert.strictEqual(store.getRoomSyncBundle(room.id).agenda[0].procedure, 'A');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('PUT /patients/:id/historia-clinica creates entity and appends audit', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-hc-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  const room = store.createRoom('Sala');
  const app = mountLanRouter(store);
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });
  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/api/lan/v1/patients/p1/historia-clinica`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...bearerHeaders(code), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: room.id,
        expectedVersion: 0,
        changedKeys: ['app'],
        data: { patientId: 'p1', app: 'metformina' },
        audit: {
          sections: ['app'],
          safety: [{ ruleId: 'metformina-egfr-lt30', severity: 'high', acknowledged: true }],
        },
        clientId: 'test-client',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.version, 1);
    assert.equal(body.data.app.descripcionDetallada, 'metformina');
    const bundle = store.getRoomSyncBundle(room.id);
    assert.ok(Array.isArray(bundle.audit_log));
    const entry = bundle.audit_log.find((e) => e.action === 'historia_clinica.save');
    assert.ok(entry);
    assert.strictEqual(entry.detail.safety[0].ruleId, 'metformina-egfr-lt30');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('PUT /patients/:id/historia-clinica accepts nested app shape', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-hc-nested-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  const room = store.createRoom('Sala');
  const app = mountLanRouter(store);
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });
  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/api/lan/v1/patients/p1/historia-clinica`;
    const nestedApp = {
      conditions: ['dm'],
      descripcionDetallada: 'DM2.',
      medicamentosActuales: 'metformina 850 mg',
      hospitalizacionesPrevias: '',
    };
    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...bearerHeaders(code), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: room.id,
        expectedVersion: 0,
        changedKeys: ['app'],
        data: { patientId: 'p1', motivoConsulta: 'Control', app: nestedApp },
        clientId: 'test-client',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.version, 1);
    assert.deepEqual(body.data.app, nestedApp);
    const bundle = store.getRoomSyncBundle(room.id);
    assert.deepEqual(bundle.entities['hc:p1'].data.app, nestedApp);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('PUT /patients/:id overlap returns 409 conflict body', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-put-conf-'));
  const statePath = path.join(dir, 'state.json');
  const code = 'test-team-' + Date.now() + '-'.repeat(20);
  const store = createHostStore({ filePath: statePath, teamCodePlain: code });
  store.upsertPatient({ id: 'p1', nombre: 'Ana', cuarto: '101' }, null);
  store.upsertPatient({ id: 'p1', nombre: 'Ana', cuarto: '201' }, 1);
  const app = mountLanRouter(store);
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', (err) => (err ? reject(err) : resolve()));
  });
  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/api/lan/v1/patients/p1`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { ...bearerHeaders(code), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedVersion: 1,
        baseData: { id: 'p1', nombre: 'Ana', cuarto: '101' },
        changedKeys: ['cuarto'],
        data: { id: 'p1', nombre: 'Ana', cuarto: '102' },
      }),
    });
    assert.strictEqual(res.status, 409);
    const body = await res.json();
    assert.strictEqual(body.error, 'conflict');
    assert.ok(body.conflictingKeys.includes('cuarto'));
    assert.strictEqual(body.serverData.cuarto, '201');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
