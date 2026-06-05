'use strict';

const { validateDeltaPaths, normalizeDeltaPath, applyPathValue } = require('./delta-paths.js');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function timestampFor(delta, path) {
  const meta = delta.pathMeta && (delta.pathMeta[path] || delta.pathMeta[normalizeDeltaPath(path)]);
  return Number(meta && meta.clientTimestamp ? meta.clientTimestamp : 0);
}

function shouldAcceptPath(currentMeta, incomingTs, clientId) {
  const currentTs = Number(currentMeta && currentMeta.clientTimestamp ? currentMeta.clientTimestamp : 0);
  if (incomingTs > currentTs) return true;
  if (incomingTs < currentTs) return false;
  const currentClient = String(currentMeta && currentMeta.clientId ? currentMeta.clientId : '');
  return String(clientId || '') > currentClient;
}

function buildRejectedMeta(fieldMeta, rejectedPaths) {
  const rejectedMeta = {};
  for (const path of rejectedPaths) {
    const meta = fieldMeta[path] || {};
    rejectedMeta[path] = {
      winnerClientId: meta.clientId || null,
      winnerCommittedAt: meta.committedAt || null,
    };
  }
  return rejectedMeta;
}

function createDeltaResolver({ store, nowIso = () => new Date().toISOString() }) {
  function applyDelta(delta) {
    const entityType = String(delta && delta.entityType ? delta.entityType : '');
    const validation = validateDeltaPaths(entityType, delta);
    if (!validation.ok) {
      return {
        ok: false,
        status: 'invalid_delta',
        error: validation.error,
        acceptedPaths: [],
        rejectedPaths: validation.rejectedPaths || [],
      };
    }

    const roomId = String(delta.roomId || '').trim();
    const entityId = String(delta.entityId || '').trim();
    const patientId = delta.patientId != null ? String(delta.patientId) : entityId;
    const clientId = String(delta.clientId || 'unknown');
    const txId = String(delta.txId || '');
    const existing =
      store.getEntity({ roomId, entityType, entityId, patientId }) ||
      { version: 0, data: {}, fieldMeta: {} };
    const data = clone(existing.data || {});
    const fieldMeta = clone(existing.fieldMeta || {});
    const acceptedPaths = [];
    const rejectedPaths = [];
    const committedAt = nowIso();

    for (const path of validation.paths) {
      const incomingTs = timestampFor(delta, path);
      if (!shouldAcceptPath(fieldMeta[path], incomingTs, clientId)) {
        rejectedPaths.push(path);
        continue;
      }
      applyPathValue(data, path, delta.pathValues[path]);
      acceptedPaths.push(path);
    }

    if (!acceptedPaths.length) {
      return {
        ok: false,
        status: 'stale_delta',
        entityType,
        entityId,
        patientId,
        acceptedPaths: [],
        rejectedPaths,
        rejectedMeta: buildRejectedMeta(fieldMeta, rejectedPaths),
      };
    }

    const commit = store.commitDeltaEntity({
      roomId,
      entityType,
      entityId,
      patientId,
      data,
      fieldMeta,
      clientId,
      txId,
      acceptedPaths,
      buildFieldMeta({ deltaSeq, committedAt: hostCommittedAt, previousFieldMeta }) {
        const nextMeta = { ...previousFieldMeta };
        for (const path of acceptedPaths) {
          nextMeta[path] = {
            clientTimestamp: timestampFor(delta, path),
            committedAt: hostCommittedAt,
            deltaSeq,
            clientId,
          };
        }
        return nextMeta;
      },
    });

    const out = {
      ok: true,
      status: rejectedPaths.length ? 'partial_success' : 'ok',
      roomId,
      entityType,
      entityId,
      patientId,
      originClientId: clientId,
      txId,
      deltaSeq: commit.deltaSeq,
      version: commit.version,
      acceptedPaths,
      rejectedPaths,
      rejectedMeta: buildRejectedMeta(fieldMeta, rejectedPaths),
      pathValues: Object.fromEntries(acceptedPaths.map((path) => [path, delta.pathValues[path]])),
      fieldMeta: Object.fromEntries(acceptedPaths.map((path) => [path, commit.rec.fieldMeta[path]])),
    };

    store.appendDeltaLog(roomId, out);
    if (roomId) store.materializeRoomViews(roomId);
    return out;
  }

  return { applyDelta };
}

module.exports = { createDeltaResolver };
