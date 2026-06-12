'use strict';
const express = require('express');
const { createBearerAuthMiddleware } = require('./bearer-auth.js');
const { validateHistoriaClinicaPut } = require('./historia-clinica-validate.js');
const { createDeltaResolver } = require('./delta-resolver.js');
const { createCommandResolver } = require('./command-resolver.js');
const { createSyncScheduler } = require('./sync-scheduler.js');
const { evaluateHostPatientPurgeGuard } = require('./host-patient-ownership.js');

const HEARTBEAT_INTERVAL_MS = 30_000;
let _heartbeatTimer = null;

function startHeartbeat(broadcastFn, getMetaFn, getExtrasFn) {
  if (_heartbeatTimer) return;
  _heartbeatTimer = setInterval(() => {
    try {
      const meta = typeof getMetaFn === 'function' ? getMetaFn() : {};
      const extras = typeof getExtrasFn === 'function' ? getExtrasFn() : {};
      if (typeof broadcastFn === 'function') {
        broadcastFn('sync', {
          type: 'livesync:hello',
          clientId: String(extras.clientId || ''),
          startedAt: Number(meta.startedAt) || 0,
          revision: Number(extras.revision) || 0,
          rank: String(meta.rank || 'R1'),
          dbUnlocked: !!extras.dbUnlocked,
          shiftPinActive: !!extras.shiftPinActive,
        });
      }
    } catch (e) {
      console.error('[lan-heartbeat]', e && e.message ? e.message : e);
    }
  }, HEARTBEAT_INTERVAL_MS);
  if (typeof _heartbeatTimer.unref === 'function') _heartbeatTimer.unref();
}

function createLanRouter({
  store,
  broadcast,
  resolver,
  getHostClinicalMeta,
  getHealthExtras,
  sseBroadcast,
  onClinicalOpsMerged,
}) {
  const r = express.Router();
  const getState = () => store.getState();
  const deltaResolver = createDeltaResolver({ store });
  const commandResolver = createCommandResolver({ store });
  const syncScheduler = createSyncScheduler({ hostStore: store });

  function broadcastAll(channel, obj) {
    if (typeof broadcast === 'function') broadcast(channel, obj);
    if (typeof sseBroadcast === 'function') sseBroadcast(channel, obj);
  }

  /** Notify all peers on the live room WS channel (6.6.1 HTTP-primary push). */
  function broadcastLiveRevision(roomId, revision, clientId) {
    const rid = String(roomId || '').trim();
    if (!rid) return;
    broadcastAll(`live:${encodeURIComponent(rid)}`, {
      type: 'livesync:revision',
      roomId: rid,
      revision: Number(revision || 0),
      clientId: String(clientId || 'host'),
    });
  }

  r.get('/health', (_req, res) => {
    const meta =
      typeof getHostClinicalMeta === 'function'
        ? getHostClinicalMeta()
        : { rank: 'R1', isProgramAdmin: false, isOnCallGuardia: false, startedAt: 0, updatedAt: '' };
    const extras = typeof getHealthExtras === 'function' ? getHealthExtras() : {};
    res.json({
      lan: true,
      dbUnlocked: extras.dbUnlocked != null ? !!extras.dbUnlocked : false,
      shiftPinActive: extras.shiftPinActive != null ? !!extras.shiftPinActive : false,
      hostRank: String(meta.rank || 'R1').trim() || 'R1',
      clientId: String(extras.clientId || '').trim(),
      startedAt: Number(meta.startedAt) || 0,
      revision: Number(extras.revision) || 0,
    });
  });

  r.use(createBearerAuthMiddleware(getState));

  r.get('/ping', (_req, res) => {
    res.json({ ok: true, lan: true });
  });

  r.get('/host-rank', (_req, res) => {
    const meta =
      typeof getHostClinicalMeta === 'function'
        ? getHostClinicalMeta()
        : { rank: 'R1', isProgramAdmin: false, startedAt: 0 };
    res.json({
      rank: String(meta.rank || 'R1').trim() || 'R1',
      isProgramAdmin: !!meta.isProgramAdmin,
      isOnCallGuardia: !!meta.isOnCallGuardia,
      startedAt: Number(meta.startedAt) || 0,
    });
  });

  r.get('/patients', (_req, res) => {
    const patients = store.getState().patients.filter((p) => p && !p._deleted);
    res.json({ patients });
  });

  r.delete('/patients/:id', (req, res) => {
    try {
      const id = String(req.params.id || '').trim();
      const registro = String(req.query.registro || '').trim();
      const clientId = String(req.query.clientId || '').trim();
      const isProgramAdmin = req.query.isProgramAdmin === '1';
      if (!id) return res.status(400).json({ error: 'patient_id_required' });
      const guard = evaluateHostPatientPurgeGuard(store, id, clientId, isProgramAdmin);
      if (guard.blocked) {
        console.warn('[lan] purge blocked', guard);
        return res.status(403).json({ error: 'owned_by_other_client' });
      }
      const purged = store.purgePatientFromHostCensus(id, registro);
      if (!purged) return res.status(404).json({ error: 'patient_not_found' });
      broadcast('sync', { type: 'patients-updated' });
      res.json({ ok: true, patientId: id });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
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
    const bundle =
      typeof store.getRoomSyncBundleForApi === 'function'
        ? store.getRoomSyncBundleForApi(req.params.id)
        : store.getRoomSyncBundle(req.params.id);
    if (!bundle) return res.status(404).json({ error: 'no bundle' });
    res.json({ bundle });
  });

  r.post('/rooms/:id/delta', express.json({ limit: '1mb' }), (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const out = deltaResolver.applyDelta({
      ...body,
      roomId: req.params.id,
    });
    if (out.status === 'invalid_delta') return res.status(400).json(out);
    if (out.status === 'stale_delta') return res.status(409).json(out);
    broadcast(`live:${encodeURIComponent(req.params.id)}`, {
      type: 'livesync:delta:applied',
      ...out,
    });
    broadcastLiveRevision(req.params.id, store.getRoomSyncBundle(req.params.id)?.revision, body.clientId);
    res.json(out);
  });

  r.get('/rooms/:id/deltas', (req, res) => {
    const afterSeq = Number(req.query.afterSeq || 0);
    const out = store.getRoomDeltaLog(req.params.id, afterSeq);
    if (!out.ok) {
      return res.status(409).json({
        error: out.error,
        fallback: 'sync_bundle',
      });
    }
    res.json(out);
  });

  r.post('/rooms/:id/commands', express.json({ limit: '1mb' }), (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const out = commandResolver.applyCommand({
      ...body,
      roomId: req.params.id,
    });
    if (out.code === 'STALE_BASE_SEQ_REQUIRES_SNAPSHOT') return res.status(409).json(out);
    if (!out.ok) return res.status(400).json(out);
    if (out.status === 'accepted') {
      syncScheduler.scheduleMaterialize(req.params.id, { reason: 'command' });
      broadcast(`live:${encodeURIComponent(req.params.id)}`, {
        type: 'livesync:command:applied',
        ...out,
      });
      broadcastLiveRevision(req.params.id, out.revision, body.clientId);
    }
    res.json(out);
  });

  r.post('/rooms/:id/flush', express.json({ limit: '32kb' }), async (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const reason = String(body.reason || 'sync-now').slice(0, 64);
    const clientId = String(body.clientId || 'host').slice(0, 128);
    const out = await syncScheduler.flush(req.params.id, { reason, clientId });
    res.json(out);
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
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const out = await store.putRoomClinicalOps(req.params.id, body);
      broadcastLiveRevision(
        req.params.id,
        out && out.revision,
        body.clientId || body.uploadedByClientId
      );
      if (typeof onClinicalOpsMerged === 'function') {
        try {
          onClinicalOpsMerged(req.params.id, out);
        } catch (e) {
          console.error('[lan-clinical-ops]', e && e.message ? e.message : e);
        }
      }
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

  // ── Typed mutation endpoints (V1 clients) ──────────────────────────

  r.post('/patients/:id/lab-history/upsert-set', express.json({ limit: '512kb' }), async (req, res) => {
    try {
      const { set, clientId, clientTimestamp } = req.body || {};
      if (!set || !set.id) return res.status(400).json({ error: 'set.id required' });
      const result = store.upsertPatientLabHistorySet(
        req.params.id,
        set,
        Number(clientTimestamp || 0),
        clientId
      );
      if (!result.ok) return res.status(404).json({ error: result.error });
      await store.awaitDurableCommit();
      broadcastLiveRevision(result.roomId || req.params.id, result.revision, clientId || 'host');
      res.json({
        ok: true,
        setId: set.id,
        revision: result.revision,
        deltaSeq: result.deltaSeq,
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.put('/patients/:id/nota', express.json({ limit: '256kb' }), async (req, res) => {
    try {
      const { data, expectedVersion, clientId, clientTimestamp } = req.body || {};
      if (data == null) return res.status(400).json({ error: 'data required' });
      const result = store.replacePatientNota(
        req.params.id,
        data,
        Number(expectedVersion ?? 0),
        Number(clientTimestamp || 0)
      );
      if (!result.ok) return res.status(404).json({ error: result.error });
      await store.awaitDurableCommit();
      broadcastLiveRevision(result.roomId || req.params.id, result.revision ?? 0, clientId || 'host');
      res.json({
        ok: true,
        version: result.version,
        data: result.data,
        ...(result.lwwApplied ? { lwwApplied: true } : {}),
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.put('/patients/:id/indicaciones', express.json({ limit: '256kb' }), async (req, res) => {
    try {
      const { data, expectedVersion, clientId, clientTimestamp } = req.body || {};
      if (data == null) return res.status(400).json({ error: 'data required' });
      const result = store.replacePatientIndicaciones(
        req.params.id,
        data,
        Number(expectedVersion ?? 0),
        Number(clientTimestamp || 0)
      );
      if (!result.ok) return res.status(404).json({ error: result.error });
      await store.awaitDurableCommit();
      broadcastLiveRevision(result.roomId || req.params.id, result.revision ?? 0, clientId || 'host');
      res.json({
        ok: true,
        version: result.version,
        data: result.data,
        ...(result.lwwApplied ? { lwwApplied: true } : {}),
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.put('/patients/:id/fields', express.json({ limit: '128kb' }), async (req, res) => {
    try {
      const { changedKeys, data, expectedVersion, clientId } = req.body || {};
      if (!Array.isArray(changedKeys) || !data) {
        return res.status(400).json({ error: 'changedKeys and data required' });
      }
      const result = resolver.applyMutation({
        entityType: 'patient',
        entityId: req.params.id,
        expectedVersion: Number(expectedVersion ?? 0),
        changedKeys,
        data: { ...data, id: req.params.id },
        clientId: String(clientId || ''),
      });
      if (!result.ok) return res.status(409).json({ error: 'conflict', version: result.version });
      await store.awaitDurableCommit();
      const roomId =
        (typeof store.findRoomForPatient === 'function' && store.findRoomForPatient(req.params.id)) ||
        req.params.id;
      broadcastLiveRevision(roomId, result.version ?? 0, clientId || 'host');
      res.json({ ok: true, version: result.version });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  r.put('/rooms/:id/sync-bundle', express.json({ limit: '16mb' }), async (req, res) => {
    try {
      const body = req.body && req.body.bundle ? req.body.bundle : req.body;
      const out = store.putRoomSyncBundle(req.params.id, body);
      if (
        out &&
        out.bundle &&
        out.bundle.clinicalOps &&
        typeof store.persistRoomBundleClinicalOpsToHostDb === 'function'
      ) {
        await store.persistRoomBundleClinicalOpsToHostDb(req.params.id);
        const refreshed =
          typeof store.getRoomSyncBundleForApi === 'function'
            ? store.getRoomSyncBundleForApi(req.params.id)
            : store.getRoomSyncBundle(req.params.id);
        if (refreshed) out.bundle = refreshed;
      }
      if (out && out.bundle) {
        broadcastLiveRevision(
          req.params.id,
          out.bundle.revision,
          body.uploadedByClientId || body.clientId
        );
      }
      const payload = { bundle: out.bundle, merged: true };
      if (Array.isArray(out.lwwAppliedKeys) && out.lwwAppliedKeys.length) {
        payload.lwwAppliedKeys = out.lwwAppliedKeys;
      }
      res.json(payload);
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

  startHeartbeat(broadcastAll, getHostClinicalMeta, getHealthExtras);

  return r;
}

module.exports = { createLanRouter };
