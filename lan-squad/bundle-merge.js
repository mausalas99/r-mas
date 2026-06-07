'use strict';
const {
  todoEntityKey,
  agendaEntityKey,
  collectKeysFromBundlePayload,
} = require('./entity-keys.js');
const { compareUpdatedAt, recordTimestamp } = require('./lww-utils.js');
const { appendAudit } = require('./audit-log.js');
const { mergeClinicalOpsSnapshotsData } = require('../lib/db/clinical-ops-bundle-merge.cjs');

function emptyBundle(nowIso) {
  return {
    revision: 0,
    entityVersions: {},
    agenda: [],
    todos: {},
    entries: [],
    manejo: null,
    clinicalOps: null,
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

/** Fields whose values are maintained by typed endpoints — never overwritten by safety bundle. */
const TYPED_ENTRY_FIELDS = new Set(['note', 'indicaciones', 'labHistory', 'todos']);

/**
 * Merges a safety-bundle (partial) entry into the server's version.
 * Typed fields are preserved from serverEntry; all other fields come from incomingEntry.
 * New entries (no server match) are not handled here — they are appended directly.
 *
 * @param {object} serverEntry - Current server entry for this patient.
 * @param {object} incomingEntry - Entry from the partial safety bundle.
 * @returns {object} Merged entry.
 */
function mergePartialEntry(serverEntry, incomingEntry) {
  const merged = { ...serverEntry };
  for (const [key, val] of Object.entries(incomingEntry)) {
    if (!TYPED_ENTRY_FIELDS.has(key)) {
      merged[key] = val;
    }
  }
  return merged;
}

function mergeEntityLww(serverRec, incomingRec) {
  const cmp = compareUpdatedAt(recordTimestamp(serverRec), recordTimestamp(incomingRec));
  if (cmp < 0) return { winner: incomingRec, overwritten: true };
  if (cmp > 0) return { winner: serverRec, overwritten: false };
  return {
    winner: incomingRec,
    overwritten: JSON.stringify(serverRec) !== JSON.stringify(incomingRec),
  };
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

  const payloadKeys = collectKeysFromBundlePayload(base);
  const payloadKeyList = [...payloadKeys];
  const lwwAppliedKeys = [];
  const revisionSkew = serverRevision > 0 && baseRevision !== serverRevision;

  if (revisionSkew && payloadKeyList.length === 0) {
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
  if (revisionSkew) {
    lwwAppliedKeys.push('*');
  }

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
        kind: key.startsWith('a:') ? 'agenda' : key.startsWith('t:') ? 'todo' : key === 'manejo' ? 'manejo' : key === 'clinicalOps' ? 'clinicalOps' : 'entity',
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

  const conflictKeys = new Set(conflicts.map((c) => c.key));

  if ('agenda' in base) {
    const agendaMap = agendaById(Array.isArray(bundle.agenda) ? bundle.agenda : []);
    const incomingAgenda = Array.isArray(base.agenda) ? base.agenda : [];
    for (const ev of incomingAgenda) {
      if (!ev || !ev.id) continue;
      const key = agendaEntityKey(ev.id);
      const serverEv = agendaMap.get(ev.id);
      if (conflictKeys.has(key) && serverEv) {
        const { winner, overwritten } = mergeEntityLww(serverEv, ev);
        agendaMap.set(ev.id, { ...winner });
        if (overwritten) lwwAppliedKeys.push(key);
      } else {
        agendaMap.set(ev.id, { ...ev });
      }
    }
    bundle.agenda = [...agendaMap.values()];
  }

  if ('todos' in base && base.todos && typeof base.todos === 'object') {
    const todoMap = todosByKey(bundle.todos);
    for (const pid of Object.keys(base.todos)) {
      const arr = Array.isArray(base.todos[pid]) ? base.todos[pid] : [];
      for (const t of arr) {
        if (!t || !t.id) continue;
        const key = todoEntityKey(pid, t.id);
        const existing = todoMap.get(key);
        if (conflictKeys.has(key) && existing?.item) {
          const { winner, overwritten } = mergeEntityLww(existing.item, t);
          todoMap.set(key, { patientId: pid, item: { ...winner } });
          if (overwritten) lwwAppliedKeys.push(key);
        } else {
          todoMap.set(key, { patientId: pid, item: { ...t } });
        }
      }
    }
    bundle.todos = materializeTodos(todoMap);
  }

  if ('entries' in base) {
    const incomingEntries = Array.isArray(base.entries) ? base.entries : [];
    if (base.entriesPartial === true) {
      // Partial merge: preserve typed fields from server; apply untyped from client.
      const serverById = new Map((bundle.entries || []).map((e) => [e && e.id, e]));
      const result = [...(bundle.entries || [])]; // start from server entries
      const serverIdSet = new Set(serverById.keys());
      for (const incoming of incomingEntries) {
        if (!incoming || !incoming.id) continue;
        if (serverIdSet.has(incoming.id)) {
          const idx = result.findIndex((e) => e && e.id === incoming.id);
          if (idx >= 0) result[idx] = mergePartialEntry(result[idx], incoming);
        } else {
          result.push(incoming); // new entry not on server — append
        }
      }
      bundle.entries = result;
    } else {
      bundle.entries = incomingEntries;
    }
  }

  if ('manejo' in base) {
    bundle.manejo =
      base.manejo && typeof base.manejo === 'object'
        ? base.manejo
        : base.manejo === null
          ? null
          : bundle.manejo;
  }

  if ('clinicalOps' in base) {
    const incomingOps =
      base.clinicalOps && typeof base.clinicalOps === 'object' ? base.clinicalOps : null;
    const serverOps =
      bundle.clinicalOps && typeof bundle.clinicalOps === 'object' ? bundle.clinicalOps : null;
    // A routine sync-bundle push with no roster (empty clinicalOps cache → null) must
    // never delete the cumulative host roster; only union when a roster is present.
    // This matters for LAN-only hosts whose clinical DB is locked, where the in-memory
    // bundle is the only copy and cannot self-heal from a DB re-export.
    if (incomingOps) {
      bundle.clinicalOps = serverOps
        ? mergeClinicalOpsSnapshotsData(serverOps, incomingOps)
        : incomingOps;
    }
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

  return { ok: true, bundle, autoMergedKeys, lwwAppliedKeys };
}

function extractPayloadForKey(payload, key) {
  if (key === 'manejo') return payload.manejo || null;
  if (key === 'clinicalOps') return payload.clinicalOps || null;
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
