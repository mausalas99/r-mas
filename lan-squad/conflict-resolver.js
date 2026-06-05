'use strict';

const { mergeRecordsLww } = require('./lww-utils.js');

class ConflictError extends Error {
  constructor(details) {
    super('conflict');
    this.code = 'CONFLICT';
    Object.assign(this, details);
  }
}

function keysChanged(serverData, baseData) {
  const keys = new Set([...Object.keys(serverData || {}), ...Object.keys(baseData || {})]);
  const changed = [];
  for (const k of keys) {
    if (serverData[k] !== baseData[k]) changed.push(k);
  }
  return changed;
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  return out;
}

function createConflictResolver({ store }) {
  function applyMutation(mutation, opts) {
    const deferPersist = !!(opts && opts.deferPersist);
    const setOpts = deferPersist ? { deferPersist: true } : undefined;
    const entityType = mutation.entityType;
    const entityId = mutation.entityId;
    const expectedVersion = Number(mutation.expectedVersion || 0);
    const changedKeys = Array.isArray(mutation.changedKeys) ? mutation.changedKeys : [];
    const baseData = mutation.baseData;
    const data = mutation.data || {};
    const roomId = mutation.roomId;
    const patientId = mutation.patientId;

    let server = store.getEntity({ entityType, entityId, roomId, patientId });

    if (!server) {
      if (expectedVersion > 0) {
        throw new ConflictError({ conflictingKeys: ['*'], serverData: null, clientData: data });
      }
      const version = 1;
      store.setEntity(
        {
          roomId,
          entityType,
          entityId,
          patientId,
          version,
          data,
          deleted: mutation.op === 'delete',
        },
        setOpts
      );
      if (roomId) store.materializeRoomViews(roomId, setOpts);
      return { ok: true, entityType, entityId, version, data, autoMerged: false };
    }

    if (expectedVersion === server.version) {
      const version = server.version + 1;
      const nextData =
        mutation.op === 'delete' ? { ...server.data, _deleted: true } : { ...server.data, ...data };
      store.setEntity(
        {
          roomId,
          entityType,
          entityId,
          patientId,
          version,
          data: nextData,
          deleted: mutation.op === 'delete',
        },
        setOpts
      );
      if (roomId) store.materializeRoomViews(roomId, setOpts);
      return { ok: true, entityType, entityId, version, data: nextData, autoMerged: false };
    }

    if (!baseData || !changedKeys.length) {
      const incomingData =
        mutation.op === 'delete'
          ? { ...(server.data || {}), _deleted: true, updatedAt: data.updatedAt || data.lanUpdatedAt }
          : { ...(server.data || {}), ...data };
      const keysToMerge = changedKeys.length ? changedKeys : Object.keys(data || {});
      const { merged } = mergeRecordsLww(server.data, incomingData, {
        changedKeys: keysToMerge.length ? keysToMerge : Object.keys(incomingData),
        timestampFields: ['lanUpdatedAt', 'updatedAt'],
      });
      const version = server.version + 1;
      store.setEntity(
        {
          roomId,
          entityType,
          entityId,
          patientId,
          version,
          data: merged,
          deleted: mutation.op === 'delete',
        },
        setOpts
      );
      if (roomId) store.materializeRoomViews(roomId, setOpts);
      return {
        ok: true,
        entityType,
        entityId,
        version,
        data: merged,
        autoMerged: false,
        lwwApplied: true,
        overwrittenKeys: ['*'],
      };
    }

    const serverChangedKeys = keysChanged(server.data, baseData);
    const overlap = serverChangedKeys.filter((k) => changedKeys.includes(k));
    if (overlap.length === 0) {
      const merged = { ...server.data, ...pick(data, changedKeys) };
      const version = server.version + 1;
      store.setEntity(
        {
          roomId,
          entityType,
          entityId,
          patientId,
          version,
          data: merged,
          deleted: mutation.op === 'delete' || !!server.deleted,
        },
        setOpts
      );
      if (roomId) store.materializeRoomViews(roomId, setOpts);
      return { ok: true, entityType, entityId, version, data: merged, autoMerged: true };
    }

    const incomingData =
      mutation.op === 'delete'
        ? { ...(server.data || {}), _deleted: true, updatedAt: data.updatedAt || data.lanUpdatedAt }
        : { ...(server.data || {}), ...data };
    const { merged, overwrittenKeys } = mergeRecordsLww(server.data, incomingData, {
      changedKeys: overlap,
      timestampFields: ['lanUpdatedAt', 'updatedAt'],
    });
    const version = server.version + 1;
    store.setEntity(
      {
        roomId,
        entityType,
        entityId,
        patientId,
        version,
        data: merged,
        deleted: mutation.op === 'delete',
      },
      setOpts
    );
    if (roomId) store.materializeRoomViews(roomId, setOpts);
    return {
      ok: true,
      entityType,
      entityId,
      version,
      data: merged,
      autoMerged: false,
      lwwApplied: true,
      overwrittenKeys,
    };
  }

  return { applyMutation, ConflictError, store };
}

module.exports = { createConflictResolver, ConflictError };
