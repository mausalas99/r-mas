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

  it('reinicializa host-state si cambió el código del equipo', () => {
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

  it('putRoomSyncBundle LWW por updatedAt del envelope', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'b' });
    const r = store.createRoom('Sala sync');
    store.putRoomSyncBundle(r.id, {
      updatedAt: '2026-05-16T08:00:00.000Z',
      uploadedByClientId: 'a',
      agenda: [{ id: 'e1', patientId: 'p1', procedure: 'A', location: 'X', updatedAt: '2026-05-16T08:00:00.000Z' }],
      todos: {},
    });
    store.putRoomSyncBundle(r.id, {
      updatedAt: '2026-05-16T07:00:00.000Z',
      uploadedByClientId: 'b',
      agenda: [{ id: 'e1', patientId: 'p1', procedure: 'OLD', location: 'Y', updatedAt: '2026-05-16T07:00:00.000Z' }],
      todos: {},
    });
    const got = store.getRoomSyncBundle(r.id);
    assert.strictEqual(got.agenda[0].procedure, 'A');
    store.putRoomSyncBundle(r.id, {
      updatedAt: '2026-05-16T09:00:00.000Z',
      uploadedByClientId: 'c',
      agenda: [{ id: 'e1', patientId: 'p1', procedure: 'NEW', location: 'Z', updatedAt: '2026-05-16T09:00:00.000Z' }],
      todos: {},
    });
    assert.strictEqual(store.getRoomSyncBundle(r.id).agenda[0].procedure, 'NEW');
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

  it('putRoomSyncBundle persiste manejo', () => {
    const store = createHostStore({ filePath, teamCodePlain: 'b' });
    const r = store.createRoom('Sala');
    store.putRoomSyncBundle(r.id, {
      updatedAt: '2026-05-26T10:00:00.000Z',
      uploadedByClientId: 'c1',
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
});
