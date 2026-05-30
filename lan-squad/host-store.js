'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { hashTeamCode } = require('./team-code.js');
const { agendaEntityKey, todoEntityKey } = require('./entity-keys.js');

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

function atomicWriteJson(filePath, obj) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 0), 'utf8');
  fs.renameSync(tmp, filePath);
}

function readState(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') throw new Error('bad shape');
    return o;
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

function defaultState(teamCodeHash) {
  return {
    version: 1,
    teamCodeHash,
    patients: [],
    rooms: [],
    roomSyncBundles: {},
  };
}

function createHostStore({ filePath, teamCodePlain }) {
  const teamCodeHash = hashTeamCode(teamCodePlain);
  if (!fs.existsSync(filePath)) {
    atomicWriteJson(filePath, defaultState(teamCodeHash));
  }

  function load() {
    const s = readState(filePath);
    if (!s) {
      atomicWriteJson(filePath, defaultState(teamCodeHash));
      return defaultState(teamCodeHash);
    }
    if (s.teamCodeHash !== teamCodeHash) {
      const err = new Error(
        'LAN host state teamCodeHash does not match lan-team-code.txt. Run bootstrap or rehashLanHostState.'
      );
      err.code = 'LAN_HOST_STATE_HASH_MISMATCH';
      throw err;
    }
    s.patients = Array.isArray(s.patients) ? s.patients : [];
    s.rooms = Array.isArray(s.rooms) ? s.rooms : [];
    s.roomSyncBundles =
      s.roomSyncBundles && typeof s.roomSyncBundles === 'object' ? s.roomSyncBundles : {};
    for (const rid of Object.keys(s.roomSyncBundles)) {
      const b = s.roomSyncBundles[rid];
      if (b && typeof b === 'object' && (!b.entities || typeof b.entities !== 'object')) {
        b.entities = {};
      }
    }
    delete s.calendarEvents;
    return s;
  }

  function save(state) {
    atomicWriteJson(filePath, state);
  }

  function getState() {
    return load();
  }

  function upsertPatient(patient, expectedVersion) {
    const state = load();
    const idx = state.patients.findIndex((p) => p.id === patient.id);
    const t = nowIso();
    if (idx === -1) {
      const p = { ...patient, version: 1, updatedAt: t };
      state.patients.push(p);
      save(state);
      return p;
    }
    const cur = state.patients[idx];
    if (expectedVersion != null && Number(cur.version) !== Number(expectedVersion)) {
      const err = new Error('conflict');
      err.code = 'CONFLICT';
      err.serverPatient = cur;
      throw err;
    }
    const next = { ...cur, ...patient, version: Number(cur.version || 1) + 1, updatedAt: t };
    state.patients[idx] = next;
    save(state);
    return next;
  }

  function listRooms() {
    return load().rooms.slice();
  }

  function createRoom(displayName) {
    const state = load();
    const r = { id: newId('room'), displayName: String(displayName || 'Sala'), createdAt: nowIso() };
    state.rooms.push(r);
    save(state);
    return r;
  }

  function renameRoom(id, displayName) {
    const state = load();
    const r = state.rooms.find((x) => x.id === id);
    if (!r) throw new Error('room not found');
    r.displayName = String(displayName || r.displayName);
    save(state);
    return r;
  }

  function deleteRoom(id) {
    const state = load();
    const rid = String(id || '');
    state.rooms = state.rooms.filter((x) => x.id !== rid);
    if (state.roomSyncBundles && state.roomSyncBundles[rid]) {
      delete state.roomSyncBundles[rid];
    }
    save(state);
  }

  function getRoomSyncBundle(roomId) {
    const state = load();
    const rid = String(roomId || '');
    const b = state.roomSyncBundles && state.roomSyncBundles[rid];
    return b && typeof b === 'object' ? b : null;
  }

  function ensureRoomRecord(state, roomId, displayName) {
    const rid = String(roomId || '');
    if (!rid) return;
    const rooms = Array.isArray(state.rooms) ? state.rooms : [];
    if (rooms.some((x) => x && x.id === rid)) return;
    rooms.push({
      id: rid,
      displayName: String(displayName || 'Sala en vivo').trim() || 'Sala en vivo',
      createdAt: nowIso(),
    });
    state.rooms = rooms;
  }

  function putRoomSyncBundle(roomId, bundle) {
    const state = load();
    const rid = String(roomId || '');
    if (!rid) throw new Error('room id required');
    const incoming = bundle && typeof bundle === 'object' ? bundle : {};
    ensureRoomRecord(state, rid, incoming.roomDisplayName);
    const at = String(incoming.updatedAt || nowIso());
    if (!state.roomSyncBundles) state.roomSyncBundles = {};
    const cur = state.roomSyncBundles[rid];
    if (cur && String(cur.updatedAt || '') > at) {
      return cur;
    }
    const next = {
      updatedAt: at,
      uploadedByClientId: String(incoming.uploadedByClientId || ''),
      entities:
        incoming.entities && typeof incoming.entities === 'object'
          ? incoming.entities
          : cur && cur.entities && typeof cur.entities === 'object'
            ? cur.entities
            : {},
      agenda: Array.isArray(incoming.agenda) ? incoming.agenda : [],
      todos: incoming.todos && typeof incoming.todos === 'object' ? incoming.todos : {},
      entries: Array.isArray(incoming.entries) ? incoming.entries : [],
      manejo:
        incoming.manejo && typeof incoming.manejo === 'object'
          ? incoming.manejo
          : cur && cur.manejo
            ? cur.manejo
            : null,
    };
    state.roomSyncBundles[rid] = next;
    save(state);
    return next;
  }

  function ensureRoomBundle(state, roomId) {
    const rid = String(roomId || '');
    if (!rid) throw new Error('room id required');
    if (!state.roomSyncBundles) state.roomSyncBundles = {};
    let b = state.roomSyncBundles[rid];
    if (!b || typeof b !== 'object') {
      b = {
        updatedAt: nowIso(),
        uploadedByClientId: '',
        entities: {},
        agenda: [],
        todos: {},
        entries: [],
        manejo: null,
      };
      state.roomSyncBundles[rid] = b;
    }
    if (!b.entities || typeof b.entities !== 'object') b.entities = {};
    return b;
  }

  function getEntity({ entityType, entityId, roomId, patientId }) {
    const type = String(entityType || '');
    const id = String(entityId || '');
    if (type === 'patient') {
      const state = load();
      const row = state.patients.find((p) => p.id === id);
      if (!row) return null;
      return { version: Number(row.version || 1), data: row };
    }
    if (type === 'agenda' || type === 'todo') {
      const bundle = getRoomSyncBundle(roomId);
      if (!bundle || !bundle.entities) return null;
      const key = type === 'agenda' ? agendaEntityKey(id) : todoEntityKey(patientId, id);
      const rec = bundle.entities[key];
      if (!rec || rec.deleted) return null;
      return { version: Number(rec.version || 1), data: rec.data };
    }
    return null;
  }

  function materializeRoomViews(roomId) {
    const state = load();
    const bundle = ensureRoomBundle(state, roomId);
    const entities = bundle.entities || {};
    const agenda = [];
    const todos = {};
    for (const [key, rec] of Object.entries(entities)) {
      if (!rec || rec.deleted) continue;
      if (key.startsWith('agenda:')) {
        if (rec.data && typeof rec.data === 'object') agenda.push(rec.data);
        continue;
      }
      if (key.startsWith('todo:')) {
        const parsed = key.slice(5).split(':');
        const pid = parsed[0];
        if (!pid || !rec.data || typeof rec.data !== 'object') continue;
        if (!todos[pid]) todos[pid] = [];
        todos[pid].push(rec.data);
      }
    }
    agenda.sort((a, b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')));
    for (const pid of Object.keys(todos)) {
      todos[pid].sort((a, b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')));
    }
    bundle.agenda = agenda;
    bundle.todos = todos;
    bundle.updatedAt = nowIso();
    save(state);
    return bundle;
  }

  function setEntity({ roomId, entityType, entityId, patientId, version, data, deleted }) {
    const type = String(entityType || '');
    const id = String(entityId || '');
    const state = load();
    const t = nowIso();

    if (type === 'patient') {
      const idx = state.patients.findIndex((p) => p.id === id);
      const nextData = data && typeof data === 'object' ? { ...data, id } : { id };
      const nextVersion = Number(version || 1);
      if (idx === -1) {
        const row = { ...nextData, version: nextVersion, updatedAt: t };
        state.patients.push(row);
        save(state);
        return row;
      }
      const row = { ...state.patients[idx], ...nextData, version: nextVersion, updatedAt: t };
      if (deleted) row._deleted = true;
      state.patients[idx] = row;
      save(state);
      return row;
    }

    if (type === 'agenda' || type === 'todo') {
      const bundle = ensureRoomBundle(state, roomId);
      const key =
        type === 'agenda' ? agendaEntityKey(id) : todoEntityKey(patientId, id);
      bundle.entities[key] = {
        version: Number(version || 1),
        data: data && typeof data === 'object' ? data : {},
        updatedAt: t,
        deleted: !!deleted,
      };
      save(state);
      materializeRoomViews(roomId);
      return bundle.entities[key];
    }

    throw new Error('unsupported entity type');
  }

  return {
    getState,
    upsertPatient,
    listRooms,
    createRoom,
    renameRoom,
    deleteRoom,
    getRoomSyncBundle,
    putRoomSyncBundle,
    getEntity,
    setEntity,
    materializeRoomViews,
  };
}

module.exports = { createHostStore, atomicWriteJson };
