/**
 * Bloqueo persistente de pendientes «Repo …» (Manejo → Electrolitos).
 * Evita que reaparezcan tras reinicio o merge LAN si ya se eliminaron o marcaron hechos.
 */
import { shouldAddLabSuggestionTodo } from './lab-clinical-suggestions.mjs';
import { evaluateElectrolyteManejo } from './electrolyte-manejo.mjs';
import { sortLabHistoryChronological, normalizeFechaLabHistory } from './tend-core.mjs';

const LS_KEY = 'rpc-manejo-todo-dismiss';

function readMap() {
  try {
    var raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    var map = JSON.parse(raw);
    return map && typeof map === 'object' ? map : {};
  } catch (_e) {
    return {};
  }
}

function writeMap(map) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map || {}));
  } catch (_e) {}
}

/**
 * @param {string} ruleId — p. ej. manejo:k-hypo-severe o ruleId antes del prefijo
 * @param {string} labFecha
 */
export function manejoTodoDismissKey(ruleId, labFecha) {
  var rid = String(ruleId || '').trim();
  if (rid.indexOf('manejo:') !== 0) rid = 'manejo:' + rid;
  return rid + '|' + String(labFecha || '').trim();
}

/**
 * @param {string} patientId
 * @param {string} ruleId
 * @param {string} labFecha
 */
export function isManejoTodoDismissed(patientId, ruleId, labFecha) {
  if (!patientId || !ruleId) return false;
  var map = readMap();
  var list = Array.isArray(map[patientId]) ? map[patientId] : [];
  return list.indexOf(manejoTodoDismissKey(ruleId, labFecha)) >= 0;
}

/**
 * @param {string} patientId
 * @param {string} ruleId
 * @param {string} labFecha
 */
export function dismissManejoTodo(patientId, ruleId, labFecha) {
  if (!patientId || !ruleId) return;
  var key = manejoTodoDismissKey(ruleId, labFecha);
  var map = readMap();
  var list = Array.isArray(map[patientId]) ? map[patientId].slice() : [];
  if (list.indexOf(key) < 0) list.push(key);
  map[patientId] = list;
  writeMap(map);
}

function isRepoTodo(todo) {
  if (!todo) return false;
  var rid = String(todo.labRuleId || '');
  if (rid.indexOf('manejo:') === 0) return true;
  return /^Repo /i.test(String(todo.text || ''));
}

/**
 * Registra bloqueo a partir de un pendiente existente (eliminar o marcar hecho).
 * @param {string} patientId
 * @param {{ labRuleId?: string, labFecha?: string, text?: string }} todo
 */
export function dismissManejoTodoFromTodo(patientId, todo) {
  if (!patientId || !todo) return;
  var rid = String(todo.labRuleId || '');
  var fecha = String(todo.labFecha || '').trim();
  if (rid.indexOf('manejo:') === 0) {
    dismissManejoTodo(patientId, rid, fecha);
    return;
  }
  if (/^Repo /i.test(String(todo.text || ''))) {
    var map = readMap();
    var list = Array.isArray(map[patientId]) ? map[patientId].slice() : [];
    var legacyKey = 'legacy:' + fecha + '|' + String(todo.text || '').trim().slice(0, 200);
    if (list.indexOf(legacyKey) < 0) list.push(legacyKey);
    map[patientId] = list;
    writeMap(map);
  }
}

function isLegacyRepoDismissed(patientId, todo) {
  if (!patientId || !todo) return false;
  var map = readMap();
  var list = Array.isArray(map[patientId]) ? map[patientId] : [];
  var legacyKey = 'legacy:' + String(todo.labFecha || '').trim() + '|' + String(todo.text || '').trim().slice(0, 200);
  return list.indexOf(legacyKey) >= 0;
}

/**
 * @param {string} patientId
 * @param {string} ruleId — con o sin prefijo manejo:
 * @param {string} labFecha
 * @param {unknown[]} todos
 */
export function shouldAllowManejoTodo(patientId, ruleId, labFecha, todos) {
  if (isManejoTodoDismissed(patientId, ruleId, labFecha)) return false;
  var scoped = String(ruleId || '').trim();
  if (scoped.indexOf('manejo:') !== 0) scoped = 'manejo:' + scoped;
  return shouldAddLabSuggestionTodo(todos, scoped, labFecha);
}

/**
 * @param {string} patientId
 * @param {unknown[]} todos
 */
export function filterTodosRespectingDismissals(patientId, todos) {
  return (todos || []).filter(function (t) {
    if (!t || t.completed || !isRepoTodo(t)) return true;
    if (isLegacyRepoDismissed(patientId, t)) return false;
    var rid = String(t.labRuleId || '');
    if (rid.indexOf('manejo:') === 0 && isManejoTodoDismissed(patientId, rid, t.labFecha)) return false;
    return true;
  });
}

/**
 * Quita pendientes Repo abiertos que el usuario ya bloqueó (p. ej. tras merge LAN).
 * @param {string} patientId
 * @param {{ getTodos(id: string): unknown[], saveTodos(id: string, todos: unknown[]): void }} storageApi
 * @returns {boolean} true si hubo cambios
 */
export function purgeBlockedManejoTodosForPatient(patientId, storageApi) {
  if (!patientId || !storageApi || typeof storageApi.getTodos !== 'function') return false;
  var todos = storageApi.getTodos(patientId);
  if (!todos.length) return false;
  var next = filterTodosRespectingDismissals(patientId, todos);
  if (next.length === todos.length) return false;
  storageApi.saveTodos(patientId, next);
  return true;
}

/**
 * @param {object} patient
 * @param {unknown[]} labHistorySets
 */
export function tryClearManejoPendingForPatient(patient, labHistorySets) {
  if (!patient || !patient.manejoPending) return false;
  var labSetId = String(patient.manejoPending.labSetId || '');
  var sets = sortLabHistoryChronological(labHistorySets || []);
  var set =
    sets.find(function (s) {
      return s && String(s.id) === labSetId;
    }) || sets[0];
  if (!set) {
    patient.manejoPending = null;
    return true;
  }
  var fecha = normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim();
  var evalOut = evaluateElectrolyteManejo({
    parsedBySection: set.parsedBySection,
    parsed: set.parsed,
    patient: patient,
    refsBySection: set.refsBySection,
    labSetId: set.id != null ? String(set.id) : '',
    labFecha: fecha,
  });
  if (shouldClearManejoPendingForDismissals(patient, sets, evalOut, fecha)) {
    patient.manejoPending = null;
    return true;
  }
  return false;
}

/**
 * @param {Array<{ id?: string, manejoPending?: { labSetId?: string } }>} patients
 * @param {Record<string, unknown[]>} labHistory
 * @param {{ getTodos(id: string): unknown[], saveTodos(id: string, todos: unknown[]): void }} storageApi
 */
export function syncManejoTodoDismissalsOnBoot(patients, labHistory, storageApi) {
  var any = false;
  for (var i = 0; i < (patients || []).length; i += 1) {
    var p = patients[i];
    if (!p || !p.id || String(p.id).indexOf('demo-') === 0) continue;
    if (purgeBlockedManejoTodosForPatient(p.id, storageApi)) any = true;
    var hist = labHistory && labHistory[p.id] ? labHistory[p.id] : [];
    if (tryClearManejoPendingForPatient(p, hist)) any = true;
  }
  return any;
}

/**
 * Si todas las alteraciones del último lab están bloqueadas, quitar manejoPending.
 * @param {object} patient
 * @param {unknown[]} labHistorySets
 * @param {{ rows?: Array<{ ruleId?: string }> } | null} evalOut
 * @param {string} labFechaNorm
 */
export function shouldClearManejoPendingForDismissals(patient, labHistorySets, evalOut, labFechaNorm) {
  if (!patient || !patient.id || !patient.manejoPending) return false;
  if (!evalOut || !evalOut.rows || !evalOut.rows.length) return true;
  var pid = String(patient.id);
  var fecha = String(labFechaNorm || '').trim();
  for (var r = 0; r < evalOut.rows.length; r += 1) {
    var row = evalOut.rows[r];
    if (!row) continue;
    if (!isManejoTodoDismissed(pid, 'manejo:' + String(row.ruleId || ''), fecha)) return false;
  }
  return true;
}
