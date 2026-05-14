'use strict';
const express = require('express');
const { verifyTeamCode } = require('./team-code.js');

function teamCodeMiddleware(getState) {
  return (req, res, next) => {
    const code = req.get('x-lan-team-code') || req.query.code || '';
    const st = getState();
    if (!verifyTeamCode(code, st.teamCodeHash)) {
      return res.status(401).json({ error: 'invalid team code' });
    }
    next();
  };
}

function createLanRouter({ store, broadcast }) {
  const r = express.Router();
  const getState = () => store.getState();

  r.get('/ping', (_req, res) => {
    res.json({ ok: true, lan: true });
  });

  r.use(teamCodeMiddleware(getState));

  r.get('/patients', (_req, res) => {
    res.json({ patients: store.getState().patients });
  });

  r.put('/patients/:id', express.json({ limit: '2mb' }), (req, res) => {
    try {
      const expected = req.body && req.body.expectedVersion != null ? Number(req.body.expectedVersion) : null;
      const body = { ...req.body };
      delete body.expectedVersion;
      body.id = req.params.id;
      const out = store.upsertPatient(body, expected);
      broadcast('calendar', { type: 'patients-updated' });
      res.json({ patient: out });
    } catch (e) {
      if (e.code === 'CONFLICT') return res.status(409).json({ error: 'conflict', patient: e.serverPatient });
      res.status(400).json({ error: e.message });
    }
  });

  r.post('/patients-with-event', express.json({ limit: '2mb' }), (req, res) => {
    try {
      const { patient, event, clientPatientId } = req.body || {};
      const out = store.createPatientAndCalendarEvent({ patient, event, clientPatientId });
      broadcast('calendar', { type: 'calendar-changed' });
      res.status(201).json(out);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.post('/calendar-events', express.json({ limit: '512kb' }), (req, res) => {
    try {
      const { patientId, start, end, procedure, location, materialReady } = req.body || {};
      const event = store.addCalendarEvent({ patientId, start, end, procedure, location, materialReady });
      broadcast('calendar', { type: 'calendar-changed' });
      res.status(201).json({ event });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.get('/calendar-events', (_req, res) => {
    res.json({ events: store.listCalendarEvents() });
  });

  r.patch('/calendar-events/:id', express.json({ limit: '512kb' }), (req, res) => {
    try {
      const expected = req.body && req.body.expectedVersion != null ? Number(req.body.expectedVersion) : null;
      const patch = { ...req.body };
      delete patch.expectedVersion;
      const out = store.patchCalendarEvent(req.params.id, patch, expected);
      broadcast('calendar', { type: 'calendar-changed', eventId: out.id });
      res.json({ event: out });
    } catch (e) {
      if (e.code === 'CONFLICT') return res.status(409).json({ error: 'conflict', event: e.serverEvent });
      res.status(400).json({ error: e.message });
    }
  });

  r.get('/rooms', (_req, res) => {
    res.json({ rooms: store.listRooms() });
  });

  r.post('/rooms', express.json(), (req, res) => {
    const row = store.createRoom(req.body && req.body.displayName);
    broadcast('rooms', { type: 'rooms-changed' });
    res.status(201).json({ room: row });
  });

  r.patch('/rooms/:id', express.json(), (req, res) => {
    const row = store.renameRoom(req.params.id, req.body && req.body.displayName);
    broadcast('rooms', { type: 'rooms-changed' });
    res.json({ room: row });
  });

  r.delete('/rooms/:id', (req, res) => {
    store.deleteRoom(req.params.id);
    broadcast('rooms', { type: 'rooms-changed' });
    res.json({ ok: true });
  });

  return r;
}

module.exports = { createLanRouter, teamCodeMiddleware };
