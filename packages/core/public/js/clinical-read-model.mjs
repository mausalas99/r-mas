/**
 * Renderer clinical read model (P5 — clinical domains).
 * Cache; writes go through clinical-repo commands.
 * Do not export mutable `let` bindings.
 */

const DOMAIN_KEYS = [
  'patients',
  'notes',
  'indicaciones',
  'labHistory',
  'medRecetaByPatient',
  'medPharmProfileByPatient',
  'listadoProblemas',
  'vpoByPatient',
  'medNotaSelectionByPatient',
];

const MAP_KEYS = new Set(DOMAIN_KEYS.filter((k) => k !== 'patients'));

/** @type {Record<string, unknown>} */
const _cache = emptyCache();

function emptyCache() {
  return {
    patients: [],
    notes: {},
    indicaciones: {},
    labHistory: {},
    medRecetaByPatient: {},
    medPharmProfileByPatient: {},
    listadoProblemas: {},
    vpoByPatient: {},
    medNotaSelectionByPatient: {},
  };
}

function cloneValue(value) {
  if (value == null || typeof value !== 'object') return value;
  try {
    if (typeof structuredClone === 'function') return structuredClone(value);
  } catch {
    /* fall through */
  }
  return JSON.parse(JSON.stringify(value));
}

/**
 * @param {string} key
 * @param {string} [patientId]
 */
function getMapDomain(key, patientId) {
  const map = _cache[key] && typeof _cache[key] === 'object' ? _cache[key] : {};
  if (patientId == null || patientId === '') {
    return cloneValue(map);
  }
  const id = String(patientId);
  if (!Object.prototype.hasOwnProperty.call(map, id)) return undefined;
  return cloneValue(map[id]);
}

/** @returns {object[]} defensive copy */
export function getPatients() {
  return cloneValue(_cache.patients);
}

/**
 * @param {string} id
 * @returns {object|null}
 */
export function getPatientById(id) {
  const key = String(id || '');
  if (!key) return null;
  const found = _cache.patients.find((p) => p && String(p.id) === key);
  return found ? cloneValue(found) : null;
}

/** @param {string} [patientId] */
export function getNotes(patientId) {
  return getMapDomain('notes', patientId);
}

/** @param {string} [patientId] */
export function getIndicaciones(patientId) {
  return getMapDomain('indicaciones', patientId);
}

/** @param {string} [patientId] */
export function getLabHistory(patientId) {
  return getMapDomain('labHistory', patientId);
}

/** @param {string} [patientId] */
export function getMedRecetaByPatient(patientId) {
  return getMapDomain('medRecetaByPatient', patientId);
}

/** @param {string} [patientId] */
export function getMedPharmProfileByPatient(patientId) {
  return getMapDomain('medPharmProfileByPatient', patientId);
}

/** @param {string} [patientId] */
export function getListadoProblemas(patientId) {
  return getMapDomain('listadoProblemas', patientId);
}

/** @param {string} [patientId] */
export function getVpoByPatient(patientId) {
  return getMapDomain('vpoByPatient', patientId);
}

/** @param {string} [patientId] */
export function getMedNotaSelectionByPatient(patientId) {
  return getMapDomain('medNotaSelectionByPatient', patientId);
}

/**
 * @internal — repo client / hydrate after command success
 * @param {Record<string, unknown>} partial
 */
export function _applyRepoSnapshot(partial) {
  if (!partial || typeof partial !== 'object') return;
  if (Array.isArray(partial.patients)) {
    _cache.patients = cloneValue(partial.patients);
  }
  for (const key of MAP_KEYS) {
    if (partial[key] === undefined) continue;
    const value = partial[key];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      _cache[key] = {};
    } else {
      _cache[key] = cloneValue(value);
    }
  }
}

/**
 * Public hydrate alias — applies snapshot with source `hydrate`.
 * @param {Record<string, unknown>} snapshot
 */
export function hydrateClinicalReadModel(snapshot) {
  _applyRepoSnapshot(snapshot);
}

/**
 * @internal — patch one patient (eventualidades success path)
 * @param {string} patientId
 * @param {Record<string, unknown>} patch
 * @param {object} [seed] used when patient is not yet in cache
 */
export function _applyPatientPatch(patientId, patch, seed) {
  const id = String(patientId || '').trim();
  if (!id) return;
  const patchObj = patch && typeof patch === 'object' ? cloneValue(patch) : {};
  const idx = _cache.patients.findIndex((p) => p && String(p.id) === id);
  if (idx >= 0) {
    _cache.patients[idx] = { ..._cache.patients[idx], ...patchObj, id };
  } else {
    const base = seed && typeof seed === 'object' ? { ...seed } : { id };
    _cache.patients = [..._cache.patients, { ...base, ...patchObj, id }];
  }
}

/** @internal — tests only */
export function resetClinicalReadModelForTests() {
  const next = emptyCache();
  for (const key of DOMAIN_KEYS) {
    _cache[key] = next[key];
  }
}
