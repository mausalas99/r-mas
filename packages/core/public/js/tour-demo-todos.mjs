/**
 * Pendientes del tour guiado (demo-onboarding). storage.saveTodos omite demo-*;
 * se escriben directo en rpc-todos (y en el caché de escritorio) como en pitch.
 */
import { DEMO_PATIENT_ID } from './tour-demo-patient.mjs';
import { getBlobCache, invalidateParsed } from './storage/storage-core.mjs';

const TODOS_LS_KEY = 'rpc-todos';

/**
 * Desktop/Electron reads todos from the in-memory blob cache, not localStorage
 * (storage-core.mjs readClinicalBlob): read from it when present, so the real
 * patients' pendientes are kept, and mirror writes into it without persisting
 * to the DB (demo data must not survive to disk). Same fix as
 * tour-pitch-demo-todos.mjs; without it the tour's demo pendientes never showed
 * ("Sin pendientes") once the DB was unlocked.
 */
function readTodosMap() {
  try {
    const cache = getBlobCache();
    if (cache) {
      const v = cache.todos;
      if (v == null) return {};
      return typeof v === 'string' ? JSON.parse(v) : { ...v };
    }
    const raw = localStorage.getItem(TODOS_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeTodosMap(map) {
  const json = JSON.stringify(map || {});
  try {
    localStorage.setItem(TODOS_LS_KEY, json);
  } catch (e) { console.warn('[tour-demo-todos] failed to write ' + TODOS_LS_KEY, e); }
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
export function buildTourDemoTodosForPatient(patientId) {
  if (patientId !== DEMO_PATIENT_ID) return [];
  return [
    todoEntry('tour-todo-bh', 'BH y QS de control mañana (IRC / anemia)', 'alta', false),
    todoEntry(
      'tour-todo-glu',
      'Repetir glucometría si >180 mg/dL en próximo turno',
      'media',
      false
    ),
    todoEntry(
      'tour-todo-atb',
      'Ajustar ATB según antibiograma cuando esté disponible',
      'alta',
      false
    ),
    todoEntry(
      'tour-todo-infecto',
      'Interconsulta Infectología — documentar en nota',
      'media',
      false
    ),
    todoEntry('tour-todo-io', 'Balance hídrico estricto — registrar I/O en turno', 'baja', false),
    todoEntry('tour-todo-eco', 'Valorar ecografía abdominal según evolución', 'media', false),
  ];
}

export function seedTourDemoTodos(patientId) {
  const pid = patientId || DEMO_PATIENT_ID;
  const todos = buildTourDemoTodosForPatient(pid);
  if (!todos.length) return;
  const map = readTodosMap();
  map[pid] = todos;
  writeTodosMap(map);
}

export function clearTourDemoTodos() {
  const map = readTodosMap();
  let changed = false;
  if (map[DEMO_PATIENT_ID]) {
    delete map[DEMO_PATIENT_ID];
    changed = true;
  }
  if (changed) writeTodosMap(map);
}
