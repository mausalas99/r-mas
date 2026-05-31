'use strict';
const { collectKeysFromBundlePayload } = require('./entity-keys.js');

function buildEntityVersionsFromBundle(bundle) {
  const versions = {};
  const keys = collectKeysFromBundlePayload(bundle);
  for (const k of keys) versions[k] = 1;
  return versions;
}

function migrateBundleV1ToV2(bundle) {
  if (!bundle || typeof bundle !== 'object') return bundle;
  const committedAt = String(bundle.committedAt || bundle.updatedAt || new Date().toISOString());
  return {
    revision: Number(bundle.revision || 1),
    entityVersions:
      bundle.entityVersions && typeof bundle.entityVersions === 'object'
        ? bundle.entityVersions
        : buildEntityVersionsFromBundle(bundle),
    agenda: Array.isArray(bundle.agenda) ? bundle.agenda : [],
    todos: bundle.todos && typeof bundle.todos === 'object' ? bundle.todos : {},
    entries: Array.isArray(bundle.entries) ? bundle.entries : [],
    manejo: bundle.manejo && typeof bundle.manejo === 'object' ? bundle.manejo : null,
    uploadedByClientId: String(bundle.uploadedByClientId || ''),
    committedAt,
    audit_log: Array.isArray(bundle.audit_log) ? bundle.audit_log : [],
  };
}

function migrateHostStateIfNeeded(state) {
  if (!state || typeof state !== 'object') return state;
  if (Number(state.version) === 2) return state;
  const next = { ...state, version: 2 };
  next.patients = Array.isArray(state.patients) ? state.patients : [];
  for (const p of next.patients) {
    if (p && typeof p === 'object') {
      if (p.version == null) p.version = 1;
      if (!Array.isArray(p.audit_log)) p.audit_log = [];
    }
  }
  next.rooms = Array.isArray(state.rooms) ? state.rooms : [];
  for (const r of next.rooms) {
    if (r && typeof r === 'object') {
      if (r.version == null) r.version = 1;
      if (!Array.isArray(r.audit_log)) r.audit_log = [];
    }
  }
  const bundles =
    state.roomSyncBundles && typeof state.roomSyncBundles === 'object'
      ? state.roomSyncBundles
      : {};
  next.roomSyncBundles = {};
  for (const rid of Object.keys(bundles)) {
    next.roomSyncBundles[rid] = migrateBundleV1ToV2(bundles[rid]);
  }
  delete next.calendarEvents;
  return next;
}

module.exports = { migrateHostStateIfNeeded, migrateBundleV1ToV2, buildEntityVersionsFromBundle };
