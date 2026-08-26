import { storage, ensureStorageHydrated } from './storage.js';
import { isWebClinicalClient } from './db-storage-bridge.mjs';
import { isSessionScopedWebClient } from './session-clinical-wipe.mjs';
import { applyMedCatalogOverlay } from './med-receta-core.mjs';
import { applySomePharmCatalogOverlay } from './med-pharm-some-catalog.mjs';
import { repairLabHistoryMapInPlace } from './lab-history-repair.mjs';
import { migratePatientMonitoreo } from './features/estado-actual-data.mjs';
import { migratePatientsClinicalSala } from './clinico-access.mjs';
import { maybeStripAutoLabInterpretationsOnce } from './features/eventualidades-strip-auto-labs.mjs';
import {
  persistClinicalState,
  flushPersistClinicalState,
  scheduleIdleClinicalPersist,
} from './clinical-repo-persist.mjs';

/** Module-private clinical domains; use getX()/setX() live refs. */
let patients = [];
let notes = {};
let indicaciones = {};
let labHistory = {};
let medRecetaByPatient = {};
let medPharmProfileByPatient = {};
let recetaHuByPatient = {};
let listadoProblemas = {};
let vpoByPatient = {};
let medNotaSelectionByPatient = {};

let _beforeSave = null;
let _afterSave = null;
let _onSaveResult = null;
let _persistPatientsResolver = null;

/**
 * Durante el tour pitch la lista en memoria son solo demos; al persistir se usa el respaldo real.
 * @param {(() => unknown[] | undefined) | null} fn
 */
export function setPersistPatientsResolver(fn) {
  _persistPatientsResolver = typeof fn === 'function' ? fn : null;
}

function patientsForPersistence() {
  if (_persistPatientsResolver) {
    const overridden = _persistPatientsResolver();
    if (Array.isArray(overridden) && overridden.length) return overridden;
    const filtered = patients.filter(function (p) {
      return p && p.id !== 'demo-pitch' && p.id !== 'demo-pitch-2' && !p.isDemo;
    });
    if (filtered.length) return filtered;
    const stored = storage.getPatients();
    if (Array.isArray(stored) && stored.length) return stored;
    return [];
  }
  return patients;
}

let _setPatientsWarned = false;
export function setPatients(next) {
  if (!_setPatientsWarned) {
    _setPatientsWarned = true;
    console.warn('[reckoning] setPatients mutates the in-memory census; prefer clinical-repo commands');
  }
  patients = Array.isArray(next) ? next : [];
}

/** @internal */
export function resetSetPatientsWarningForTests() {
  _setPatientsWarned = false;
}

/**
 * Live census array (temporary compat): in-place mutations (p.field=, push) keep working.
 * Read-model getters in clinical-read-model.mjs stay defensive copies.
 * @returns {Array}
 */
export function getPatients() {
  return patients;
}

/** Patients eligible for cloud sync — excludes local-only demo patients (p.isDemo). */
export function getSyncablePatients() {
  return patients.filter(function (p) {
    return p && !p.isDemo;
  });
}

/** Live clinical map (temporary compat): in-place key mutations keep working. */
export function getNotes() {
  return notes;
}

export function getIndicaciones() {
  return indicaciones;
}

export function getLabHistory() {
  return labHistory;
}

export function getMedRecetaByPatient() {
  return medRecetaByPatient;
}

export function getMedPharmProfileByPatient() {
  return medPharmProfileByPatient;
}

export function getRecetaHuByPatient() {
  return recetaHuByPatient;
}

export function getListadoProblemas() {
  return listadoProblemas;
}

export function getVpoByPatient() {
  return vpoByPatient;
}

export function getMedNotaSelectionByPatient() {
  return medNotaSelectionByPatient;
}

/**
 * @param {string} name
 * @returns {unknown}
 */
export function getClinicalDomain(name) {
  switch (String(name || '')) {
    case 'patients':
      return getPatients();
    case 'notes':
      return getNotes();
    case 'indicaciones':
      return getIndicaciones();
    case 'labHistory':
      return getLabHistory();
    case 'medRecetaByPatient':
      return getMedRecetaByPatient();
    case 'medPharmProfileByPatient':
      return getMedPharmProfileByPatient();
    case 'recetaHuByPatient':
      return getRecetaHuByPatient();
    case 'listadoProblemas':
      return getListadoProblemas();
    case 'vpoByPatient':
      return getVpoByPatient();
    case 'medNotaSelectionByPatient':
      return getMedNotaSelectionByPatient();
    default:
      return undefined;
  }
}

/** Safari/iPad: drop ward census from memory (PHI is session-only until LAN sync). */
export function clearWebSessionClinicalMemory() {
  if (!isWebClinicalClient()) return;
  setPatients([]);
  setNotes({});
  setIndicaciones({});
  setLabHistory({});
  setMedRecetaByPatient({});
  setMedPharmProfileByPatient({});
  setRecetaHuByPatient({});
  setListadoProblemas({});
  setVpoByPatient({});
  setMedNotaSelectionByPatient({});
}

function asPlainMap(next) {
  return next && typeof next === 'object' && !Array.isArray(next) ? next : {};
}

export function setNotes(next) {
  notes = asPlainMap(next);
}

export function setIndicaciones(next) {
  indicaciones = asPlainMap(next);
}

export function setLabHistory(next) {
  labHistory = asPlainMap(next);
}

export function setMedRecetaByPatient(next) {
  medRecetaByPatient = asPlainMap(next);
}

export function setMedPharmProfileByPatient(next) {
  medPharmProfileByPatient = asPlainMap(next);
}

export function setVpoByPatient(next) {
  vpoByPatient = asPlainMap(next);
}

export function setRecetaHuByPatient(next) {
  recetaHuByPatient = asPlainMap(next);
}

export function setListadoProblemas(next) {
  listadoProblemas = asPlainMap(next);
}

export function setMedNotaSelectionByPatient(next) {
  medNotaSelectionByPatient = asPlainMap(next);
}

function clonePlainRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

/** Sustituye pacientes y datos clínicos en memoria (importación de respaldo, deshacer). */
export function replaceAppStateFromBackupData(data) {
  if (!data || typeof data !== 'object') return;
  var nextPatients = Array.isArray(data.patients) ? data.patients : [];
  setPatients(
    nextPatients.filter(function (p) {
      return p && !p.isDemo;
    })
  );
  setNotes(clonePlainRecord(data.notes));
  setIndicaciones(clonePlainRecord(data.indicaciones));
  setLabHistory(clonePlainRecord(data.labHistory));
  setMedRecetaByPatient(clonePlainRecord(data.medRecetaByPatient));
  setMedPharmProfileByPatient(clonePlainRecord(data.medPharmProfileByPatient));
  setListadoProblemas(clonePlainRecord(data.listadoProblemas));
  setVpoByPatient(clonePlainRecord(data.vpoByPatient));
  setMedNotaSelectionByPatient({});
}

export function setSaveStateHooks({ before, after, onSaveResult } = {}) {
  if (before !== undefined) _beforeSave = before;
  if (after !== undefined) _afterSave = after;
  if (onSaveResult !== undefined) _onSaveResult = onSaveResult;
}

/** @internal — used by clinical-repo-persist */
export function invokeBeforeSaveHook() {
  if (_beforeSave) _beforeSave();
}

/** @internal — used by clinical-repo-persist */
export function invokeAfterSaveHook() {
  if (_afterSave) _afterSave();
}

/** @internal — used by clinical-repo-persist */
export function notifySaveResultHook(result) {
  if (_onSaveResult && result) _onSaveResult(result);
}

/**
 * Snapshot of clinical domains for clinical.persistSnapshot / read-model apply.
 * Uses patientsForPersistence() so pitch-tour demos do not overwrite real census.
 * @returns {Record<string, unknown>}
 */
export function getClinicalPersistSnapshot() {
  return {
    patients: patientsForPersistence(),
    notes,
    indicaciones,
    labHistory,
    medRecetaByPatient,
    medPharmProfileByPatient,
    recetaHuByPatient,
    listadoProblemas,
    vpoByPatient,
  };
}

export function repairLabHistoryInMemory() {
  return repairLabHistoryMapInPlace(labHistory);
}

/**
 * Hydrate SQLCipher blobs (when unlocked) then load module exports from storage getters.
 * @returns {Promise<void>}
 */
export async function bootHydrateFromDb() {
  await ensureStorageHydrated();
  initAppState();
  try {
    var repoHydrate = await import('./clinical-repo-hydrate.mjs');
    if (repoHydrate && typeof repoHydrate.hydrateClinicalRepoIntoReadModel === 'function') {
      await repoHydrate.hydrateClinicalRepoIntoReadModel();
    }
  } catch (err) {
    console.warn('[R+] Clinical read-model hydrate:', err && err.message);
  }
}

export function initAppState() {
  if (isSessionScopedWebClient()) {
    clearWebSessionClinicalMemory();
  } else {
    setPatients(storage.getPatients());
    setNotes(storage.getNotes());
    setIndicaciones(storage.getIndicaciones());
    setLabHistory(storage.getLabHistory());
    setMedRecetaByPatient(storage.getMedRecetaByPatient());
    setMedPharmProfileByPatient(storage.getMedPharmProfileByPatient());
    setRecetaHuByPatient(storage.getRecetaHuByPatient());
    setListadoProblemas(storage.getListadoProblemas());
    setVpoByPatient(storage.getVpoByPatient());
  }
  var medCatalog = storage.getMedCatalog();
  applyMedCatalogOverlay(medCatalog);
  applySomePharmCatalogOverlay(medCatalog);
  setMedNotaSelectionByPatient({});
  var monitoreoMigrated = false;
  for (var pi = 0; pi < patients.length; pi += 1) {
    if (migratePatientMonitoreo(patients[pi])) monitoreoMigrated = true;
  }
  var salaMigrated = 0;
  try {
    var rpcSettings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    var clinicalSala = String(rpcSettings.clinicalSala || '').trim();
    if (clinicalSala) {
      salaMigrated = migratePatientsClinicalSala(patients, { sala: clinicalSala });
    }
  } catch (_e) { void _e; }
  if (repairLabHistoryInMemory() || monitoreoMigrated || salaMigrated > 0) {
    void persistClinicalState({ immediate: true, source: 'boot-migrate' });
  }
  var stripLabs = maybeStripAutoLabInterpretationsOnce(patients);
  if (stripLabs.ran && stripLabs.patientsChanged > 0) {
    void persistClinicalState({ immediate: true, source: 'boot-strip-labs' });
    try {
      import('./features/cloud-sync/mutate-bridge.mjs').then(function (m) {
        if (m && typeof m.scheduleCloudSyncPush === 'function') m.scheduleCloudSyncPush();
      });
    } catch (_e) {
      void _e;
    }
  }
}

export { persistClinicalState, flushPersistClinicalState, scheduleIdleClinicalPersist };

/**
 * @deprecated Use persistClinicalState. Forwards for tests / residual callers.
 * @param {{ immediate?: boolean, source?: string }} [opts]
 */
export function saveState(opts) {
  console.warn('[reckoning] saveState is deprecated; use persistClinicalState');
  return persistClinicalState(opts);
}

/** Persiste de inmediato cualquier guardado pendiente (p. ej. antes de cerrar la app). */
export function flushSaveState() {
  return flushPersistClinicalState();
}
