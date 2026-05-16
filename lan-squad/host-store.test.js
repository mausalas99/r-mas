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
});
