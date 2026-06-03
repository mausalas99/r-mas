'use strict';
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHostStore } = require('./host-store.js');

describe('host-store', () => {
  let dir;
  let filePath;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-host-'));
    filePath = path.join(dir, 'state.json');
  });

  it('createHostStore inicializa teamCodeHash y listas vacías', () => {
    const { hashTeamCode } = require('./team-code.js');
    const store = createHostStore({ filePath, teamCodePlain: 'abc' });
    const st = store.getState();
    assert.strictEqual(st.patients.length, 0);
    assert.strictEqual(st.rooms.length, 0);
    assert.strictEqual(st.calendarEvents, undefined);
    assert.strictEqual(st.teamCodeHash, hashTeamCode('abc'));
  });

  it('upsertPatient crea y actualiza con versión', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'x' });
    const p1 = store.upsertPatient(
      { id: 'p1', nombre: 'Uno', registro: 'R1', edad: '30', sexo: 'F' },
      null
    );
    assert.strictEqual(p1.version, 1);
    const st = store.getState();
    assert.strictEqual(st.patients.length, 1);
    const p2 = store.upsertPatient(
      { id: 'p1', nombre: 'Uno x', registro: 'R1', edad: '30', sexo: 'F' },
      1
    );
    assert.strictEqual(p2.version, 2);
    assert.strictEqual(store.getState().patients[0].nombre, 'Uno x');
  });

  it('createRoom y listRooms', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'z' });
    assert.strictEqual(store.listRooms().length, 0);
    const r = store.createRoom('Sala E');
    assert.ok(r.id);
    assert.strictEqual(r.displayName, 'Sala E');
    const list = store.listRooms();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, r.id);
  });

  it('no borra host-state si cambió el código del equipo (hash mismatch)', () => {
    const { hashTeamCode } = require('./team-code.js');
    const storeA = createHostStore({ filePath, teamCodePlain: 'old-code' });
    storeA.createRoom('Sala previa');
    assert.strictEqual(storeA.listRooms().length, 1);
    const storeB = createHostStore({ filePath, teamCodePlain: 'new-code' });
    assert.throws(() => storeB.getState(), (e) => e.code === 'LAN_HOST_STATE_HASH_MISMATCH');
    const preserved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.strictEqual(preserved.rooms.length, 1);
    assert.strictEqual(preserved.teamCodeHash, hashTeamCode('old-code'));
  });

  it('load throws LAN_HOST_STATE_HASH_MISMATCH instead of wiping patients', () => {
    const { hashTeamCode } = require('./team-code.js');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        version: 1,
        teamCodeHash: hashTeamCode('old-code'),
        patients: [{ id: 'p1', nombre: 'X', version: 1 }],
        rooms: [],
        roomSyncBundles: {},
      }),
      'utf8'
    );
    const store = createHostStore({
      filePath,
      teamCodePlain: 'new-code-64-hexxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    });
    assert.throws(() => store.getState(), (e) => e.code === 'LAN_HOST_STATE_HASH_MISMATCH');
    const preserved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.strictEqual(preserved.patients.length, 1);
  });

  it('putRoomSyncBundle rejects stale entity version with CONFLICT', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'b' });
    const r = store.createRoom('Sala sync');
    store.putRoomSyncBundle(r.id, {
      baseRevision: 0,
      baseEntityVersions: {},
      agenda: [{ id: 'e1', patientId: 'p1', procedure: 'A', location: 'X' }],
      todos: {},
      uploadedByClientId: 'a',
    });
    const cur = store.getRoomSyncBundle(r.id);
    assert.throws(
      () =>
        store.putRoomSyncBundle(r.id, {
          baseRevision: cur.revision,
          baseEntityVersions: { 'a:e1': 0 },
          agenda: [{ id: 'e1', patientId: 'p1', procedure: 'STALE', location: 'Y' }],
          todos: {},
          uploadedByClientId: 'b',
        }),
      (e) => e.code === 'CONFLICT'
    );
    assert.strictEqual(store.getRoomSyncBundle(r.id).agenda[0].procedure, 'A');
  });

  it('putRoomSyncBundle merges disjoint todo keys', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'b' });
    const r = store.createRoom('Sala');
    store.putRoomSyncBundle(r.id, {
      baseRevision: 0,
      baseEntityVersions: {},
      agenda: [],
      todos: { p1: [{ id: 't1', text: 'one' }] },
    });
    const cur = store.getRoomSyncBundle(r.id);
    store.putRoomSyncBundle(r.id, {
      baseRevision: cur.revision,
      baseEntityVersions: {},
      agenda: [],
      todos: { p1: [{ id: 't2', text: 'two' }] },
    });
    const got = store.getRoomSyncBundle(r.id);
    assert.strictEqual(got.todos.p1.length, 2);
  });

  it('getEntity / setEntity round-trip for room todo', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'test' });
    const room = store.createRoom('UCI');
    store.setEntity({
      roomId: room.id,
      entityType: 'todo',
      entityId: 'td1',
      patientId: 'p1',
      version: 1,
      data: { id: 'td1', text: 'Labs', completed: false, updatedAt: '2026-05-30T10:00:00.000Z' },
    });
    const got = store.getEntity({ roomId: room.id, entityType: 'todo', entityId: 'td1', patientId: 'p1' });
    assert.strictEqual(got.version, 1);
    assert.strictEqual(got.data.text, 'Labs');
    const bundle = store.getRoomSyncBundle(room.id);
    assert.ok(Array.isArray(bundle.todos.p1));
    assert.strictEqual(bundle.todos.p1[0].text, 'Labs');
  });

  it('historiaClinica entity get/set and archive', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'hc' });
    const r = store.createRoom('Sala');
    store.setEntity({
      roomId: r.id,
      entityType: 'historiaClinica',
      entityId: 'p1',
      patientId: 'p1',
      version: 1,
      data: { patientId: 'p1', ficha: 'A', app: 'B' },
      deleted: false,
    });
    const got = store.getEntity({
      entityType: 'historiaClinica',
      entityId: 'p1',
      patientId: 'p1',
      roomId: r.id,
    });
    assert.strictEqual(got.version, 1);
    assert.strictEqual(got.data.ficha, 'A');
    const archDir = path.join(dir, 'archive', 'p1');
    const out = store.archiveHistoriaClinicaForPatient('p1', { storageRoot: dir });
    assert.strictEqual(out.archived, true);
    assert.ok(fs.existsSync(path.join(archDir, 'historia-clinica.json')));
    const missing = store.getEntity({
      entityType: 'historiaClinica',
      entityId: 'p1',
      patientId: 'p1',
      roomId: r.id,
    });
    assert.strictEqual(missing, null);
  });

  it('getEntity historiaClinica falls back to bundle.entries patient snapshot', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'hc-entries' });
    const r = store.createRoom('Sala');
    store.putRoomSyncBundle(r.id, {
      baseRevision: 0,
      baseEntityVersions: {},
      agenda: [],
      todos: {},
      entries: [
        {
          patient: {
            id: 'p1',
            nombre: 'TEST',
            historiaClinica: {
              version: 3,
              data: { motivoConsulta: 'dolor', meta: { updatedAt: '2026-06-01T10:00:00.000Z' } },
            },
          },
        },
      ],
    });
    const got = store.getEntity({
      roomId: r.id,
      entityType: 'historiaClinica',
      entityId: 'p1',
      patientId: 'p1',
    });
    assert.strictEqual(got.version, 3);
    assert.strictEqual(got.data.motivoConsulta, 'dolor');
  });

  it('putRoomSyncBundle persiste manejo', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'b' });
    const r = store.createRoom('Sala');
    store.putRoomSyncBundle(r.id, {
      baseRevision: 0,
      baseEntityVersions: {},
      agenda: [],
      todos: {},
      entries: [],
      manejo: {
        customProtocols: [{ id: 'p1', name: 'X' }],
        overrides: {},
        favorites: [],
        recent: [],
        updatedAt: '2026-05-26T10:00:00.000Z',
      },
    });
    const got = store.getRoomSyncBundle(r.id);
    assert.strictEqual(got.manejo.customProtocols[0].id, 'p1');
  });

  it('round-trips host state through SQLCipher when dbManager is unlocked', async () => {
    const { createUnlockedDbManager } = await import('../lib/db/test-open-db.mjs');
    const { readHostState } = await import('../lib/db/lan-host-persistence.mjs');
    const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-host-db-'));
    const mgr = await createUnlockedDbManager(dbDir, () => 'lan-host-db-test');
    try {
      const store = createHostStore({
        filePath,
        teamCodePlain: 'db-roundtrip',
        dbManager: mgr,
        getClientId: () => 'lan-host-db-test',
      });
      await store.ready();
      const room = store.createRoom('Sala DB');
      await store.flush();
      const row = readHostState(mgr.getDb());
      assert.ok(row);
      assert.strictEqual(row.rooms.length, 1);
      assert.strictEqual(row.rooms[0].displayName, 'Sala DB');
      const audit = mgr
        .getDb()
        .prepare(
          `SELECT event_type, client_id FROM forensic_audit_chain
           WHERE event_type = 'lan.host.commit' ORDER BY id DESC LIMIT 1`
        )
        .get();
      assert.ok(audit);
      assert.strictEqual(audit.client_id, 'lan-host-db-test');
      mgr.lock();
      const lockedStore = createHostStore({
        filePath,
        teamCodePlain: 'db-roundtrip',
        dbManager: mgr,
      });
      assert.throws(() => lockedStore.getState(), (e) => e.code === 'DB_LOCKED');
      assert.strictEqual(room.id, row.rooms[0].id);
    } finally {
      mgr.lock();
      fs.rmSync(dbDir, { recursive: true, force: true });
    }
  });
});
