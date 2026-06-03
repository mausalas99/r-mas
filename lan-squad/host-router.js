'use strict';
const express = require('express');
const { createBearerAuthMiddleware } = require('./bearer-auth.js');
const { validateHistoriaClinicaPut } = require('./historia-clinica-validate.js');

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
      if (out && out.data && out.data.archived === true) {
        store.archiveHistoriaClinicaForPatient(req.params.id);
      }
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

  r.get('/rooms/:id/clinical-ops', (req, res) => {
    const bundle = store.getRoomSyncBundle(req.params.id);
    if (!bundle) return res.status(404).json({ error: 'no bundle' });
    const snapshot =
      bundle.clinicalOps && typeof bundle.clinicalOps === 'object' ? bundle.clinicalOps : null;
    res.json({ snapshot, revision: Number(bundle.revision || 0) });
  });

  r.put('/rooms/:id/clinical-ops', express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const out = await store.putRoomClinicalOps(req.params.id, req.body || {});
      res.json(out);
    } catch (e) {
      if (e.code === 'CONFLICT') {
        return res.status(409).json({
          error: 'conflict',
          snapshot: e.serverSnapshot,
          revision: e.revision,
          conflicts: e.conflicts || [],
        });
      }
      res.status(400).json({ error: e.message });
    }
  });

  r.get('/patients/:patientId/historia-clinica', (req, res) => {
    const roomId = String(req.query.roomId || '').trim();
    if (!roomId) return res.status(400).json({ error: 'roomId_required' });
    const row = store.getEntity({
      entityType: 'historiaClinica',
      entityId: req.params.patientId,
      patientId: req.params.patientId,
      roomId,
    });
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json({ version: row.version, data: row.data });
  });

  r.put('/patients/:patientId/historia-clinica', express.json({ limit: '2mb' }), async (req, res) => {
    try {
      const validated = validateHistoriaClinicaPut({
        ...req.body,
        patientId: req.params.patientId,
        entityId: req.params.patientId,
      });
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error, paths: validated.paths });
      }
      const mutation = validated.mutation;
      mutation.entityId = req.params.patientId;
      mutation.patientId = req.params.patientId;
      const auditBody = mutation.audit && typeof mutation.audit === 'object' ? mutation.audit : {};
      const auditTemplate = {
        at: new Date().toISOString(),
        clientId: String(mutation.clientId || 'unknown'),
        action: 'historia_clinica.save',
        detail: {
          patientId: req.params.patientId,
          changedKeys: mutation.changedKeys,
          sections: auditBody.sections || mutation.changedKeys,
          safety: Array.isArray(auditBody.safety) ? auditBody.safety : [],
        },
      };
      const out = await store.putHistoriaClinicaQueued(resolver, mutation, auditTemplate);
      broadcast('sync', { type: 'historia-clinica-updated', patientId: req.params.patientId });
      res.json(out);
    } catch (e) {
      if (e.code === 'CONFLICT') {
        return res.status(409).json({
          error: 'conflict',
          entityType: 'historiaClinica',
          entityId: req.params.patientId,
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

  r.put('/rooms/:id/sync-bundle', express.json({ limit: '16mb' }), (req, res) => {
    try {
      const body = req.body && req.body.bundle ? req.body.bundle : req.body;
      const out = store.putRoomSyncBundle(req.params.id, body);
      res.json({ bundle: out, merged: true });
    } catch (e) {
      if (e.code === 'CONFLICT') {
        return res.status(409).json({
          error: 'conflict',
          bundle: e.serverBundle,
          conflicts: e.conflicts || [],
        });
      }
      res.status(400).json({ error: e.message });
    }
  });

  return r;
}

module.exports = { createLanRouter };
