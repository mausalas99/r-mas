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
  'medReceta',
  'fields',
]);

/**
 * True for a still-wrapped `{ enc: 1, iv, ct }` envelope this device could not
 * open (no room DEK yet, or a stale/wrong one). That must never be merged into
 * local state as if it were the real value — it would read back as "cleared"
 * (see MISTAKES.md 2026-09-17). This module stays import-free by design, so the
 * check is duplicated from crypto.mjs's isEncryptedEnvelope rather than imported.
 * @param {unknown} value
 */
function isCiphertext(value) {
  return !!value && typeof value === 'object' && /** @type {any} */ (value).enc === 1;
}

/** @param {Record<string, unknown>} sidecarMap */
export function assembleLabHistoryFromSidecars(sidecarMap) {
  if (!sidecarMap || typeof sidecarMap !== 'object') return [];
  return Object.values(sidecarMap).filter((row) => row && typeof row === 'object' && !isCiphertext(row));
}

/**
 * Wire-only key riding inside `fields` alongside registro (Part A's one-way
 * fingerprint for re-admit matching) — never a real patient property, never
 * merged into local state.
 */
const FIELDS_WIRE_ONLY_KEYS = new Set(['registroFp']);

/** @param {Record<string, unknown>} entry */
function buildPatientFromCloudEntry(entry) {
  const patientId = String(entry.id).trim();
  const fields = entry.fields;
  const patient = { id: patientId };
  if (fields && typeof fields === 'object') {
    // Same ciphertext guard as note/medReceta below — registro/diagnosticosList/
    // diagnosticosText inside `fields` can still be a locked {enc:1,...} envelope
    // when this device has no room DEK yet (no password entered this session).
    // Leaving the key unset here is what shows the same blank/locked placeholder
    // notes already show in that case, instead of leaking the raw ciphertext object.
    for (const [key, value] of Object.entries(fields)) {
      if (FIELDS_WIRE_ONLY_KEYS.has(key) || isCiphertext(value)) continue;
      patient[key] = value;
    }
  }
  for (const [key, value] of Object.entries(entry)) {
    if (ENTRY_SKIP_KEYS.has(key) || FIELDS_WIRE_ONLY_KEYS.has(key) || isCiphertext(value)) continue;
    patient[key] = value;
  }
  if (entry.eventualidades && !isCiphertext(entry.eventualidades)) patient.eventualidades = entry.eventualidades;
  if (entry.monitoreo && !isCiphertext(entry.monitoreo)) patient.monitoreo = entry.monitoreo;
  return patient;
}

/**
 * @param {Record<string, unknown>} entry
 * @param {Record<string, unknown>} labSidecarsForPatient
 */
export function cloudEntryToLanEntry(entry, labSidecarsForPatient) {
  if (!entry?.id) return null;
  const out = {
    patient: buildPatientFromCloudEntry(entry),
    labHistory: assembleLabHistoryFromSidecars(labSidecarsForPatient),
  };
  // Only carry note/indicaciones/medReceta when the cloud entry (or op fold)
  // actually has the key — a partial ops batch that only touched e.g. `fields`
  // for this patient must not read back as "note/meds cleared" for everyone
  // else in that same pull.
  if (Object.prototype.hasOwnProperty.call(entry, 'note') && !isCiphertext(entry.note)) {
    const note = entry.note;
    out.note = note && typeof note === 'object' ? note : {};
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'indicaciones') && !isCiphertext(entry.indicaciones)) {
    const indicaciones = entry.indicaciones;
    out.indicaciones = indicaciones && typeof indicaciones === 'object' ? indicaciones : {};
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'medReceta') && !isCiphertext(entry.medReceta)) {
    out.medReceta = entry.medReceta;
  }
  return out;
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

/** @param {OpFold} fold @param {string} patientId @param {unknown} value @param {unknown} op */
function foldTombstone(fold, patientId, value, op) {
  const base = value && typeof value === 'object' ? { ...value } : {};
  const actorId = String(/** @type {{ actorId?: string }} */ (op)?.actorId || '').trim();
  if (actorId) base.actorId = actorId;
  fold.tombstones[patientId] = base;
}

/** Newer cycle letter wins — same rule as the Worker's mergeClinicalOpsLww. */
function cycleIsNewer(stored, incoming) {
  if (!incoming?.sub_area_fraction) return false;
  if (!stored?.sub_area_fraction) return true;
  return String(incoming.cycle_set_at || '') > String(stored.cycle_set_at || '');
}

/** @param {unknown[]} a @param {unknown[]} b @param {string[]} keys @param {boolean|((stored: any, incoming: any) => boolean)} incomingWins */
function mergeRows(a, b, keys, incomingWins) {
  const map = new Map();
  const add = (row, overwrite) => {
    const key = keys.map((k) => String(row?.[k] || '').trim());
    if (key.some((part) => !part)) return;
    const id = key.join('\0');
    const wins = typeof overwrite === 'function' ? map.has(id) && overwrite(map.get(id), row) : overwrite;
    if (wins || !map.has(id)) map.set(id, row);
  };
  for (const row of Array.isArray(a) ? a : []) add(row, true);
  for (const row of Array.isArray(b) ? b : []) add(row, incomingWins);
  return [...map.values()];
}

/**
 * clinicalOps is a whole-doc field, but an ops-mode pull carries every push
 * raw: a fresh device's empty snapshot would hide the room's teams if the
 * last op simply won. Same union as the server's room state — keep in sync
 * with cloud/sync-worker/src/clinical-ops-lww.js mergeClinicalOpsLww.
 * @param {unknown} prev @param {unknown} incoming
 */
function mergeClinicalOpsFold(prev, incoming) {
  if (!incoming || typeof incoming !== 'object') return prev ?? incoming;
  if (!prev || typeof prev !== 'object' || isCiphertext(prev) || isCiphertext(incoming)) return incoming;
  const a = /** @type {Record<string, unknown[]>} */ (prev);
  const b = /** @type {Record<string, unknown[]>} */ (incoming);
  return {
    ...a,
    ...b,
    teams: mergeRows(a.teams, b.teams, ['team_id'], true),
    clinical_users: mergeRows(a.clinical_users, b.clinical_users, ['user_id'], true),
    patient_team_assignment: mergeRows(a.patient_team_assignment, b.patient_team_assignment, ['patient_id', 'team_id'], false),
    team_membership: mergeRows(a.team_membership, b.team_membership, ['team_id', 'user_id'], cycleIsNewer),
    team_membership_removals: mergeRows(a.team_membership_removals, b.team_membership_removals, ['team_id', 'user_id'], false),
    team_membership_rejoins: mergeRows(a.team_membership_rejoins, b.team_membership_rejoins, ['team_id', 'user_id'], false),
  };
}

/** @param {OpFold} fold @param {{ path: string, value: unknown, actorId?: string }} op */
export function foldCloudOp(fold, op) {
  const path = String(op?.path || '');
  const value = op?.value;

  const entryRoot = /^entries\/([^/]+)$/.exec(path);
  if (entryRoot) {
    foldEntryRoot(fold, entryRoot[1], value);
    return;
  }

  const entryField =
    /^entries\/([^/]+)\/(note|indicaciones|historiaClinica|eventualidades|monitoreo|medReceta|fields)$/.exec(
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
    fold.clinicalOps = mergeClinicalOpsFold(fold.clinicalOps, value);
    return;
  }

  const tombstone = /^tombstones\/([^/]+)$/.exec(path);
  if (tombstone) {
    foldTombstone(fold, tombstone[1], value, op);
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
