'use strict';
const express = require('express');
const { createBearerAuthMiddleware } = require('./bearer-auth.js');

function createLanRouter({ store, broadcast, resolver }) {
  const r = express.Router();
  const getState = () => store.getState();

  r.use(createBearerAuthMiddleware(getState));

  r.get('/ping', (_req, res) => {
    res.json({ ok: true, lan: true });
  });

  r.get('/patients', (_req, res) => {
    res.json({ patients: store.getState().patients });
  });

  r.put('/patients/:id', express.json({ limit: '2mb' }), (req, res) => {
    try {
      const mutation = {
        entityType: 'patient',
        entityId: req.params.id,
        expectedVersion: Number(req.body.expectedVersion ?? 0),
        changedKeys: req.body.changedKeys || [],
        baseData: req.body.baseData,
        data: { ...req.body.data, id: req.params.id },
        op: req.body.op,
      };
      if (!mutation.changedKeys.length && mutation.expectedVersion > 0) {
        return res.status(400).json({ error: 'changedKeys_required' });
      }
      const out = resolver.applyMutation(mutation);
      broadcast('sync', { type: 'patients-updated' });
      res.json(out);
    } catch (e) {
      if (e.code === 'CONFLICT') {
        return res.status(409).json({
          error: 'conflict',
          entityType: 'patient',
          entityId: req.params.id,
          expectedVersion: e.expectedVersion,
          serverVersion: e.serverVersion,
          serverData: e.serverData,
          clientData: e.clientData,
          conflictingKeys: e.conflictingKeys,
        });
      }
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

module.exports = { createLanRouter };
