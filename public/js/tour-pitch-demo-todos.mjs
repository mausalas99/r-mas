/**
 * Pendientes del tour pitch (demo-pitch*). Se escriben en rpc-todos porque saveTodos omite demo-*.
 */
const PITCH_DEMO_PATIENT_ID = 'demo-pitch';
const PITCH_DEMO_PATIENT_ID_2 = 'demo-pitch-2';

const TODOS_LS_KEY = 'rpc-todos';

function readTodosMap() {
  try {
    const raw = localStorage.getItem(TODOS_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_e) {
    return {};
  }
}

function writeTodosMap(map) {
  try {
    localStorage.setItem(TODOS_LS_KEY, JSON.stringify(map || {}));
  } catch (_e) {}
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
  if (patientId === PITCH_DEMO_PATIENT_ID) {
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
  if (patientId === PITCH_DEMO_PATIENT_ID_2) {
    return [
      todoEntry(
        'pitch-todo-g-insulina',
        'Ajuste de insulina basal — revisar glucometrías',
        'alta',
        false
      ),
      todoEntry('pitch-todo-g-hba1c', 'HbA1c y perfil lipídico ambulatorio', 'media', false),
      todoEntry('pitch-todo-g-dieta', 'Educación dietética DM2', 'baja', false),
    ];
  }
  return [];
}

export function seedPitchDemoTodos() {
  const map = readTodosMap();
  map[PITCH_DEMO_PATIENT_ID] = buildPitchDemoTodosForPatient(PITCH_DEMO_PATIENT_ID);
  map[PITCH_DEMO_PATIENT_ID_2] = buildPitchDemoTodosForPatient(PITCH_DEMO_PATIENT_ID_2);
  writeTodosMap(map);
}

export function clearPitchDemoTodos() {
  const map = readTodosMap();
  let changed = false;
  if (map[PITCH_DEMO_PATIENT_ID]) {
    delete map[PITCH_DEMO_PATIENT_ID];
    changed = true;
  }
  if (map[PITCH_DEMO_PATIENT_ID_2]) {
    delete map[PITCH_DEMO_PATIENT_ID_2];
    changed = true;
  }
  if (changed) writeTodosMap(map);
}
