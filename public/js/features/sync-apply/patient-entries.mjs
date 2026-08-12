/**
 * Neutral patient entry merge/apply for LAN/Nube census hydration.
 */
import { storage } from '../../storage.js';
import { getPatients, getNotes, getIndicaciones, getLabHistory, getMedRecetaByPatient, getMedPharmProfileByPatient, getVpoByPatient, getListadoProblemas, persistClinicalState } from '../../app-state.mjs';
import {
  mergeEventualidades,
  mergeLabHistorySets,
} from '../../patient-merge.mjs';
import { mergePatientMonitoreoFromImported } from '../estado-actual-data.mjs';
import { mergeCensoPatientFields } from '../../patient-diagnosticos.mjs';
import { mergePatientRegistrationMeta } from '../../patient-registration-meta.mjs';
import { mergeTodoListsById } from '../../livesync-patient-ids.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import {
  getClinicalScopeContextForEvaluate,
  isClinicalScopeReadyForPatientApply,
} from '../../clinical-access-runtime.mjs';
import { shouldEnforceTeamPatientMirror } from '../../clinical-privileges.mjs';
import { filterPatientEntriesForLanTeamScope } from '../../patient-team-scope.mjs';
import {
  filterLabHistorySetsForMobileReference,
  shouldApplyMobileLabHistoryWindow,
} from '../cloud-mobile/lab-history-window.mjs';

/** @type {{
 *   runtime?: object,
 *   renderPatientListLanSilent?: () => void,
 * }} */
let entryDeps = {};

function trimMobileLabHistorySets(sets) {
  if (!shouldApplyMobileLabHistoryWindow()) return sets;
  return filterLabHistorySetsForMobileReference(sets);
}

export function configurePatientEntries(deps) {
  if (deps && typeof deps === 'object') Object.assign(entryDeps, deps);
}

function lanRuntime() {
  const configured = entryDeps.runtime;
  if (configured && typeof configured.ensureUniquePatientName === 'function') {
    return configured;
  }
  return {
    findPatientByRegistro: function () {
      return null;
    },
    ensureUniquePatientName: function (name) {
      return name;
    },
    applyImportEntry: function () {
      return null;
    },
    getActiveId: function () {
      return null;
    },
    renderNoteForm: function () {},
    renderLabHistoryPanel: function () {},
    renderEstadoActualPanel: function () {},
  };
}

export function lanJsonEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

/**
 * Default label used when SOME/lab/cloud admit a chart without a parsed name.
 * Must not LWW-overwrite a real name just because the placeholder got a newer clock.
 * @param {unknown} name
 */
export function isPlaceholderPatientName(name) {
  const n = String(name || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  if (!n) return true;
  return (
    n === 'PACIENTE SIN NOMBRE' ||
    n === 'SIN NOMBRE' ||
    n === 'PACIENTE' ||
    n === 'PACIENTE SIN NOMBRE.'
  );
}

/**
 * Prefer incoming non-empty scalars only when the remote patient clock is ahead.
 * Without clocks, keep local non-empty values (avoids cloud/LAN pulls rewriting cuarto/cama).
 * @param {Record<string, unknown>} existing
 * @param {Record<string, unknown>} incoming
 */
function incomingScalarsAreAuthoritative(existing, incoming) {
  var localAt = String((existing && existing.lanUpdatedAt) || '').trim();
  var remoteAt = String((incoming && incoming.lanUpdatedAt) || '').trim();
  if (!localAt && !remoteAt) return false;
  if (!localAt) return true;
  if (!remoteAt) return false;
  return remoteAt.localeCompare(localAt) >= 0;
}

/**
 * @param {unknown} incoming
 * @param {unknown} local
 * @param {boolean} takeIncoming
 */
function pickNombreMergeValue(incoming, local, takeIncoming) {
  const remoteName = incoming != null ? String(incoming) : '';
  const localName = local != null ? String(local) : '';
  const remotePlaceholder = isPlaceholderPatientName(remoteName);
  const localPlaceholder = isPlaceholderPatientName(localName);
  if (!remotePlaceholder && localPlaceholder) return remoteName;
  if (remotePlaceholder && !localPlaceholder) return localName;
  if (takeIncoming) {
    return remoteName.trim() !== '' ? remoteName : localName;
  }
  return localName.trim() !== '' ? localName : remoteName;
}

function assignLanScalarIfChanged(target, key, incoming, fallback, takeIncoming) {
  var next;
  if (key === 'nombre') {
    next = pickNombreMergeValue(incoming, fallback, takeIncoming);
  } else if (takeIncoming) {
    next = incoming != null && incoming !== '' ? incoming : fallback;
  } else {
    var localVal = target[key];
    if (localVal != null && String(localVal).trim() !== '') next = localVal;
    else next = incoming != null && incoming !== '' ? incoming : fallback;
  }
  if (String(target[key] || '') === String(next || '')) return false;
  target[key] = next;
  return true;
}

function filterIncomingPatientEntriesForScope(entries) {
  if (!isClinicalScopeReadyForPatientApply()) return [];
  var user = clinicalSessionContext.user;
  if (!user?.user_id) return [];
  return filterPatientEntriesForLanTeamScope(
    entries || [],
    user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap
  );
}

export function touchPatientLanUpdatedAt(patientId) {
  var p = getPatients().find(function (x) {
    return x && x.id === patientId;
  });
  if (p) p.lanUpdatedAt = new Date().toISOString();
}

function saveEntryTodosOnLocalPatient(localPatientId, entry) {
  if (!localPatientId || !entry) return false;
  var incoming = Array.isArray(entry.todos) ? entry.todos : [];
  if (!incoming.length) return false;
  var merged = mergeTodoListsById(storage.getTodos(localPatientId), incoming);
  if (lanJsonEqual(storage.getTodos(localPatientId), merged)) return false;
  storage.saveTodos(localPatientId, merged);
  return true;
}

function applyLanPatientScalars(existing, p) {
  var changed = false;
  var takeIncoming = incomingScalarsAreAuthoritative(existing, p);
  var scalarKeys = [
    'nombre', 'edad', 'sexo', 'area', 'servicio', 'cuarto', 'cama', 'peso', 'talla', 'viaAcceso', 'registro',
  ];
  for (var sk = 0; sk < scalarKeys.length; sk += 1) {
    var key = scalarKeys[sk];
    if (assignLanScalarIfChanged(existing, key, p[key], existing[key], takeIncoming)) changed = true;
  }
  if (takeIncoming && p.lanUpdatedAt && String(p.lanUpdatedAt) !== String(existing.lanUpdatedAt || '')) {
    existing.lanUpdatedAt = p.lanUpdatedAt;
    changed = true;
  }
  var censoBefore = JSON.stringify(existing);
  mergeCensoPatientFields(existing, p);
  if (JSON.stringify(existing) !== censoBefore) changed = true;
  const regBefore = existing.registeredByUserId;
  mergePatientRegistrationMeta(existing, p);
  if (existing.registeredByUserId !== regBefore) changed = true;
  if (p.fromLab && !existing.fromLab) {
    existing.fromLab = true;
    changed = true;
  }
  return changed;
}

function applyLanPatientCharts(existing, entry) {
  var changed = false;
  var nextNote = entry.note || {};
  if (!lanJsonEqual(getNotes()[existing.id], nextNote)) {
    getNotes()[existing.id] = nextNote;
    changed = true;
  }
  var nextInd = entry.indicaciones || {};
  if (!lanJsonEqual(getIndicaciones()[existing.id], nextInd)) {
    getIndicaciones()[existing.id] = nextInd;
    changed = true;
  }
  var nextLabs = trimMobileLabHistorySets(Array.isArray(entry.labHistory) ? entry.labHistory : []);
  var mergedLabs = trimMobileLabHistorySets(
    mergeLabHistorySets(getLabHistory()[existing.id] || [], nextLabs)
  );
  if (!lanJsonEqual(getLabHistory()[existing.id], mergedLabs)) {
    getLabHistory()[existing.id] = mergedLabs;
    changed = true;
  }
  return applyLanPatientMedArtifacts(existing, entry) || changed;
}

function applyLanPatientNested(existing, entry, p) {
  var changed = false;
  if (p.eventualidades && typeof p.eventualidades === 'object') {
    var mergedEv = mergeEventualidades(existing.eventualidades, p.eventualidades) || p.eventualidades;
    if (!lanJsonEqual(existing.eventualidades, mergedEv)) {
      existing.eventualidades = mergedEv;
      changed = true;
    }
  }
  if (applyLanPatientCharts(existing, entry)) changed = true;
  var monBefore = JSON.stringify(existing);
  mergePatientMonitoreoFromImported(existing, p);
  if (JSON.stringify(existing) !== monBefore) changed = true;
  return changed;
}

function applyLanPatientMedArtifacts(existing, entry) {
  var changed = false;
  changed = applyLanMedRecetaField(existing, entry) || changed;
  changed = applyLanMedPharmField(existing, entry) || changed;
  changed = applyLanVpoField(existing, entry) || changed;
  if (entry.listadoProblemas) {
    if (!lanJsonEqual(getListadoProblemas()[existing.id], entry.listadoProblemas)) {
      getListadoProblemas()[existing.id] = entry.listadoProblemas;
      changed = true;
    }
  }
  return changed;
}

function applyLanMedRecetaField(existing, entry) {
  if (!Object.prototype.hasOwnProperty.call(entry, 'medReceta')) return false;
  if (entry.medReceta) {
    if (lanJsonEqual(getMedRecetaByPatient()[existing.id], entry.medReceta)) return false;
    getMedRecetaByPatient()[existing.id] = entry.medReceta;
    return true;
  }
  if (!getMedRecetaByPatient()[existing.id]) return false;
  delete getMedRecetaByPatient()[existing.id];
  return true;
}

function applyLanMedPharmField(existing, entry) {
  if (!Object.prototype.hasOwnProperty.call(entry, 'medPharmProfile')) return false;
  if (entry.medPharmProfile) {
    if (lanJsonEqual(getMedPharmProfileByPatient()[existing.id], entry.medPharmProfile)) return false;
    getMedPharmProfileByPatient()[existing.id] = entry.medPharmProfile;
    return true;
  }
  if (!getMedPharmProfileByPatient()[existing.id]) return false;
  delete getMedPharmProfileByPatient()[existing.id];
  return true;
}

function applyLanVpoField(existing, entry) {
  if (entry.vpo) {
    if (lanJsonEqual(getVpoByPatient()[existing.id], entry.vpo)) return false;
    getVpoByPatient()[existing.id] = entry.vpo;
    return true;
  }
  if (!getVpoByPatient()[existing.id]) return false;
  delete getVpoByPatient()[existing.id];
  return true;
}

function applyLanPatientEntryToExisting(existing, entry, opts) {
  if (!existing || !entry || !entry.patient) return false;
  var p = entry.patient;
  var changed = applyLanPatientScalars(existing, p);
  if (applyLanPatientNested(existing, entry, p)) changed = true;
  if (!opts.skipTodos && saveEntryTodosOnLocalPatient(existing.id, entry)) changed = true;
  return changed;
}

function findExistingPatient(entry) {
  var reg = String(entry.patient.registro || '').trim();
  var existing = reg ? lanRuntime().findPatientByRegistro(reg) : null;
  if (!existing && entry.patient.id) {
    existing = getPatients().find(function (p) {
      return p && p.id === entry.patient.id;
    });
  }
  return existing;
}

function seedNewPatientArtifacts(remoteId, entry) {
  getNotes()[remoteId] = entry.note || {};
  getIndicaciones()[remoteId] = entry.indicaciones || {};
  getLabHistory()[remoteId] = trimMobileLabHistorySets(
    Array.isArray(entry.labHistory) ? entry.labHistory : []
  );
  if (Object.prototype.hasOwnProperty.call(entry, 'medReceta') && entry.medReceta) {
    getMedRecetaByPatient()[remoteId] = entry.medReceta;
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'medPharmProfile') && entry.medPharmProfile) {
    getMedPharmProfileByPatient()[remoteId] = entry.medPharmProfile;
  }
  if (entry.vpo) getVpoByPatient()[remoteId] = entry.vpo;
}

function attachOptionalPatientFields(newPat, patient) {
  if (patient.eventualidades && typeof patient.eventualidades === 'object') {
    newPat.eventualidades = patient.eventualidades;
  }
}

function createNewPatientShell(entry) {
  var remoteId = String(entry.patient.id || '').trim();
  var p = entry.patient;
  var newPat = {
    id: remoteId,
    nombre: lanRuntime().ensureUniquePatientName(p.nombre || 'PACIENTE SIN NOMBRE'),
    area: p.area || '',
    servicio: p.servicio || '',
    cuarto: p.cuarto || '',
    cama: p.cama || '',
    peso: p.peso || '',
    talla: p.talla || '',
    viaAcceso: p.viaAcceso || '',
    edad: p.edad || '',
    sexo: p.sexo || 'F',
    registro: p.registro || '',
    fromLab: !!p.fromLab,
  };
  mergePatientMonitoreoFromImported(newPat, p);
  mergeCensoPatientFields(newPat, p);
  mergePatientRegistrationMeta(newPat, p);
  attachOptionalPatientFields(newPat, p);
  getPatients().unshift(newPat);
  seedNewPatientArtifacts(remoteId, entry);
  return remoteId;
}

function addLanPatientFromEntry(entry, opts) {
  var remoteId = String(entry.patient.id || '').trim();
  var idTaken =
    remoteId &&
    getPatients().some(function (p) {
      return p && p.id === remoteId;
    });
  var newId;
  if (remoteId && !idTaken) {
    newId = createNewPatientShell(entry);
  } else {
    newId = lanRuntime().applyImportEntry(entry, 'duplicate', null);
  }
  if (entry.listadoProblemas && newId) getListadoProblemas()[newId] = entry.listadoProblemas;
  if (!opts.skipTodos) saveEntryTodosOnLocalPatient(newId, entry);
  return true;
}

function refreshLanPatientUiAfterApply() {
  if (typeof entryDeps.renderPatientListLanSilent === 'function') {
    entryDeps.renderPatientListLanSilent();
  }
  if (lanRuntime().getActiveId()) {
    try {
      lanRuntime().renderNoteForm();
    } catch { /* ignored */ }
    try {
      lanRuntime().renderLabHistoryPanel();
    } catch { /* ignored */ }
    try {
      lanRuntime().renderEstadoActualPanel({ force: true, syncHeavy: true });
    } catch { /* ignored */ }
  }
}

export function applyLanPatientEntries(entries, opts) {
  opts = opts || {};
  if (!entries || !entries.length) return { added: 0, updated: 0 };
  var scopedEntries = opts.skipTeamScopeFilter
    ? entries
    : filterIncomingPatientEntriesForScope(entries);
  if (!scopedEntries.length) return { added: 0, updated: 0 };
  var added = 0;
  var updated = 0;
  for (var i = 0; i < scopedEntries.length; i += 1) {
    var entry = scopedEntries[i];
    if (!entry || !entry.patient) continue;
    var existing = findExistingPatient(entry);
    if (existing) {
      if (applyLanPatientEntryToExisting(existing, entry, opts)) updated += 1;
    } else if (addLanPatientFromEntry(entry, opts)) {
      added += 1;
    }
  }
  if (added || updated) {
    persistClinicalState({ immediate: true });
    if (!shouldEnforceTeamPatientMirror()) {
      refreshLanPatientUiAfterApply();
    }
  }
  return { added: added, updated: updated };
}
