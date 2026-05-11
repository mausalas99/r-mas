function clone(value) {
  return JSON.parse(JSON.stringify(value == null ? null : value));
}

function ensureMeta(state) {
  var meta = state.liveSyncMeta && typeof state.liveSyncMeta === 'object'
    ? clone(state.liveSyncMeta)
    : {};
  if (!Array.isArray(meta.appliedEventIds)) meta.appliedEventIds = [];
  if (!meta.entityVersions || typeof meta.entityVersions !== 'object') meta.entityVersions = {};
  if (!Array.isArray(meta.conflicts)) meta.conflicts = [];
  return meta;
}

function currentIso(now) {
  return now || new Date().toISOString();
}

function bumpVersion(meta, entityType, entityId) {
  if (!meta.entityVersions[entityType]) meta.entityVersions[entityType] = {};
  var current = Number(meta.entityVersions[entityType][entityId] || 0);
  meta.entityVersions[entityType][entityId] = current + 1;
}

function getVersion(meta, entityType, entityId) {
  var group = meta.entityVersions[entityType] || {};
  return Number(group[entityId] || 0);
}

function sameLabEntry(a, b) {
  if (!a || !b) return false;
  if (String(a.fecha || '') !== String(b.fecha || '')) return false;
  if (String(a.hora || '') !== String(b.hora || '')) return false;
  return JSON.stringify(a.resLabs || []) === JSON.stringify(b.resLabs || []);
}

export function buildLiveSyncSnapshot(state, opts) {
  var o = opts || {};
  return {
    format: 'r-plus-live-sync-snapshot',
    version: 1,
    sessionId: o.sessionId || '',
    createdAt: currentIso(o.now),
    sourceDeviceId: o.sourceDeviceId || '',
    data: {
      patients: clone(state.patients || []),
      notes: clone(state.notes || {}),
      indicaciones: clone(state.indicaciones || {}),
      labHistory: clone(state.labHistory || {}),
      medRecetaByPatient: clone(state.medRecetaByPatient || {}),
      listadoProblemas: clone(state.listadoProblemas || {}),
      settings: clone(state.settings || {}),
      medCatalog: clone(state.medCatalog || {}),
    },
  };
}

export function applyLiveSyncSnapshot(state, snapshot) {
  var next = clone(state || {});
  var data = snapshot && snapshot.data ? snapshot.data : {};
  next.patients = clone(data.patients || []);
  next.notes = clone(data.notes || {});
  next.indicaciones = clone(data.indicaciones || {});
  next.labHistory = clone(data.labHistory || {});
  next.medRecetaByPatient = clone(data.medRecetaByPatient || {});
  next.listadoProblemas = clone(data.listadoProblemas || {});
  next.settings = clone(data.settings || {});
  next.medCatalog = clone(data.medCatalog || {});
  next.liveSyncMeta = ensureMeta(next);
  next.liveSyncMeta.appliedEventIds = [];
  next.liveSyncMeta.conflicts = [];
  return next;
}

export function createLiveSyncEvent(input) {
  var i = input || {};
  return {
    format: 'r-plus-live-sync-event',
    version: 1,
    eventId: i.eventId || (String(Date.now()) + '-' + Math.random().toString(36).slice(2)),
    sessionId: i.sessionId || '',
    sourceDeviceId: i.sourceDeviceId || '',
    entityType: i.entityType || '',
    entityId: i.entityId || '',
    op: i.op || '',
    baseVersion: Number(i.baseVersion || 0),
    createdAt: currentIso(i.now),
    payload: clone(i.payload || {}),
  };
}

export function applyLiveSyncEvent(state, event) {
  var next = clone(state || {});
  var meta = ensureMeta(next);
  if (meta.appliedEventIds.indexOf(event.eventId) !== -1) {
    next.liveSyncMeta = meta;
    return next;
  }

  var localVersion = getVersion(meta, event.entityType, event.entityId);
  if (Number(event.baseVersion) < localVersion) {
    meta.conflicts.unshift({
      eventId: event.eventId,
      entityType: event.entityType,
      entityId: event.entityId,
      localVersion: localVersion,
      remoteBaseVersion: event.baseVersion,
      createdAt: event.createdAt,
    });
    if (meta.conflicts.length > 50) meta.conflicts = meta.conflicts.slice(0, 50);
  }

  if (event.op === 'patient.upsert') {
    next.patients = Array.isArray(next.patients) ? next.patients : [];
    var idx = next.patients.findIndex(function(p) { return p && p.id === event.entityId; });
    if (idx >= 0) next.patients[idx] = Object.assign({}, next.patients[idx], event.payload);
    else next.patients.unshift(Object.assign({ id: event.entityId }, event.payload));
  } else if (event.op === 'patient.delete') {
    next.patients = (next.patients || []).filter(function(p) { return p && p.id !== event.entityId; });
    delete next.notes[event.entityId];
    delete next.indicaciones[event.entityId];
    delete next.labHistory[event.entityId];
    delete next.medRecetaByPatient[event.entityId];
    delete next.listadoProblemas[event.entityId];
  } else if (event.op === 'notes.update') {
    next.notes[event.entityId] = Object.assign({}, next.notes[event.entityId] || {}, event.payload);
  } else if (event.op === 'indicaciones.update') {
    next.indicaciones[event.entityId] = Object.assign({}, next.indicaciones[event.entityId] || {}, event.payload);
  } else if (event.op === 'listado.update') {
    next.listadoProblemas[event.entityId] = Object.assign({}, next.listadoProblemas[event.entityId] || {}, event.payload);
  } else if (event.op === 'medReceta.update') {
    next.medRecetaByPatient[event.entityId] = clone(event.payload);
  } else if (event.op === 'settings.update') {
    next.settings = Object.assign({}, next.settings || {}, event.payload);
  } else if (event.op === 'medCatalog.update') {
    next.medCatalog = Object.assign({}, next.medCatalog || {}, event.payload);
  } else if (event.op === 'labHistory.append') {
    if (!next.labHistory[event.entityId]) next.labHistory[event.entityId] = [];
    var exists = next.labHistory[event.entityId].some(function(row) { return sameLabEntry(row, event.payload); });
    if (!exists) next.labHistory[event.entityId].push(clone(event.payload));
  } else if (event.op === 'labHistory.delete') {
    next.labHistory[event.entityId] = (next.labHistory[event.entityId] || []).filter(function(row) {
      return row && row.id !== event.payload.id;
    });
  }

  meta.appliedEventIds.push(event.eventId);
  if (meta.appliedEventIds.length > 500) meta.appliedEventIds = meta.appliedEventIds.slice(-500);
  bumpVersion(meta, event.entityType, event.entityId);
  next.liveSyncMeta = meta;
  return next;
}

export function listConflictRecords(state) {
  return ensureMeta(state || {}).conflicts;
}
