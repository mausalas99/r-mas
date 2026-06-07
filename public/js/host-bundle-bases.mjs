/** Tracks last known host sync-bundle revision per room (LAN cold storage). */

import { agendaEntityKey, todoEntityKey } from './live-sync-room.mjs';

const BASES_KEY = 'rpc-lan-host-bundle-bases';

function readAll() {
  try {
    const raw = localStorage.getItem(BASES_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch (_e) {
    return {};
  }
}

function writeAll(map) {
  localStorage.setItem(BASES_KEY, JSON.stringify(map));
}

/** @param {string} roomId */
export function getHostBundleBases(roomId) {
  const rid = String(roomId || '').trim();
  if (!rid) return { revision: 0, entityVersions: {} };
  const row = readAll()[rid];
  if (!row || typeof row !== 'object') return { revision: 0, entityVersions: {} };
  return {
    revision: Number(row.revision || 0),
    entityVersions:
      row.entityVersions && typeof row.entityVersions === 'object' ? row.entityVersions : {},
  };
}

/** @param {string} roomId @param {{ revision?: number, entityVersions?: Record<string, number> }} bundle */
export function setHostBundleBases(roomId, bundle) {
  const rid = String(roomId || '').trim();
  if (!rid || !bundle) return;
  const all = readAll();
  all[rid] = {
    revision: Number(bundle.revision || 0),
    entityVersions:
      bundle.entityVersions && typeof bundle.entityVersions === 'object'
        ? bundle.entityVersions
        : {},
  };
  writeAll(all);
}

function collectKeysFromEnvelope(envelope) {
  const keys = new Set();
  if (!envelope || typeof envelope !== 'object') return keys;
  const agenda = Array.isArray(envelope.agenda) ? envelope.agenda : [];
  for (const ev of agenda) {
    if (ev && ev.id) keys.add(agendaEntityKey(ev.id));
  }
  const todos = envelope.todos && typeof envelope.todos === 'object' ? envelope.todos : {};
  for (const pid of Object.keys(todos)) {
    const arr = Array.isArray(todos[pid]) ? todos[pid] : [];
    for (const t of arr) {
      if (t && t.id) keys.add(todoEntityKey(pid, t.id));
    }
  }
  if (envelope.manejo && typeof envelope.manejo === 'object') keys.add('manejo');
  if (envelope.clinicalOps && typeof envelope.clinicalOps === 'object') keys.add('clinicalOps');
  return keys;
}

/** @param {object} envelope @param {Record<string, number>} serverEntityVersions */
export function buildBaseEntityVersionsForEnvelope(envelope, serverEntityVersions) {
  const versions = serverEntityVersions || {};
  const baseEntityVersions = {};
  for (const key of collectKeysFromEnvelope(envelope)) {
    baseEntityVersions[key] = versions[key] != null ? Number(versions[key]) : 0;
  }
  return baseEntityVersions;
}

/** @param {string} roomId @param {object} envelope */
export function hostBundlePutBodyFromEnvelope(roomId, envelope) {
  const bases = getHostBundleBases(roomId);
  if (envelope.entriesPartial === true) {
    return {
      baseRevision: bases.revision,
      baseEntityVersions: {},
      uploadedByClientId: envelope.clientId || '',
      entries: envelope.entries || [],
      entriesPartial: true,
    };
  }
  const body = {
    baseRevision: bases.revision,
    baseEntityVersions: buildBaseEntityVersionsForEnvelope(envelope, bases.entityVersions),
    uploadedByClientId: envelope.clientId || '',
    agenda: envelope.agenda || [],
    todos: envelope.todos || {},
    entries: envelope.entries || [],
    manejo: envelope.manejo != null ? envelope.manejo : null,
  };
  if (envelope.clinicalOps != null && typeof envelope.clinicalOps === 'object') {
    body.clinicalOps = envelope.clinicalOps;
  }
  return body;
}
