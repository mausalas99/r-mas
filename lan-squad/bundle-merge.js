'use strict';
const { todoEntityKey, collectKeysFromBundlePayload } = require('./entity-keys.js');
const { appendAudit } = require('./audit-log.js');

function emptyBundle(nowIso) {
  return {
    revision: 0,
    entityVersions: {},
    agenda: [],
    todos: {},
    entries: [],
    manejo: null,
    uploadedByClientId: '',
    committedAt: nowIso,
    audit_log: [],
  };
}

function agendaById(agenda) {
  const map = new Map();
  for (const ev of agenda) {
    if (ev && ev.id) map.set(ev.id, ev);
  }
  return map;
}

function todosByKey(todos) {
  const map = new Map();
  if (!todos || typeof todos !== 'object') return map;
  for (const pid of Object.keys(todos)) {
    const arr = Array.isArray(todos[pid]) ? todos[pid] : [];
    for (const t of arr) {
      if (t && t.id) map.set(todoEntityKey(pid, t.id), { patientId: pid, item: t });
    }
  }
  return map;
}

function materializeTodos(map) {
  const todos = {};
  for (const { patientId, item } of map.values()) {
    if (!todos[patientId]) todos[patientId] = [];
    todos[patientId].push(item);
  }
  return todos;
}

/**
 * @param {object | null} serverBundle
 * @param {object} incoming
 * @param {{ clientId?: string, nowIso: () => string }} opts
 */
function mergeBundlePut(serverBundle, incoming, opts) {
  const nowIso = opts.nowIso();
  const clientId = String((incoming && incoming.clientId) || opts.clientId || '');
  const base = incoming && typeof incoming === 'object' ? incoming : {};
  const baseRevision = Number(base.baseRevision != null ? base.baseRevision : 0);
  const baseEntityVersions =
    base.baseEntityVersions && typeof base.baseEntityVersions === 'object'
      ? base.baseEntityVersions
      : {};

  let bundle = serverBundle && typeof serverBundle === 'object' ? serverBundle : null;
  if (!bundle) bundle = emptyBundle(nowIso);

  const serverRevision = Number(bundle.revision || 0);
  const serverEntityVersions =
    bundle.entityVersions && typeof bundle.entityVersions === 'object'
      ? { ...bundle.entityVersions }
      : {};

  if (serverRevision > 0 && baseRevision !== serverRevision) {
    return {
      ok: false,
      bundle,
      conflicts: [
        {
          key: '*',
          kind: 'bundle',
          localBaseVersion: baseRevision,
          serverVersion: serverRevision,
          local: { baseRevision },
          server: { revision: serverRevision },
        },
      ],
    };
  }

  const payloadKeys = collectKeysFromBundlePayload(base);
  const conflicts = [];
  const autoMergedKeys = [];

  for (const key of payloadKeys) {
    const baseVer = baseEntityVersions[key];
    const serverVer = serverEntityVersions[key];
    if (serverVer == null) {
      autoMergedKeys.push(key);
      continue;
    }
    if (baseVer == null || Number(baseVer) !== Number(serverVer)) {
      conflicts.push({
        key,
        kind: key.startsWith('a:') ? 'agenda' : key.startsWith('t:') ? 'todo' : key === 'manejo' ? 'manejo' : 'entity',
        patientId: key.startsWith('t:') ? key.split(':')[1] : undefined,
        localBaseVersion: baseVer == null ? 0 : Number(baseVer),
        serverVersion: Number(serverVer),
        local: extractPayloadForKey(base, key),
        server: extractPayloadForKey(bundle, key),
      });
    } else {
      autoMergedKeys.push(key);
    }
  }

  if (conflicts.length) {
    return { ok: false, bundle, conflicts };
  }

  if ('agenda' in base) {
    const agendaMap = agendaById(Array.isArray(bundle.agenda) ? bundle.agenda : []);
    const incomingAgenda = Array.isArray(base.agenda) ? base.agenda : [];
    for (const ev of incomingAgenda) {
      if (ev && ev.id) agendaMap.set(ev.id, { ...ev });
    }
    bundle.agenda = [...agendaMap.values()];
  }

  if ('todos' in base && base.todos && typeof base.todos === 'object') {
    const todoMap = todosByKey(bundle.todos);
    for (const pid of Object.keys(base.todos)) {
      const arr = Array.isArray(base.todos[pid]) ? base.todos[pid] : [];
      for (const t of arr) {
        if (t && t.id) todoMap.set(todoEntityKey(pid, t.id), { patientId: pid, item: { ...t } });
      }
    }
    bundle.todos = materializeTodos(todoMap);
  }

  if ('entries' in base) {
    bundle.entries = Array.isArray(base.entries) ? base.entries : [];
  }

  if ('manejo' in base) {
    bundle.manejo =
      base.manejo && typeof base.manejo === 'object'
        ? base.manejo
        : base.manejo === null
          ? null
          : bundle.manejo;
  }

  const nextEntityVersions = { ...serverEntityVersions };
  for (const key of payloadKeys) {
    nextEntityVersions[key] = Number(nextEntityVersions[key] || 0) + 1;
  }
  bundle.entityVersions = nextEntityVersions;
  bundle.revision = serverRevision + 1;
  bundle.committedAt = nowIso;
  bundle.uploadedByClientId = clientId;
  if (!Array.isArray(bundle.audit_log)) bundle.audit_log = [];
  appendAudit(
    {
      at: nowIso,
      clientId: clientId || 'host',
      action: 'bundle.put',
      detail: { revision: bundle.revision, keys: [...payloadKeys] },
    },
    bundle.audit_log
  );

  return { ok: true, bundle, autoMergedKeys };
}

function extractPayloadForKey(payload, key) {
  if (key === 'manejo') return payload.manejo || null;
  if (key.startsWith('a:')) {
    const id = key.slice(2);
    const list = Array.isArray(payload.agenda) ? payload.agenda : [];
    return list.find((e) => e && e.id === id) || null;
  }
  if (key.startsWith('t:')) {
    const parts = key.split(':');
    const pid = parts[1];
    const tid = parts[2];
    const arr =
      payload.todos && payload.todos[pid] && Array.isArray(payload.todos[pid])
        ? payload.todos[pid]
        : [];
    return arr.find((t) => t && t.id === tid) || null;
  }
  return null;
}

module.exports = { mergeBundlePut, emptyBundle };
