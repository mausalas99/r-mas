/**
 * Neutral patient entry merge/apply for LAN/Nube census hydration.
 */
import { storage } from '../../storage.js';
import { getPatients, getNotes, getIndicaciones, getLabHistory, getMedRecetaByPatient, getMedPharmProfileByPatient, getVpoByPatient, getListadoProblemas, persistClinicalState, scheduleIdleClinicalPersist } from '../../app-state.mjs';
import {
  mergeEventualidades,
  mergeLabHistorySets,
  incomingDocWinsLww,
} from '../../patient-merge.mjs';
import { reparseLabSetsFromSome } from '../../lab-history-some-reparse.mjs';
import { bumpLabHistoryRevision } from '../../lab-history-cache.mjs';
import { mergePatientMonitoreoFromImported } from '../estado-actual-data.mjs';
import { mergeCensoPatientFields, mergeFieldClocks, compareFieldClock } from '../../patient-diagnosticos.mjs';

/** Set by applyLanPatientScalars when this device holds a newer censo key than the room. */
var censusRepushNeeded = false;
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
    .replace(/\s+/g, ' ')
    // Strip the ensureUniquePatientName counter suffix — still a placeholder.
    .replace(/ ?\((\d+|COPIA)\)$/, '');
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

/**
 * A patient census op and its patient_team_assignment op can land in different
 * poll cycles. Once a poll's ops are applied the revision moves past them and
 * the server never resends them — so an entry dropped here for a patient we
 * don't know locally yet is gone for good, not just delayed. Let first-sighting
 * entries through unconditionally; scope still applies to already-known
 * patients, and prunePatientsOutsideVisibleScope (after a short grace window,
 * see patient-scope-prune.mjs) removes a first-sighting entry that turns out
 * to not be ours once the assignment data catches up.
 */
function filterIncomingPatientEntriesForScope(entries) {
  if (!isClinicalScopeReadyForPatientApply()) return entries || [];
  var user = clinicalSessionContext.user;
  if (!user?.user_id) return [];
  var known = new Set(
    getPatients().map(function (p) {
      return p && p.id;
    })
  );
  var unseen = (entries || []).filter(function (e) {
    return e && e.patient && !known.has(e.patient.id);
  });
  var seen = (entries || []).filter(function (e) {
    return e && e.patient && known.has(e.patient.id);
  });
  var scopedSeen = filterPatientEntriesForLanTeamScope(
    seen,
    user,
    getClinicalScopeContextForEvaluate(),
    clinicalSessionContext.guardiasMap
  );
  return unseen.concat(scopedSeen);
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

// Guardia marks: null is a real value here (mark cleared), so take it as sent.
function applyLanGuardiaMarks(existing, p) {
  var changed = false;
  ['guardiaEsfuerzo', 'guardiaPronostico', 'guardiaNota'].forEach(function (key) {
    if (!Object.prototype.hasOwnProperty.call(p, key) || (existing[key] ?? null) === (p[key] ?? null)) return;
    existing[key] = p[key];
    changed = true;
  });
  return changed;
}

/** A per-key clock (set by Datos edits) beats the shared patient clock. */
function scalarKeyTakesIncoming(existing, p, key, takeIncoming) {
  var cmp = compareFieldClock(existing, p, key);
  return cmp == null ? takeIncoming : cmp === 1;
}

/** Fields only the authoritative (incoming) side may overwrite. */
function applyLanIncomingOnlyFields(existing, p) {
  var changed = applyLanGuardiaMarks(existing, p);
  if (p.lanUpdatedAt && String(p.lanUpdatedAt) !== String(existing.lanUpdatedAt || '')) {
    existing.lanUpdatedAt = p.lanUpdatedAt;
    changed = true;
  }
  if (Array.isArray(p.interconsultServiceIds)) {
    var nextIc = p.interconsultServiceIds.slice();
    if (JSON.stringify(existing.interconsultServiceIds || []) !== JSON.stringify(nextIc)) {
      existing.interconsultServiceIds = nextIc;
      changed = true;
    }
  }
  return changed;
}

function applyLanPatientScalars(existing, p) {
  var changed = false;
  var takeIncoming = incomingScalarsAreAuthoritative(existing, p);
  var scalarKeys = [
    'nombre', 'edad', 'sexo', 'area', 'servicio', 'sala', 'cuarto', 'cama', 'peso', 'talla', 'viaAcceso',
    'fiuxFecha', 'fimiFecha', 'registro',
  ];
  for (var sk = 0; sk < scalarKeys.length; sk += 1) {
    var key = scalarKeys[sk];
    if (assignLanScalarIfChanged(existing, key, p[key], existing[key], scalarKeyTakesIncoming(existing, p, key, takeIncoming))) changed = true;
  }
  if (takeIncoming && applyLanIncomingOnlyFields(existing, p)) changed = true;
  var censoBefore = JSON.stringify(existing);
  mergeCensoPatientFields(existing, p, { keepLocalWhenPresent: !takeIncoming });
  var clocks = mergeFieldClocks(existing, p);
  if (clocks.localNewer) {
    // Our key beat the peer's blob (or our push lost the blob LWW) — re-push the
    // merged blob with a fresh blob clock so the room converges on it.
    existing.lanUpdatedAt = new Date().toISOString();
    censusRepushNeeded = true;
  }
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
  // A partial ops-fold entry (e.g. only `fields` touched this poll) omits
  // `note`/`indicaciones` entirely — must not read back as "chart cleared"
  // for a patient whose real note just wasn't part of this batch.
  if (Object.prototype.hasOwnProperty.call(entry, 'note')) {
    var nextNote = entry.note || {};
    if (incomingDocWinsLww(getNotes()[existing.id], nextNote) && !lanJsonEqual(getNotes()[existing.id], nextNote)) {
      getNotes()[existing.id] = nextNote;
      changed = true;
    }
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'indicaciones')) {
    var nextInd = entry.indicaciones || {};
    if (incomingDocWinsLww(getIndicaciones()[existing.id], nextInd) && !lanJsonEqual(getIndicaciones()[existing.id], nextInd)) {
      getIndicaciones()[existing.id] = nextInd;
      changed = true;
    }
  }
  if (mergeLabSetsIntoLocalPatient(existing.id, entry.labHistory)) changed = true;
  return applyLanPatientMedArtifacts(existing, entry) || changed;
}

/** Merge incoming lab sets into a local patient's history (never drops local sets). True when it changed. */
function mergeLabSetsIntoLocalPatient(patientId, labHistory) {
  var nextLabs = trimMobileLabHistorySets(Array.isArray(labHistory) ? labHistory : []);
  var mergedLabs = trimMobileLabHistorySets(
    mergeLabHistorySets(getLabHistory()[patientId] || [], nextLabs)
  );
  reparseLabSetsFromSome(mergedLabs);
  if (lanJsonEqual(getLabHistory()[patientId], mergedLabs)) return false;
  getLabHistory()[patientId] = mergedLabs;
  bumpLabHistoryRevision(patientId);
  return true;
}

/**
 * Lab sets that reached this device without their patient row — the row came in an
 * earlier pull, and Nube pushes a lab set as its own mutation right after it. Merge
 * them into the local patient; a set for a patient not here yet is skipped.
 * @param {Record<string, unknown[]>} labsByPatientId
 * @returns {number} patients whose lab history changed
 */
export function applyLanLabSetsToExistingPatients(labsByPatientId) {
  var changed = 0;
  Object.keys(labsByPatientId || {}).forEach(function (pid) {
    var local = getPatients().find(function (p) {
      return p && p.id === pid;
    });
    if (local && mergeLabSetsIntoLocalPatient(local.id, labsByPatientId[pid])) changed += 1;
  });
  if (changed) {
    persistClinicalState({ domains: ['patients'] });
    scheduleIdleClinicalPersist();
  }
  return changed;
}

/** Order-free content of an eventualidades store (entries, deletions, labsText), clock left out. */
function eventualidadesContentKey(store) {
  var s = store || {};
  var rows = (Array.isArray(s.entries) ? s.entries : []).map(function (e) {
    return JSON.stringify([e && e.id, e && e.at, e && e.text]);
  });
  return JSON.stringify([rows.sort(), Object.keys(s.deletedIds || {}).sort(), String(s.labsText || '').trim()]);
}

function applyLanPatientNested(existing, entry, p) {
  var changed = false;
  if (p.eventualidades && typeof p.eventualidades === 'object') {
    var mergedEv = mergeEventualidades(existing.eventualidades, p.eventualidades) || p.eventualidades;
    if (eventualidadesContentKey(mergedEv) !== eventualidadesContentKey(p.eventualidades)) {
      // We hold entries the room lacks (a same-time add lost the whole-blob LWW):
      // re-push the union with a fresh clock, or the other device never gets ours.
      mergedEv.updatedAt = new Date().toISOString();
      censusRepushNeeded = true;
    }
    if (!lanJsonEqual(existing.eventualidades, mergedEv)) {
      existing.eventualidades = mergedEv;
      changed = true;
    }
  }
  if (applyLanPatientCharts(existing, entry)) changed = true;
  var monBefore = JSON.stringify(existing);
  mergePatientMonitoreoFromImported(existing, p);
  if (monitoreoAddsToIncoming(existing.monitoreo, p.monitoreo) && shouldRepushMonitoreo(existing.id, existing.monitoreo, p.monitoreo)) {
    // Same as eventualidades: the room's monitoreo is a whole-blob LWW, so a same-time
    // edit on this device lost there — re-push the merged blob with a fresh clock.
    existing.monitoreo.estadoClinicoUpdatedAt = new Date().toISOString();
    censusRepushNeeded = true;
  }
  if (JSON.stringify(existing) !== monBefore) changed = true;
  return changed;
}

/** @param {Record<string, unknown>} mine @param {Record<string, unknown>} theirs */
function ecHasExtra(mine, theirs) {
  return Object.keys(mine).some(function (k) {
    return String(mine[k] || '').trim() !== '' && String(mine[k]) !== String(theirs[k] || '');
  });
}

/** @param {Record<string, string[]>} mine @param {Record<string, string[]>} theirs */
function manualMedsHaveExtra(mine, theirs) {
  return Object.keys(mine).some(function (cat) {
    var have = Array.isArray(theirs[cat]) ? theirs[cat] : [];
    return (mine[cat] || []).some(function (x) { return have.indexOf(x) < 0; });
  });
}

/** patientId → content key (ours + room's, clocks left out) of the last monitoreo re-push. */
var monitoreoRepushKeys = new Map();

function monitoreoContentKey(mon) {
  return JSON.stringify(Object.assign({}, mon, { estadoClinicoUpdatedAt: undefined }));
}

/**
 * One re-push per (our content, room content). When the room never absorbs our extras
 * (its copy stays the same after our push), a fresh clock on every pull only loops:
 * new "now" each cycle, same rejection. A new local edit or a changed room copy re-arms it.
 */
function shouldRepushMonitoreo(patientId, mine, theirs) {
  var key = monitoreoContentKey(mine) + '|' + monitoreoContentKey(theirs);
  if (monitoreoRepushKeys.get(patientId) === key) return false;
  monitoreoRepushKeys.set(patientId, key);
  return true;
}

/** True when the merged local monitoreo holds content the incoming room copy lacks. */
function monitoreoAddsToIncoming(merged, incoming) {
  if (!merged || !incoming || typeof incoming !== 'object') return false;
  if (ecHasExtra(merged.estadoClinico || {}, incoming.estadoClinico || {})) return true;
  if (manualMedsHaveExtra(merged.manualMeds || {}, incoming.manualMeds || {})) return true;
  return (merged.historial || []).length > (incoming.historial || []).length;
}

function applyLanPatientMedArtifacts(existing, entry) {
  var changed = false;
  changed = applyLanMedRecetaField(existing, entry) || changed;
  changed = applyLanMedPharmField(existing, entry) || changed;
  changed = applyLanVpoField(existing, entry) || changed;
  changed = applyLanListadoField(existing, entry) || changed;
  return changed;
}

function applyLanListadoField(existing, entry) {
  if (!Object.prototype.hasOwnProperty.call(entry, 'listadoProblemas')) return false;
  if (entry.listadoProblemas) {
    if (lanJsonEqual(getListadoProblemas()[existing.id], entry.listadoProblemas)) return false;
    getListadoProblemas()[existing.id] = entry.listadoProblemas;
    return true;
  }
  if (!getListadoProblemas()[existing.id]) return false;
  delete getListadoProblemas()[existing.id];
  return true;
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
  // A cloud entry without `vpo` (partial fold, or an older peer) must not wipe the local copy.
  if (!Object.prototype.hasOwnProperty.call(entry, 'vpo')) return false;
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
  var labs = trimMobileLabHistorySets(
    Array.isArray(entry.labHistory) ? entry.labHistory : []
  );
  reparseLabSetsFromSome(labs);
  getLabHistory()[remoteId] = labs;
  if (labs.length) bumpLabHistoryRevision(remoteId);
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
    lanUpdatedAt: p.lanUpdatedAt || new Date().toISOString(),
    interconsultServiceIds: Array.isArray(p.interconsultServiceIds) ? p.interconsultServiceIds.slice() : [],
  };
  mergePatientMonitoreoFromImported(newPat, p);
  mergeCensoPatientFields(newPat, p);
  mergeFieldClocks(newPat, p);
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
}

function flushCensusRepush() {
  if (!censusRepushNeeded) return;
  censusRepushNeeded = false;
  // Dynamic: mutate-bridge pulls the whole cloud stack; LAN-only apply never needs it.
  void import('../cloud-sync/mutate-bridge.mjs')
    .then(function (m) {
      m.scheduleCloudSyncPush();
    })
    .catch(function () {});
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
    persistClinicalState({ domains: ['patients'] });
    scheduleIdleClinicalPersist();
    if (!shouldEnforceTeamPatientMirror()) {
      refreshLanPatientUiAfterApply();
    }
  }
  flushCensusRepush();
  return { added: added, updated: updated };
}
