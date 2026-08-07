/**
 * Pure cloud pull state folding (no renderer/LAN imports — safe for unit tests).
 */

const ENTRY_SKIP_KEYS = new Set([
  'id',
  'note',
  'indicaciones',
  'historiaClinica',
  'eventualidades',
  'monitoreo',
  'fields',
]);

/** @param {Record<string, unknown>} sidecarMap */
export function assembleLabHistoryFromSidecars(sidecarMap) {
  if (!sidecarMap || typeof sidecarMap !== 'object') return [];
  return Object.values(sidecarMap).filter((row) => row && typeof row === 'object');
}

/** @param {Record<string, unknown>} entry */
function buildPatientFromCloudEntry(entry) {
  const patientId = String(entry.id).trim();
  const fields = entry.fields;
  const patient = {
    id: patientId,
    ...(fields && typeof fields === 'object' ? fields : {}),
  };
  for (const [key, value] of Object.entries(entry)) {
    if (ENTRY_SKIP_KEYS.has(key)) continue;
    patient[key] = value;
  }
  if (entry.eventualidades) patient.eventualidades = entry.eventualidades;
  if (entry.monitoreo) patient.monitoreo = entry.monitoreo;
  return patient;
}

/**
 * @param {Record<string, unknown>} entry
 * @param {Record<string, unknown>} labSidecarsForPatient
 */
export function cloudEntryToLanEntry(entry, labSidecarsForPatient) {
  if (!entry?.id) return null;
  const note = entry.note;
  const indicaciones = entry.indicaciones;
  return {
    patient: buildPatientFromCloudEntry(entry),
    note: note && typeof note === 'object' ? note : {},
    indicaciones: indicaciones && typeof indicaciones === 'object' ? indicaciones : {},
    labHistory: assembleLabHistoryFromSidecars(labSidecarsForPatient),
  };
}

/** @param {Record<string, unknown>} state */
export function cloudStateToLanEntries(state) {
  const labSidecars = state?.labSidecars && typeof state.labSidecars === 'object' ? state.labSidecars : {};
  const rows = Array.isArray(state?.entries) ? state.entries : [];
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    const pid = String(rows[i]?.id || '').trim();
    const lanEntry = cloudEntryToLanEntry(rows[i], labSidecars[pid] || {});
    if (lanEntry) out.push(lanEntry);
  }
  return out;
}

/**
 * @typedef {{
 *   entries: Map<string, Record<string, unknown>>,
 *   labSidecars: Record<string, Record<string, unknown>>,
 *   todos: Record<string, unknown>,
 *   agenda: Record<string, unknown>,
 *   clinicalOps: unknown,
 *   tombstones: Record<string, unknown>,
 * }} OpFold
 */

/** @returns {OpFold} */
export function createOpFold() {
  return {
    entries: new Map(),
    labSidecars: {},
    todos: {},
    agenda: {},
    clinicalOps: undefined,
    tombstones: {},
  };
}

/** @param {OpFold} fold @param {string} pid @param {unknown} value */
function foldEntryRoot(fold, pid, value) {
  const prev = fold.entries.get(pid) || { id: pid };
  fold.entries.set(pid, { ...prev, ...(value && typeof value === 'object' ? value : {}), id: pid });
}

/** @param {OpFold} fold @param {string} pid @param {string} field @param {unknown} value */
function foldEntryField(fold, pid, field, value) {
  const prev = fold.entries.get(pid) || { id: pid };
  prev[field] = value;
  fold.entries.set(pid, prev);
}

/** @param {OpFold} fold @param {string} patientId @param {string} setId @param {unknown} value */
function foldLabSidecar(fold, patientId, setId, value) {
  if (!fold.labSidecars[patientId]) fold.labSidecars[patientId] = {};
  fold.labSidecars[patientId][setId] = value;
}

/** @param {OpFold} fold @param {unknown} value */
function foldAgendaList(fold, value) {
  const list = Array.isArray(value) ? value : [];
  for (let i = 0; i < list.length; i += 1) {
    if (list[i]?.id) fold.agenda[String(list[i].id)] = list[i];
  }
}

/** @param {OpFold} fold @param {{ path: string, value: unknown }} op */
export function foldCloudOp(fold, op) {
  const path = String(op?.path || '');
  const value = op?.value;

  const entryRoot = /^entries\/([^/]+)$/.exec(path);
  if (entryRoot) {
    foldEntryRoot(fold, entryRoot[1], value);
    return;
  }

  const entryField =
    /^entries\/([^/]+)\/(note|indicaciones|historiaClinica|eventualidades|monitoreo|fields)$/.exec(
      path
    );
  if (entryField) {
    foldEntryField(fold, entryField[1], entryField[2], value);
    return;
  }

  const labSidecar = /^labSidecars\/([^/]+)\/([^/]+)$/.exec(path);
  if (labSidecar) {
    foldLabSidecar(fold, labSidecar[1], labSidecar[2], value);
    return;
  }

  const todoMatch = /^todos\/([^/]+)$/.exec(path);
  if (todoMatch) {
    fold.todos[todoMatch[1]] = value;
    return;
  }

  const agendaItem = /^agenda\/([^/]+)$/.exec(path);
  if (agendaItem) {
    fold.agenda[agendaItem[1]] = value;
    return;
  }

  if (path === 'agenda') {
    foldAgendaList(fold, value);
    return;
  }

  if (path === 'clinicalOps') {
    fold.clinicalOps = value;
    return;
  }

  const tombstone = /^tombstones\/([^/]+)$/.exec(path);
  if (tombstone) {
    fold.tombstones[tombstone[1]] = value;
  }
}

/** @param {OpFold} fold */
export function opFoldToLanEntries(fold) {
  const out = [];
  for (const entry of fold.entries.values()) {
    const pid = String(entry.id || '').trim();
    const lanEntry = cloudEntryToLanEntry(entry, fold.labSidecars[pid] || {});
    if (lanEntry) out.push(lanEntry);
  }
  return out;
}

/** @param {unknown[]} ops */
export function opsToLanEntries(ops) {
  const fold = createOpFold();
  for (let i = 0; i < ops.length; i += 1) {
    foldCloudOp(fold, ops[i]);
  }
  return opFoldToLanEntries(fold);
}
