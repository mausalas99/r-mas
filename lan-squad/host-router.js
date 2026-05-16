'use strict';
const express = require('express');
const { verifyTeamCode } = require('./team-code.js');

function teamCodeMiddleware(getState) {
  return (req, res, next) => {
    const code = req.get('x-lan-team-code') || req.query.code || '';
    let st;
    try {
      st = getState();
    } catch (e) {
      const msg = (e && e.message) || 'host store error';
      return res.status(500).json({ error: msg });
    }
    if (!verifyTeamCode(code, st.teamCodeHash)) {
      return res.status(401).json({ error: 'invalid team code' });
    }
    next();
  };
}

function createLanRouter({ store, broadcast }) {
  const r = express.Router();
  const getState = () => store.getState();

  r.use(teamCodeMiddleware(getState));

  r.get('/ping', (_req, res) => {
    res.json({ ok: true, lan: true });
  });

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
      broadcast('sync', { type: 'patients-updated' });
      res.json({ patient: out });
    } catch (e) {
      if (e.code === 'CONFLICT') return res.status(409).json({ error: 'conflict', patient: e.serverPatient });
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

  r.get('/rooms/:id/sync-bundle', (req, res) => {
    const bundle = store.getRoomSyncBundle(req.params.id);
    if (!bundle) return res.status(404).json({ error: 'no bundle' });
    res.json({ bundle });
  });

  r.put('/rooms/:id/sync-bundle', express.json({ limit: '16mb' }), (req, res) => {
    try {
      const body = req.body && req.body.bundle ? req.body.bundle : req.body;
      const out = store.putRoomSyncBundle(req.params.id, body);
      res.json({ bundle: out });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  return r;
}

module.exports = { createLanRouter, teamCodeMiddleware };
