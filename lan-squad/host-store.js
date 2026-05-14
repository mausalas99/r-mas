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
    calendarEvents: [],
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
    s.calendarEvents = Array.isArray(s.calendarEvents) ? s.calendarEvents : [];
    return s;
  }

  function save(state) {
    atomicWriteJson(filePath, state);
  }

  function getState() {
    return load();
  }

  function createPatientAndCalendarEvent({ patient, event, clientPatientId }) {
    const state = load();
    const hostPatientId = newId('hp');
    const t = nowIso();
    const p = {
      ...patient,
      id: hostPatientId,
      clientOriginId: String(clientPatientId || ''),
      version: 1,
      updatedAt: t,
    };
    const evId = newId('ev');
    const cal = {
      id: evId,
      patientId: hostPatientId,
      start: String(event.start || ''),
      end: String(event.end || ''),
      procedure: String(event.procedure || ''),
      location: String(event.location || ''),
      materialReady: !!event.materialReady,
      createdAt: t,
      updatedAt: t,
      version: 1,
    };
    if (!cal.start || !cal.procedure) {
      throw new Error('invalid event: start and procedure required');
    }
    state.patients.push(p);
    state.calendarEvents.push(cal);
    save(state);
    return { hostPatientId, event: cal };
  }

  function addCalendarEvent({ patientId, start, end, procedure, location, materialReady }) {
    const state = load();
    if (!state.patients.some((p) => p.id === patientId)) {
      throw new Error('unknown patient');
    }
    const t = nowIso();
    const evId = newId('ev');
    const cal = {
      id: evId,
      patientId: String(patientId || ''),
      start: String(start || ''),
      end: String(end || ''),
      procedure: String(procedure || ''),
      location: String(location || ''),
      materialReady: !!materialReady,
      createdAt: t,
      updatedAt: t,
      version: 1,
    };
    if (!cal.start || !cal.procedure) {
      throw new Error('invalid event: start and procedure required');
    }
    state.calendarEvents.push(cal);
    save(state);
    return cal;
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

  function listCalendarEvents() {
    return load().calendarEvents.slice();
  }

  function patchCalendarEvent(id, patch, expectedVersion) {
    const state = load();
    const idx = state.calendarEvents.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('not found');
    const cur = state.calendarEvents[idx];
    if (expectedVersion != null && Number(cur.version) !== Number(expectedVersion)) {
      const err = new Error('conflict');
      err.code = 'CONFLICT';
      err.serverEvent = cur;
      throw err;
    }
    const t = nowIso();
    const next = { ...cur, ...patch, version: Number(cur.version || 1) + 1, updatedAt: t };
    state.calendarEvents[idx] = next;
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
    state.rooms = state.rooms.filter((x) => x.id !== id);
    save(state);
  }

  return {
    getState,
    createPatientAndCalendarEvent,
    addCalendarEvent,
    upsertPatient,
    listCalendarEvents,
    patchCalendarEvent,
    listRooms,
    createRoom,
    renameRoom,
    deleteRoom,
  };
}

module.exports = { createHostStore, atomicWriteJson };
