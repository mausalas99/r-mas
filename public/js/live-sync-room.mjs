/** LiveSync por sala: merge por entityVersion (sin LWW por reloj en la capa de red). */

export const LAN_CLIENT_ID_KEY = 'rpc-lan-client-id';
export const LAN_ROOM_SNAPSHOTS_KEY = 'rpc-lan-room-snapshots';

export function compareIso(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  if (x > y) return 1;
  if (x < y) return -1;
  return 0;
}

export function agendaEntityKey(id) {
  return 'a:' + String(id || '');
}

export function todoEntityKey(patientId, id) {
  return 't:' + String(patientId || '') + ':' + String(id || '');
}

export function patientEntityKey(id, registro) {
  const reg = String(registro || '').trim();
  if (reg) return 'reg:' + reg;
  return 'id:' + String(id || '');
}

/**
 * Tombstones locales (_deleted) → parches para que el merge no reviva pendientes del host.
 * @param {Record<string, { version?: number, updatedAt?: string, _deleted?: boolean }>} entityMap
 */
export function liveSyncDeletePatchesFromEntityMap(entityMap) {
  const patches = [];
  if (!entityMap || typeof entityMap !== 'object') return patches;
  for (const key of Object.keys(entityMap)) {
    const row = entityMap[key];
    if (!row || row._deleted !== true) continue;
    if (key.startsWith('todo:')) {
      const rest = key.slice(5);
      const colon = rest.indexOf(':');
      if (colon < 0) continue;
      patches.push({
        type: 'livesync:patch',
        entity: 'todo',
        op: 'delete',
        id: rest.slice(colon + 1),
        patientId: rest.slice(0, colon),
        entityVersion: row.version != null ? Number(row.version) : null,
        updatedAt: String(row.updatedAt || row.lanUpdatedAt || ''),
      });
      continue;
    }
    if (key.startsWith('agenda:')) {
      patches.push({
        type: 'livesync:patch',
        entity: 'agenda',
        op: 'delete',
        id: key.slice(7),
        entityVersion: row.version != null ? Number(row.version) : null,
        updatedAt: String(row.updatedAt || row.lanUpdatedAt || ''),
      });
    }
  }
  return patches;
}

export function isDemoPatientId(patientId) {
  return String(patientId || '').indexOf('demo-') === 0;
}

function versionFromSource(src, key) {
  if (!src || !src.entityVersions || src.entityVersions[key] == null) return null;
  return Number(src.entityVersions[key]);
}

function shouldAcceptEntry(cur, nextVersion, nextUpdatedAt) {
  if (!cur) return true;
  const curVer = cur.entityVersion;
  if (nextVersion != null && curVer != null) {
    if (nextVersion > curVer) return true;
    if (nextVersion < curVer) return false;
  }
  return compareIso(nextUpdatedAt, cur.updatedAt) >= 0;
}

function normalizeLiveSyncPatch(patch) {
  if (!patch || patch.type !== 'livesync:patch') return null;
  if (patch.mutation && typeof patch.mutation === 'object') {
    const m = patch.mutation;
    const data = m.data && typeof m.data === 'object' ? m.data : {};
    const deleted = m.op === 'delete' || data._deleted === true;
    return {
      type: 'livesync:patch',
      entity: m.entityType,
      op: deleted ? 'delete' : 'upsert',
      id: m.entityId,
      patientId: m.patientId || data.patientId,
      registro: data.registro,
      body: data,
      entityVersion:
        m.version != null
          ? Number(m.version)
          : m.expectedVersion != null
            ? Number(m.expectedVersion) + 1
            : null,
      updatedAt: String(data.updatedAt || patch.updatedAt || new Date().toISOString()),
    };
  }
  return patch;
}

/** @param {Array<{ agenda?: object[], todos?: Record<string, object[]>, entityVersions?: Record<string, number> }>} sources */
export function mergeLiveSyncBundles(sources) {
  /** @type {Map<string, { kind: 'agenda', item: object, updatedAt: string, entityVersion: number | null, deleted: boolean }>} */
  const agenda = new Map();
  /** @type {Map<string, { kind: 'todo', patientId: string, item: object, updatedAt: string, entityVersion: number | null, deleted: boolean }>} */
  const todos = new Map();
  /** @type {Map<string, { id: string, registro: string, updatedAt: string, entityVersion: number | null, deleted: boolean }>} */
  const patientDeletes = new Map();
  const todoTouchedPatientIds = new Set();

  function blocksResurrectingDeleted(cur, deleted, ver) {
    if (!cur || !cur.deleted || deleted) return false;
    if (ver == null || cur.entityVersion == null) return true;
    return ver <= cur.entityVersion;
  }

  function upsertAgenda(ev, deleted, entityVersion, updatedAt, src) {
    if (!ev || !ev.id || isDemoPatientId(ev.patientId)) return;
    const k = agendaEntityKey(ev.id);
    const ver =
      entityVersion != null
        ? entityVersion
        : versionFromSource(src, k) ?? (ev.version != null ? Number(ev.version) : null);
    const at = String(updatedAt || ev.updatedAt || ev.createdAt || '');
    const cur = agenda.get(k);
    if (blocksResurrectingDeleted(cur, deleted, ver)) return;
    if (shouldAcceptEntry(cur, ver, at)) {
      agenda.set(k, {
        kind: 'agenda',
        item: deleted ? { id: ev.id } : { ...ev },
        updatedAt: at,
        entityVersion: ver,
        deleted: !!deleted,
      });
    }
  }

  function upsertTodo(patientId, item, deleted, entityVersion, updatedAt, src) {
    if (!item || !item.id || isDemoPatientId(patientId)) return;
    const k = todoEntityKey(patientId, item.id);
    const ver =
      entityVersion != null
        ? entityVersion
        : versionFromSource(src, k) ?? (item.version != null ? Number(item.version) : null);
    const at = String(updatedAt || item.updatedAt || item.createdAt || '');
    const cur = todos.get(k);
    if (blocksResurrectingDeleted(cur, deleted, ver)) return;
    if (shouldAcceptEntry(cur, ver, at)) {
      todos.set(k, {
        kind: 'todo',
        patientId: String(patientId),
        item: deleted ? { id: item.id } : { ...item },
        updatedAt: at,
        entityVersion: ver,
        deleted: !!deleted,
      });
    }
  }

  function ingestSource(src) {
    if (!src) return;
    const list = Array.isArray(src.agenda) ? src.agenda : [];
    for (let i = 0; i < list.length; i += 1) {
      upsertAgenda(list[i], false, null, null, src);
    }
    const map = src.todos && typeof src.todos === 'object' ? src.todos : {};
    for (const pid of Object.keys(map)) {
      if (isDemoPatientId(pid)) continue;
      const arr = Array.isArray(map[pid]) ? map[pid] : [];
      for (let j = 0; j < arr.length; j += 1) {
        upsertTodo(pid, arr[j], false, null, null, src);
      }
    }
    const patches = Array.isArray(src.patches) ? src.patches : [];
    for (let p = 0; p < patches.length; p += 1) {
      applyPatch(patches[p]);
    }
  }

  function applyPatch(rawPatch) {
    const patch = normalizeLiveSyncPatch(rawPatch);
    if (!patch) return;
    const at = String(patch.updatedAt || '');
    const patchVer = patch.entityVersion != null ? Number(patch.entityVersion) : null;
    if (patch.entity === 'agenda') {
      const k = agendaEntityKey(patch.id);
      if (patch.op === 'delete') {
        const cur = agenda.get(k);
        if (shouldAcceptEntry(cur, patchVer, at)) {
          agenda.set(k, {
            kind: 'agenda',
            item: { id: patch.id },
            updatedAt: at,
            entityVersion: patchVer,
            deleted: true,
          });
        }
      } else {
        upsertAgenda(
          { ...(patch.body || {}), id: patch.id, updatedAt: at },
          false,
          patchVer,
          at,
          null
        );
      }
      return;
    }
    if (patch.entity === 'todo') {
      const pid = String(patch.patientId || '');
      if (pid) todoTouchedPatientIds.add(pid);
      if (patch.op === 'delete') {
        const k = todoEntityKey(pid, patch.id);
        const cur = todos.get(k);
        if (shouldAcceptEntry(cur, patchVer, at)) {
          todos.set(k, {
            kind: 'todo',
            patientId: pid,
            item: { id: patch.id },
            updatedAt: at,
            entityVersion: patchVer,
            deleted: true,
          });
        }
      } else {
        upsertTodo(pid, { ...(patch.body || {}), id: patch.id, updatedAt: at }, false, patchVer, at, null);
      }
      return;
    }
    if (patch.entity === 'patient') {
      const k = patientEntityKey(patch.id, patch.registro);
      if (patch.op === 'delete') {
        const cur = patientDeletes.get(k);
        if (shouldAcceptEntry(cur, patchVer, at)) {
          patientDeletes.set(k, {
            id: String(patch.id || ''),
            registro: String(patch.registro || '').trim(),
            updatedAt: at,
            entityVersion: patchVer,
            deleted: true,
          });
        }
      }
    }
  }

  for (let s = 0; s < (sources || []).length; s += 1) {
    const src = sources[s];
    if (src && src.type === 'livesync:patch') {
      applyPatch(src);
    } else {
      ingestSource(src);
    }
  }

  const agendaOut = [];
  for (const row of agenda.values()) {
    if (!row.deleted && row.item && row.item.id) agendaOut.push(row.item);
  }

  const todosOut = {};
  for (const row of todos.values()) {
    if (row.deleted) continue;
    if (!row.item || !row.item.id) continue;
    if (!todosOut[row.patientId]) todosOut[row.patientId] = [];
    todosOut[row.patientId].push(row.item);
  }

  const patientDeletesOut = [];
  for (const row of patientDeletes.values()) {
    if (row.deleted) patientDeletesOut.push(row);
  }

  return {
    agenda: agendaOut,
    todos: todosOut,
    todoTouchedPatientIds: Array.from(todoTouchedPatientIds),
    patientDeletes: patientDeletesOut,
  };
}

/** @param {{ getScheduledProcedures: () => object[], getTodos: (id: string) => object[], patientIds?: string[] }} storageApi */
export function buildRoomSnapshotFromStorage(storageApi, patientIds) {
  const agenda = storageApi.getScheduledProcedures().filter((ev) => !isDemoPatientId(ev.patientId));
  const todos = {};
  const ids = Array.isArray(patientIds) ? patientIds : [];
  for (let i = 0; i < ids.length; i += 1) {
    const pid = ids[i];
    if (isDemoPatientId(pid)) continue;
    const list = storageApi.getTodos(pid);
    if (list.length) todos[pid] = list;
  }
  return {
    savedAt: new Date().toISOString(),
    agenda,
    todos,
  };
}

export function parseRoomSnapshotsRaw(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return raw;
}

export function nextRoomSnapshotGeneration(prev) {
  const n = Number(prev && prev.generation != null ? prev.generation : 0);
  return n + 1;
}

export function isLiveSyncEnvelope(msg) {
  return !!(msg && typeof msg.type === 'string' && msg.type.indexOf('livesync:') === 0);
}
