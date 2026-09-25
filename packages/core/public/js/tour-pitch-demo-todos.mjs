/**
 * Pendientes del modo presentación (demo-pitch). Se escriben en rpc-todos porque saveTodos omite demo-*.
 */
import { getBlobCache, invalidateParsed } from './storage/storage-core.mjs';

const PITCH_DEMO_PATIENT_ID = 'demo-pitch';

const TODOS_LS_KEY = 'rpc-todos';

function readTodosMap() {
  try {
    const raw = localStorage.getItem(TODOS_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Desktop/Electron mode reads todos from an in-memory blob cache, not localStorage
 * (see storage-core.mjs readClinicalBlob) — writing here only to localStorage left
 * that cache stale, so Modo presentación's Pendientes tab always showed "Sin
 * pendientes" once a DB session was unlocked. Mirror the write into the cache too,
 * without persisting to the real DB (demo data must not survive to disk).
 * @param {Record<string, unknown>} map
 */
function writeTodosMap(map) {
  const json = JSON.stringify(map || {});
  try {
    localStorage.setItem(TODOS_LS_KEY, json);
  } catch (e) {
    console.warn('[tour-pitch-demo-todos] failed to write ' + TODOS_LS_KEY, e);
  }
  const cache = getBlobCache();
  if (cache) {
    cache.todos = json;
    invalidateParsed('todos');
  }
}

function todoEntry(id, text, priority, completed) {
  const now = new Date().toISOString();
  return {
    id,
    text,
    priority,
    completed: !!completed,
    createdAt: now,
    updatedAt: now,
  };
}

/** @param {string} patientId */
export function buildPitchDemoTodosForPatient(patientId) {
  if (patientId !== PITCH_DEMO_PATIENT_ID) return [];
  return [
    todoEntry('pitch-todo-bh-qs', 'BH y QS control mañana (peritonitis / IRC)', 'alta', false),
    todoEntry(
      'pitch-todo-atb',
      'Ajustar esquema ATB según antibiograma (Pseudomonas / E. coli)',
      'alta',
      false
    ),
    todoEntry(
      'pitch-todo-glu',
      'Repetir glucometría si >180 mg/dL en próximo turno',
      'media',
      false
    ),
    todoEntry(
      'pitch-todo-infecto',
      'Interconsulta Infectología — documentar en nota',
      'media',
      false
    ),
    todoEntry('pitch-todo-io', 'Balance hídrico estricto — registrar I/O en turno', 'baja', false),
    todoEntry('pitch-todo-k-repo', 'Reposición K vo (valorar con QS)', 'media', true),
  ];
}

export function seedPitchDemoTodos() {
  const map = readTodosMap();
  map[PITCH_DEMO_PATIENT_ID] = buildPitchDemoTodosForPatient(PITCH_DEMO_PATIENT_ID);
  delete map['demo-pitch-2'];
  writeTodosMap(map);
}

export function clearPitchDemoTodos() {
  const map = readTodosMap();
  let changed = false;
  for (const id of [PITCH_DEMO_PATIENT_ID, 'demo-pitch-2']) {
    if (map[id]) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) writeTodosMap(map);
}
