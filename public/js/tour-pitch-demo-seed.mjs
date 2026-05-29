/**
 * Seed y cleanup del paciente demo-pitch para el tour de presentación.
 */
import { procesarLabs } from './labs.js';
import { extractParsedValues } from './features/diagrams-parse.mjs';
import {
  DEMO_SOME_LAB_REPORT,
  OLDER_DEMO_SOME_LAB_REPORT,
  DEMO_GARCIA_LAB_REPORT,
  DEMO_TOUR_LAB_PASTE,
} from './tour-demo-some-lab.mjs';
import { PITCH_CULTIVO_LAB_SPECS } from './tour-pitch-cultivos-some.mjs';
import { buildTourDemoListadoProblemas } from './tour-demo-listado-problemas.mjs';
import { medicionHasCoreData } from './features/estado-actual-data.mjs';
import { normalizeRecetaHuDraft } from './receta-hu-core.mjs';
import { storage } from './storage.js';
import { bumpLabHistoryRevision } from './lab-history-cache.mjs';
import { seedPitchDemoTodos, clearPitchDemoTodos } from './tour-pitch-demo-todos.mjs';

export const PITCH_DEMO_PATIENT_ID = 'demo-pitch';
export const PITCH_DEMO_PATIENT_ID_2 = 'demo-pitch-2';

const PITCH_SANDBOX_SS_KEY = 'rpc-pitch-tour-sandbox-v1';
export const PITCH_TOUR_ACTIVE_SS_KEY = 'rpc-pitch-tour-active';

/** @type {typeof import('./app-state.mjs').patients | null} */
let pitchPatientsBackup = null;

function readPitchSandboxBackup() {
  try {
    const raw = sessionStorage.getItem(PITCH_SANDBOX_SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_e) {
    return null;
  }
}

function writePitchSandboxBackup(data) {
  try {
    sessionStorage.setItem(PITCH_SANDBOX_SS_KEY, JSON.stringify(data));
  } catch (_e) {}
}

function clearPitchSandboxBackup() {
  try {
    sessionStorage.removeItem(PITCH_SANDBOX_SS_KEY);
  } catch (_e) {}
}

export function markPitchTourSessionActive(active) {
  try {
    if (active) sessionStorage.setItem(PITCH_TOUR_ACTIVE_SS_KEY, '1');
    else sessionStorage.removeItem(PITCH_TOUR_ACTIVE_SS_KEY);
  } catch (_e) {}
}

function capturePitchSandbox(currentPatients) {
  if (!pitchPatientsBackup) {
    pitchPatientsBackup = currentPatients.slice();
  }
  const existing = readPitchSandboxBackup();
  if (existing && Array.isArray(existing.patients) && existing.patients.length) return;
  writePitchSandboxBackup({
    patients: pitchPatientsBackup,
    scheduledProcedures: storage.getScheduledProcedures().slice(),
    capturedAt: Date.now(),
  });
}

function restorePitchPatientsBackup() {
  if (pitchPatientsBackup && pitchPatientsBackup.length) {
    return pitchPatientsBackup.slice();
  }
  const sandbox = readPitchSandboxBackup();
  if (sandbox && Array.isArray(sandbox.patients) && sandbox.patients.length) {
    return sandbox.patients.slice();
  }
  return null;
}

/** Lista real para saveState mientras el pitch aísla la UI a demos. */
export function resolvePitchPersistPatients() {
  if (!pitchPatientIsolation) return undefined;
  const restored = restorePitchPatientsBackup();
  return restored && restored.length ? restored : undefined;
}

/**
 * Si el tour dejó solo demos o lista vacía en disco, restaura desde sessionStorage.
 * @param {object} state — mismo shape que clearPitchDemo
 */
export function tryRecoverPatientsFromPitchSandboxIfNeeded(state) {
  const { patients, setPatients, saveState } = state;
  const sandbox = readPitchSandboxBackup();
  if (!sandbox || !Array.isArray(sandbox.patients) || !sandbox.patients.length) return false;
  const onlyDemos =
    patients.length > 0 &&
    patients.every(function (p) {
      return p && isPitchDemoPatientId(p.id);
    });
  const empty = patients.length === 0;
  if (!onlyDemos && !empty) return false;
  setPatients(sandbox.patients.slice());
  if (Array.isArray(sandbox.scheduledProcedures)) {
    storage.saveScheduledProcedures(sandbox.scheduledProcedures);
  }
  clearPitchSandboxBackup();
  markPitchTourSessionActive(false);
  setPitchPatientIsolation(false);
  pitchPatientsBackup = null;
  saveState({ immediate: true });
  return true;
}

/** Mientras el pitch está activo, la UI solo muestra pacientes demo. */
let pitchPatientIsolation = false;

export function setPitchPatientIsolation(active) {
  pitchPatientIsolation = !!active;
}

export function isPitchPatientIsolationActive() {
  return pitchPatientIsolation;
}

export function isPitchDemoPatientId(patientId) {
  return patientId === PITCH_DEMO_PATIENT_ID || patientId === PITCH_DEMO_PATIENT_ID_2;
}

/** @param {Array<{ id?: string }>} list */
export function filterPatientsForPitchTour(list) {
  if (!pitchPatientIsolation) return list;
  return (list || []).filter(function (p) {
    return p && isPitchDemoPatientId(p.id);
  });
}

function buildPitchLabHistoryEntry(spec) {
  const resLabs = procesarLabs(spec.report).resLabs;
  return {
    id: spec.id,
    fecha: spec.fecha,
    hora: '',
    resLabs,
    parsed: extractParsedValues(resLabs),
    sourceText: spec.report,
  };
}

/**
 * @param {Date} [ref]
 */
export function buildPitchMonitoreoHistorial(ref) {
  const now = ref instanceof Date ? ref : new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  /** @type {Array<object>} */
  const historial = [];

  function atDayOffset(dayOff, hour, minute, payload) {
    const d = new Date(now.getTime() - dayOff * dayMs);
    d.setHours(hour, minute, 0, 0);
    historial.push({
      id: 'pitch-ea-' + historial.length,
      recordedAt: d.toISOString(),
      vitals: payload.vitals || {},
      glucometrias: payload.glucometrias || [],
      io: payload.io || {},
    });
  }

  // Hoy: 3 mediciones
  atDayOffset(0, 7, 30, {
    vitals: { tas: 118, tad: 72, fc: 88, fr: 18, temp: 36.8, sat: 96 },
    glucometrias: [{ value: 142, time: '07:35' }],
    io: { ing: 450, egr: 320 },
  });
  atDayOffset(0, 13, 0, {
    vitals: { tas: 112, tad: 68, fc: 82, fr: 17, temp: 36.6, sat: 97 },
    glucometrias: [{ value: 168, time: '13:10' }, { value: 155, time: '18:20' }],
    io: { ing: 600, egr: 410 },
  });
  atDayOffset(0, 21, 15, {
    vitals: { tas: 124, tad: 76, fc: 90, fr: 19, temp: 37.1, sat: 95 },
    glucometrias: [{ value: 198, time: '21:20' }],
    io: { ing: 200, egr: 180 },
  });
  // Ayer: 3 mediciones
  atDayOffset(1, 8, 0, {
    vitals: { tas: 128, tad: 78, fc: 92, fr: 20, temp: 37.0, sat: 94 },
    glucometrias: [{ value: 176, time: '08:15' }],
    io: { ing: 500, egr: 380 },
  });
  atDayOffset(1, 14, 30, {
    vitals: { tas: 120, tad: 70, fc: 86, fr: 18, temp: 36.7, sat: 96 },
    glucometrias: [{ value: 132, time: '14:45' }],
    io: { ing: 550, egr: 420 },
  });
  atDayOffset(1, 22, 0, {
    vitals: { tas: 116, tad: 74, fc: 84, fr: 17, temp: 36.5, sat: 97 },
    glucometrias: [{ value: 188, time: '22:10' }],
    io: { ing: 180, egr: 150 },
  });
  // Anteayer: 2 mediciones
  atDayOffset(2, 9, 45, {
    vitals: { tas: 132, tad: 80, fc: 94, fr: 21, temp: 37.2, sat: 93 },
    glucometrias: [{ value: 210, time: '09:50' }],
    io: { ing: 480, egr: 360 },
  });
  atDayOffset(2, 16, 20, {
    vitals: { tas: 126, tad: 76, fc: 88, fr: 19, temp: 36.9, sat: 95 },
    glucometrias: [{ value: 165, time: '16:30' }],
    io: { ing: 520, egr: 400 },
  });

  return {
    estadoClinico: {
      four: '4 extremidades',
      esferas: 'Sin datos nuevos',
      analgesia: 'Paracetamol 1 g IV c/8h',
      abx: 'Cefepime 1 g IV c/8h (día 2)',
      antihta: 'Losartán 50 mg VO',
      vasop: 'No',
      soporte: 'O2 nasal 2 L/min',
      tempContext: 'Afebril en turno',
      dieta: 'Dieta renal',
      kcalKg: '25',
      kcal: '1750',
      pesoRef: '70',
    },
    confirmado: { analgesia: true, abx: true, antihta: false, vasop: false },
    pendienteReceta: {
      four: '',
      esferas: '',
      analgesia: '',
      abx: '',
      antihta: '',
      vasop: '',
      soporte: '',
      tempContext: '',
      dieta: '',
      kcalKg: '',
      kcal: '',
      pesoRef: '',
    },
    historial,
    textoGuardado: {
      text: 'Paciente en monitoreo estructurado; tendencia de glucometrías en ascenso nocturna.',
      savedAt: now.toISOString(),
    },
  };
}

/** @param {unknown[]} historial */
export function countDistinctLocalDaysInHistorial(historial) {
  const keys = new Set();
  for (const m of historial || []) {
    if (!m || !m.recordedAt) continue;
    const d = new Date(m.recordedAt);
    keys.add(d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate());
  }
  return keys.size;
}

/** @param {unknown[]} historial */
export function countHistorialWithCoreData(historial) {
  let n = 0;
  for (const m of historial || []) {
    if (medicionHasCoreData(m)) n += 1;
  }
  return n;
}

/**
 * @param {object} state
 */
export function seedPitchDemo(state) {
  const {
    patients,
    notes,
    indicaciones,
    labHistory,
    listadoProblemas,
    medRecetaByPatient,
    medNotaSelectionByPatient,
    recetaHuByPatient,
    setPatients,
    saveState,
    selectPatient,
    renderPatientList,
  } = state;

  const today = new Date();
  const fecha =
    String(today.getDate()).padStart(2, '0') +
    '/' +
    String(today.getMonth() + 1).padStart(2, '0') +
    '/' +
    today.getFullYear();
  const hora =
    String(today.getHours()).padStart(2, '0') + ':' + String(today.getMinutes()).padStart(2, '0');

  const demoPatient = {
    id: PITCH_DEMO_PATIENT_ID,
    nombre: 'DEMO PÉREZ',
    registro: '0008421-7',
    edad: '67 años',
    sexo: 'M',
    area: 'SERVICIO DEMO',
    servicio: 'SERVICIO DEMO',
    cuarto: '101',
    cama: '1',
    fromLab: false,
    isDemo: true,
    monitoreo: buildPitchMonitoreoHistorial(today),
  };

  const demoPatient2 = {
    id: PITCH_DEMO_PATIENT_ID_2,
    nombre: 'DEMO GARCÍA',
    registro: '0007755-3',
    edad: '54 años',
    sexo: 'F',
    area: 'SERVICIO DEMO',
    servicio: 'SERVICIO DEMO',
    cuarto: '102',
    cama: '2',
    fromLab: false,
    isDemo: true,
  };

  notes[PITCH_DEMO_PATIENT_ID] = {
    fecha,
    hora,
    interrogatorio: '',
    evolucion:
      'Paciente masculino de 67 años con peritonitis asociada a diálisis peritoneal en manejo antibiótico. ' +
      'Hemodinámicamente estable, afebril en el turno. Continúa monitoreo de glucometrías y balance hídrico.',
    estudios: 'Cultivos con aislamientos documentados; ver pestaña Cultivos.',
    diagnosticos: [
      'Peritonitis asociada a diálisis peritoneal',
      'DM2 descompensada',
      'IRC estadio 3',
      'HAS',
    ],
    tratamiento: ['Cefepime 1 g IV c/8h', 'Paracetamol 1 g IV c/8h'],
    ta: '118/72',
    fr: '18',
    fc: '88',
    temp: '36.8',
    peso: '70',
    medico: 'Dr. Demo',
    profesor: '',
  };

  indicaciones[PITCH_DEMO_PATIENT_ID] = {
    fecha,
    hora,
    medicos: 'Dr. Demo · SERVICIO DEMO',
    dieta: 'Dieta renal, restricción de K y P',
    cuidados: 'Signos vitales c/8h, glucometría c/6h, balance hídrico estricto',
    estudios: 'Control de BH y QS mañana',
    medicamentos:
      '1. Cefepime 1 g IV c/8h\n2. Paracetamol 1 g IV c/8h PRN dolor\n3. Losartán 50 mg VO c/24h',
    interconsultas: 'Nefrología de seguimiento',
    otros: [],
  };

  notes[PITCH_DEMO_PATIENT_ID_2] = {
    fecha,
    hora,
    interrogatorio: '',
    evolucion: '',
    estudios: '',
    diagnosticos: ['DM2 descompensada'],
    tratamiento: [''],
    ta: '',
    fr: '',
    fc: '',
    temp: '',
    peso: '',
    medico: '',
    profesor: '',
  };

  indicaciones[PITCH_DEMO_PATIENT_ID_2] = {
    fecha,
    hora,
    medicos: '',
    dieta: '',
    cuidados: '',
    estudios: '',
    medicamentos: '',
    interconsultas: '',
    otros: [],
  };

  try {
    labHistory[PITCH_DEMO_PATIENT_ID] = buildPitchLabHistoryEntries();
    bumpLabHistoryRevision(PITCH_DEMO_PATIENT_ID);
    const garciaLabs = procesarLabs(DEMO_GARCIA_LAB_REPORT).resLabs;
    labHistory[PITCH_DEMO_PATIENT_ID_2] = [
      {
        id: 'pitch-lab-garcia-1',
        fecha: '11/04/2026',
        hora: '',
        resLabs: garciaLabs,
        parsed: extractParsedValues(garciaLabs),
      },
    ];
    bumpLabHistoryRevision(PITCH_DEMO_PATIENT_ID_2);
  } catch (_e) {
    delete labHistory[PITCH_DEMO_PATIENT_ID];
    delete labHistory[PITCH_DEMO_PATIENT_ID_2];
  }

  listadoProblemas[PITCH_DEMO_PATIENT_ID] = buildTourDemoListadoProblemas(fecha, hora);

  medRecetaByPatient[PITCH_DEMO_PATIENT_ID] = {
    fechaActualizacion: fecha,
    items: [
      {
        id: 'pitch-med-1',
        nombreRaw: 'PARACETAMOL 1 G SOL INY (*)',
        viaRaw: 'VIA INTRAVENOSA',
        dosisRaw: '1 G //',
        frecuenciaRaw: 'CADA 8 HORAS',
        suspendido: false,
        diaTratamiento: null,
      },
      {
        id: 'pitch-med-2',
        nombreRaw: 'CEFEPIME 1 G SOL INY (*)',
        viaRaw: 'VIA INTRAVENOSA',
        dosisRaw: '1 G // *DIA# 2*',
        frecuenciaRaw: 'CADA 8 HORAS',
        suspendido: false,
        diaTratamiento: 2,
      },
    ],
  };
  medNotaSelectionByPatient[PITCH_DEMO_PATIENT_ID] = {
    'pitch-med-1': true,
    'pitch-med-2': true,
  };

  recetaHuByPatient[PITCH_DEMO_PATIENT_ID] = normalizeRecetaHuDraft({
    fecha,
    meds: [
      {
        medicamento: 'Cefepime',
        presentacion: '1 g IV',
        dosis: '1 g IV c/8h',
      },
      {
        medicamento: 'Paracetamol',
        presentacion: '1 g IV',
        dosis: '1 g IV c/8h PRN',
      },
    ],
    labs: ['Biometría hemática', 'Química sanguínea', 'Cultivos de control'],
    cuidados: 'Signos vitales, glucometría y balance hídrico',
    proximaCita: 'Consulta de Nefrología en 2 semanas',
    proximaCitaFecha: fecha,
  });

  const agendaDay = fecha;
  const existingAgenda = storage.getScheduledProcedures().filter(function (ev) {
    return ev.patientId !== PITCH_DEMO_PATIENT_ID;
  });
  storage.saveScheduledProcedures(
    existingAgenda.concat([
      {
        id: 'pitch-agenda-1',
        patientId: PITCH_DEMO_PATIENT_ID,
        procedure: 'Catéter peritoneal — revisión',
        location: 'Quirófano menor',
        date: agendaDay,
        time: '10:30',
        notes: 'Demo pitch',
      },
      {
        id: 'pitch-agenda-2',
        patientId: PITCH_DEMO_PATIENT_ID,
        procedure: 'BH + QS control',
        location: 'Laboratorio',
        date: agendaDay,
        time: '06:00',
        notes: 'Demo pitch',
      },
    ])
  );

  capturePitchSandbox(patients);
  setPitchPatientIsolation(true);
  setPatients([demoPatient, demoPatient2]);

  seedPitchDemoTodos();

  saveState();
  renderPatientList();
  selectPatient(PITCH_DEMO_PATIENT_ID);

  return { labPasteText: DEMO_TOUR_LAB_PASTE };
}

/**
 * @param {object} state
 */
export function clearPitchDemo(state) {
  const {
    patients,
    notes,
    indicaciones,
    labHistory,
    listadoProblemas,
    medRecetaByPatient,
    medNotaSelectionByPatient,
    recetaHuByPatient,
    setPatients,
    saveState,
    renderPatientList,
    getActiveId,
    setActiveId,
  } = state;

  setPitchPatientIsolation(false);
  let restoredPatients = restorePitchPatientsBackup();
  if (!restoredPatients || !restoredPatients.length) {
    const sandbox = readPitchSandboxBackup();
    if (sandbox && Array.isArray(sandbox.patients) && sandbox.patients.length) {
      restoredPatients = sandbox.patients.slice();
    }
  }
  if (restoredPatients && restoredPatients.length) {
    setPatients(restoredPatients);
  } else {
    const filtered = patients.filter(function (p) {
      return (
        p &&
        p.id !== PITCH_DEMO_PATIENT_ID &&
        p.id !== PITCH_DEMO_PATIENT_ID_2 &&
        !p.isDemo
      );
    });
    if (filtered.length) {
      setPatients(filtered);
    } else {
      const sandbox = readPitchSandboxBackup();
      if (sandbox && Array.isArray(sandbox.patients) && sandbox.patients.length) {
        setPatients(sandbox.patients.slice());
      } else {
        setPatients(filtered);
      }
    }
  }
  pitchPatientsBackup = null;

  const sandbox = readPitchSandboxBackup();
  if (sandbox && Array.isArray(sandbox.scheduledProcedures)) {
    storage.saveScheduledProcedures(sandbox.scheduledProcedures);
  }
  clearPitchSandboxBackup();
  markPitchTourSessionActive(false);
  delete notes[PITCH_DEMO_PATIENT_ID];
  delete notes[PITCH_DEMO_PATIENT_ID_2];
  delete indicaciones[PITCH_DEMO_PATIENT_ID];
  delete indicaciones[PITCH_DEMO_PATIENT_ID_2];
  delete labHistory[PITCH_DEMO_PATIENT_ID];
  delete labHistory[PITCH_DEMO_PATIENT_ID_2];
  delete listadoProblemas[PITCH_DEMO_PATIENT_ID];
  delete medRecetaByPatient[PITCH_DEMO_PATIENT_ID];
  if (medNotaSelectionByPatient[PITCH_DEMO_PATIENT_ID]) {
    delete medNotaSelectionByPatient[PITCH_DEMO_PATIENT_ID];
  }
  delete recetaHuByPatient[PITCH_DEMO_PATIENT_ID];

  const agenda = storage.getScheduledProcedures().filter(function (ev) {
    return ev.patientId !== PITCH_DEMO_PATIENT_ID;
  });
  storage.saveScheduledProcedures(agenda);

  clearPitchDemoTodos();

  if (getActiveId() === PITCH_DEMO_PATIENT_ID || getActiveId() === PITCH_DEMO_PATIENT_ID_2) {
    setActiveId(patients.length ? patients[0].id : null);
  }
  saveState();
  renderPatientList();
}

/** Texto SOME con un cultivo de ejemplo (tests). */
export function getPitchCultivoParseText() {
  return PITCH_CULTIVO_LAB_SPECS[0].report;
}

export function reconcilePitchCultivoHistory(labHistoryMap) {
  const pid = PITCH_DEMO_PATIENT_ID;
  const list = Array.isArray(labHistoryMap[pid]) ? labHistoryMap[pid].slice() : [];
  const byId = Object.create(null);
  list.forEach(function (entry) {
    if (entry && entry.id) byId[entry.id] = entry;
  });
  PITCH_CULTIVO_LAB_SPECS.forEach(function (spec) {
    byId[spec.id] = buildPitchLabHistoryEntry(spec);
  });
  labHistoryMap[pid] = Object.keys(byId).map(function (id) {
    return byId[id];
  });
  bumpLabHistoryRevision(pid);
}

/** Labs de tendencia + cultivos multipaciente en historial (con sourceText para S/I/R). */
export function buildPitchLabHistoryEntries() {
  const trendSpecs = [
    { id: 'pitch-lab-trend-1', fecha: '01/05/2026', report: OLDER_DEMO_SOME_LAB_REPORT },
    { id: 'pitch-lab-trend-2', fecha: '04/05/2026', report: DEMO_SOME_LAB_REPORT },
    { id: 'pitch-lab-trend-3', fecha: '06/05/2026', report: OLDER_DEMO_SOME_LAB_REPORT },
    { id: 'pitch-lab-trend-4', fecha: '08/05/2026', report: DEMO_SOME_LAB_REPORT },
    { id: 'pitch-lab-trend-5', fecha: '10/05/2026', report: OLDER_DEMO_SOME_LAB_REPORT },
  ];
  const out = trendSpecs.map(buildPitchLabHistoryEntry);
  PITCH_CULTIVO_LAB_SPECS.forEach(function (spec) {
    out.push(buildPitchLabHistoryEntry(spec));
  });
  return out;
}
