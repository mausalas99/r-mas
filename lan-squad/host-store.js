'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { hashTeamCode } = require('./team-code.js');

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
      throw new Error('team code mismatch for existing host file');
    }
    s.patients = Array.isArray(s.patients) ? s.patients : [];
    s.rooms = Array.isArray(s.rooms) ? s.rooms : [];
    s.roomSyncBundles =
      s.roomSyncBundles && typeof s.roomSyncBundles === 'object' ? s.roomSyncBundles : {};
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

  function putRoomSyncBundle(roomId, bundle) {
    const state = load();
    const rid = String(roomId || '');
    if (!rid) throw new Error('room id required');
    const incoming = bundle && typeof bundle === 'object' ? bundle : {};
    const at = String(incoming.updatedAt || nowIso());
    if (!state.roomSyncBundles) state.roomSyncBundles = {};
    const cur = state.roomSyncBundles[rid];
    if (cur && String(cur.updatedAt || '') > at) {
      return cur;
    }
    const next = {
      updatedAt: at,
      uploadedByClientId: String(incoming.uploadedByClientId || ''),
      agenda: Array.isArray(incoming.agenda) ? incoming.agenda : [],
      todos: incoming.todos && typeof incoming.todos === 'object' ? incoming.todos : {},
    };
    state.roomSyncBundles[rid] = next;
    save(state);
    return next;
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
  };
}

module.exports = { createHostStore, atomicWriteJson };
