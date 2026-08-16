import {
  DEMO_SOME_LAB_REPORT,
  DEMO_TOUR_LAB_PASTE,
  OLDER_DEMO_SOME_LAB_REPORT,
  buildTourDemoListadoProblemas,
  extractParsedValues
} from "/mobile/js/chunks/chunk-E2PTZLNF.js";
import {
  normalizeRecetaHuDraft
} from "/mobile/js/chunks/chunk-IXAK2IU3.js";
import {
  PITCH_DEMO_PATIENT_ID,
  PITCH_DEMO_PATIENT_ID_LEGACY,
  capturePitchSandbox,
  clearPitchPatientsBackup,
  clearPitchSandboxBackup,
  markPitchTourSessionActive,
  readPitchSandboxBackup,
  restorePitchPatientsBackup,
  setDemoPatients,
  setPitchPatientIsolation
} from "/mobile/js/chunks/chunk-6A62XDR6.js";
import {
  procesarLabs
} from "/mobile/js/chunks/chunk-CZ2M277B.js";
import {
  storage
} from "/mobile/js/chunks/chunk-5RUR3UQW.js";
import {
  bumpLabHistoryRevision
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";
import {
  getGlucometriaRegistroWindow
} from "/mobile/js/chunks/chunk-URXNXYS2.js";

// public/js/tour-pitch-demo-todos.mjs
var PITCH_DEMO_PATIENT_ID2 = "demo-pitch";
var TODOS_LS_KEY = "rpc-todos";
function readTodosMap() {
  try {
    const raw = localStorage.getItem(TODOS_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeTodosMap(map) {
  try {
    localStorage.setItem(TODOS_LS_KEY, JSON.stringify(map || {}));
  } catch {
  }
}
function todoEntry(id, text, priority, completed) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id,
    text,
    priority,
    completed: !!completed,
    createdAt: now,
    updatedAt: now
  };
}
function buildPitchDemoTodosForPatient(patientId) {
  if (patientId !== PITCH_DEMO_PATIENT_ID2) return [];
  return [
    todoEntry("pitch-todo-bh-qs", "BH y QS control ma\xF1ana (peritonitis / IRC)", "alta", false),
    todoEntry(
      "pitch-todo-atb",
      "Ajustar esquema ATB seg\xFAn antibiograma (Pseudomonas / E. coli)",
      "alta",
      false
    ),
    todoEntry(
      "pitch-todo-glu",
      "Repetir glucometr\xEDa si >180 mg/dL en pr\xF3ximo turno",
      "media",
      false
    ),
    todoEntry(
      "pitch-todo-infecto",
      "Interconsulta Infectolog\xEDa \u2014 documentar en nota",
      "media",
      false
    ),
    todoEntry("pitch-todo-io", "Balance h\xEDdrico estricto \u2014 registrar I/O en turno", "baja", false),
    todoEntry("pitch-todo-k-repo", "Reposici\xF3n K vo (valorar con QS)", "media", true)
  ];
}
function seedPitchDemoTodos() {
  const map = readTodosMap();
  map[PITCH_DEMO_PATIENT_ID2] = buildPitchDemoTodosForPatient(PITCH_DEMO_PATIENT_ID2);
  delete map["demo-pitch-2"];
  writeTodosMap(map);
}
function clearPitchDemoTodos() {
  const map = readTodosMap();
  let changed = false;
  for (const id of [PITCH_DEMO_PATIENT_ID2, "demo-pitch-2"]) {
    if (map[id]) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) writeTodosMap(map);
}

// public/js/tour-pitch-clear-maps.mjs
function deletePitchDemoPatientMaps(maps) {
  const {
    notes,
    indicaciones,
    labHistory,
    listadoProblemas,
    medRecetaByPatient,
    medNotaSelectionByPatient,
    recetaHuByPatient
  } = maps;
  delete notes[PITCH_DEMO_PATIENT_ID];
  delete notes[PITCH_DEMO_PATIENT_ID_LEGACY];
  delete indicaciones[PITCH_DEMO_PATIENT_ID];
  delete indicaciones[PITCH_DEMO_PATIENT_ID_LEGACY];
  delete labHistory[PITCH_DEMO_PATIENT_ID];
  delete labHistory[PITCH_DEMO_PATIENT_ID_LEGACY];
  delete listadoProblemas[PITCH_DEMO_PATIENT_ID];
  delete medRecetaByPatient[PITCH_DEMO_PATIENT_ID];
  if (medNotaSelectionByPatient[PITCH_DEMO_PATIENT_ID]) {
    delete medNotaSelectionByPatient[PITCH_DEMO_PATIENT_ID];
  }
  delete recetaHuByPatient[PITCH_DEMO_PATIENT_ID];
}

// public/js/tour-pitch-restore.mjs
function resolvePitchDemoRestorePatients(state) {
  const { patients, setPatients } = state;
  let restoredPatients = restorePitchPatientsBackup();
  if (!restoredPatients || !restoredPatients.length) {
    const sandbox2 = readPitchSandboxBackup();
    if (sandbox2 && Array.isArray(sandbox2.patients) && sandbox2.patients.length) {
      restoredPatients = sandbox2.patients.slice();
    }
  }
  if (restoredPatients && restoredPatients.length) {
    setPatients(restoredPatients);
    return restoredPatients;
  }
  const filtered = patients.filter(function(p) {
    return p && p.id !== PITCH_DEMO_PATIENT_ID && p.id !== PITCH_DEMO_PATIENT_ID_LEGACY && !p.isDemo;
  });
  if (filtered.length) {
    setPatients(filtered);
    return filtered;
  }
  const sandbox = readPitchSandboxBackup();
  if (sandbox && Array.isArray(sandbox.patients) && sandbox.patients.length) {
    setPatients(sandbox.patients.slice());
    return sandbox.patients.slice();
  }
  setPatients(filtered);
  return filtered;
}

// public/js/tour-pitch-monitoreo.mjs
var DAY_MS = 24 * 60 * 60 * 1e3;
var PITCH_GLU_TURNS = [
  {
    hoursFromStart: 1,
    minute: 5,
    payload: {
      vitals: { tas: 126, tad: 76, fc: 90, fr: 19, temp: 36.9, sat: 95 },
      glucometrias: [
        { value: 138, time: "09:05" },
        { value: 142, time: "09:12" }
      ],
      io: { ing: 200, egr: 140 }
    }
  },
  {
    hoursFromStart: 4,
    minute: 10,
    payload: {
      vitals: { tas: 120, tad: 70, fc: 86, fr: 18, temp: 36.7, sat: 96 },
      glucometrias: [{ value: 152, time: "12:10" }],
      io: { ing: 240, egr: 170 }
    }
  },
  {
    hoursFromStart: 8,
    minute: 15,
    payload: {
      vitals: { tas: 118, tad: 72, fc: 84, fr: 18, temp: 36.6, sat: 96 },
      glucometrias: [
        { value: 176, time: "16:15" },
        { value: 168, time: "16:22" }
      ],
      io: { ing: 300, egr: 220 }
    }
  },
  {
    hoursFromStart: 12,
    minute: 20,
    payload: {
      vitals: { tas: 116, tad: 74, fc: 84, fr: 17, temp: 36.5, sat: 97 },
      glucometrias: [{ value: 188, time: "20:20" }],
      io: { ing: 120, egr: 100 }
    }
  },
  {
    hoursFromStart: 15,
    minute: 45,
    payload: {
      vitals: { tas: 124, tad: 76, fc: 90, fr: 19, temp: 37, sat: 95 },
      glucometrias: [
        { value: 198, time: "23:45" },
        { value: 192, time: "23:52" }
      ],
      io: { ing: 150, egr: 130 }
    }
  }
];
var PITCH_VITALS_TREND_SLOTS = [
  {
    dayOff: 0,
    hour: 10,
    minute: 0,
    payload: {
      vitals: { tas: 118, tad: 72, fc: 88, fr: 18, temp: 36.8, sat: 96 },
      io: { ing: 220, egr: 150 }
    }
  },
  {
    dayOff: 0,
    hour: 18,
    minute: 0,
    payload: {
      vitals: { tas: 120, tad: 70, fc: 84, fr: 17, temp: 36.6, sat: 97 },
      io: { ing: 200, egr: 160 }
    }
  },
  {
    dayOff: 1,
    hour: 6,
    minute: 30,
    payload: {
      vitals: { tas: 128, tad: 78, fc: 92, fr: 20, temp: 37, sat: 94 },
      io: { ing: 200, egr: 140 }
    }
  },
  {
    dayOff: 1,
    hour: 14,
    minute: 30,
    payload: {
      vitals: { tas: 120, tad: 70, fc: 86, fr: 18, temp: 36.7, sat: 96 },
      io: { ing: 300, egr: 220 }
    }
  },
  {
    dayOff: 2,
    hour: 7,
    minute: 0,
    payload: {
      vitals: { tas: 132, tad: 80, fc: 94, fr: 21, temp: 37.2, sat: 93 },
      io: { ing: 190, egr: 130 }
    }
  },
  {
    dayOff: 2,
    hour: 11,
    minute: 0,
    payload: {
      vitals: { tas: 130, tad: 78, fc: 92, fr: 20, temp: 37, sat: 94 },
      io: { ing: 210, egr: 150 }
    }
  },
  {
    dayOff: 2,
    hour: 15,
    minute: 0,
    payload: {
      vitals: { tas: 126, tad: 76, fc: 88, fr: 19, temp: 36.9, sat: 95 },
      io: { ing: 250, egr: 180 }
    }
  },
  {
    dayOff: 2,
    hour: 19,
    minute: 0,
    payload: {
      vitals: { tas: 128, tad: 78, fc: 90, fr: 20, temp: 37, sat: 94 },
      io: { ing: 160, egr: 120 }
    }
  }
];
function createMonitoreoHistorialCollector(now) {
  const historial = [];
  function pushEntry(d, payload) {
    historial.push({
      id: "pitch-ea-" + historial.length,
      recordedAt: d.toISOString(),
      vitals: payload.vitals || {},
      glucometrias: payload.glucometrias || [],
      io: payload.io || {}
    });
  }
  function atDayOffset(dayOff, hour, minute, payload) {
    const d = new Date(now.getTime() - dayOff * DAY_MS);
    d.setHours(hour, minute, 0, 0);
    pushEntry(d, payload);
  }
  return { historial, pushEntry, atDayOffset };
}
function seedPitchGlucometriaHistorial(win, pushEntry) {
  for (let i = 0; i < PITCH_GLU_TURNS.length; i++) {
    const turn = PITCH_GLU_TURNS[i];
    const d = new Date(win.start.getTime() + turn.hoursFromStart * 60 * 60 * 1e3);
    d.setMinutes(turn.minute, 0, 0);
    if (d.getTime() > win.end.getTime()) continue;
    pushEntry(d, turn.payload);
  }
  pushEntry(new Date(win.end.getTime()), {
    vitals: { tas: 118, tad: 72, fc: 88, fr: 18, temp: 36.8, sat: 96 },
    glucometrias: [{ value: 155, time: "00:00" }],
    io: { ing: 180, egr: 120 }
  });
}
function seedPitchVitalsTrendHistorial(atDayOffset) {
  for (let i = 0; i < PITCH_VITALS_TREND_SLOTS.length; i++) {
    const slot = PITCH_VITALS_TREND_SLOTS[i];
    atDayOffset(slot.dayOff, slot.hour, slot.minute, slot.payload);
  }
}
function buildPitchMonitoreoClinicalShell(now) {
  return {
    estadoClinico: {
      four: "4",
      esferas: "3",
      analgesia: "Paracetamol 1 g IV c/8h",
      abx: "Cefepime 1 g IV c/8h (d\xEDa 2)",
      antihta: "Losart\xE1n 50 mg VO",
      vasop: "No",
      soporte: "O2 nasal 2 L/min",
      tempContext: "Afebril en turno",
      dieta: "Dieta renal",
      kcalKg: "25",
      kcal: "1750",
      pesoRef: "70"
    },
    confirmado: { analgesia: true, abx: true, antihta: false, vasop: false },
    pendienteReceta: {
      four: "",
      esferas: "",
      analgesia: "",
      abx: "",
      antihta: "",
      vasop: "",
      soporte: "",
      tempContext: "",
      dieta: "",
      kcalKg: "",
      kcal: "",
      pesoRef: ""
    },
    textoGuardado: {
      text: "Glucometr\xEDas seriadas c/6h: 128\u2013198 mg/dL en 48 h (ver gr\xE1fica y tabla en Estado Actual). Balance h\xEDdrico estricto; correlacionar con QS.",
      savedAt: now.toISOString()
    }
  };
}
function buildPitchMonitoreoHistorial(ref) {
  const now = ref instanceof Date ? ref : /* @__PURE__ */ new Date();
  const { historial, pushEntry, atDayOffset } = createMonitoreoHistorialCollector(now);
  const win = getGlucometriaRegistroWindow(now);
  seedPitchGlucometriaHistorial(win, pushEntry);
  seedPitchVitalsTrendHistorial(atDayOffset);
  return {
    ...buildPitchMonitoreoClinicalShell(now),
    historial
  };
}

// public/js/tour-pitch-cultivos-some.mjs
var PITCH_HEADER = "Expediente:	0008421-7	Solicitud:	2605000001\nNombre:	DEMO P\xC9REZ JUAN	Fecha Registro:	11/04/2026 08:00:00 a. m.\nSexo:	MASCULINO	Ubicaci\xF3n:	SERVICIO DEMO\nEdad:	67	Medico:	SERVICIO DEMO\n";
function hdr(fecha, solicitud) {
  return "Expediente:	0008421-7	Solicitud:	" + solicitud + "\nNombre:	DEMO P\xC9REZ JUAN	Fecha Registro:	" + fecha + "\nSexo:	MASCULINO	Ubicaci\xF3n:	SERVICIO DEMO\nEdad:	67	Medico:	SERVICIO DEMO\n";
}
var PITCH_CULTIVO_PERITONEAL_SOME = hdr("07/05/2026 02:04:18 p. m.", "2605071010") + "\nBACTERIOLOGIA\nLIQUIDO PERITONEAL\nPRODUCTO\n*\nEN FRASCO DE HEMOCULTIVO ANAEROBIO\nMICROORGANISMO\n*\nPseudomonas aeruginosa\nCUENTA\n*\n120,000 UFC/mL\nANTIBIOGRAMA\n*\nCEFTAZIDIMA\n>16	R\nCIPROFLOXACINA\n<=1	S\nCEFEPIMA\n>16	R\nIMIPENEM\n2	S\nLEVOFLOXACINA\n<=2	S\nMEROPENEM\n<=1	S\nPIP/TAZO\n>64	R\nTOBRAMICINA\n<=4	S\n";
var PITCH_CULTIVO_URO_SOME = hdr("05/05/2026 06:16:18 p. m.", "2605050805") + "\nBACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\n*\nMICROORGANISMO\n*\nPseudomonas aeruginosa\nCOMENTARIO:\n*\nSE DETECTO CARBAPENEMASA. (METODO DE INACTIVACION DE DISCO)\nCUENTA DE KASS\n*\n50,000 UFC/mL\nANTIBIOGRAMA\n*\nAMIKACINA\n>32	R\nAZTREONAM\n>16	R\nCEFTAZIDIMA\n>16	R\nCIPROFLOXACINA\n>2	R\nCEFEPIMA\n>16	R\nCEFTAZIDIMA/AVIBACTAM\n>16	R\nIMIPENEM\n>4	R\nLEVOFLOXACINA\n>4	R\nMEROPENEM\n>8	R\nPIP/TAZO\n<=16	S\nTOBRAMICINA\n>8	R\n";
var PITCH_CULTIVO_ASPIRADO_1805_SOME = hdr("18/05/2026 04:58:48 p. m.", "2605181061") + "\nBACTERIOLOGIA\nASPIRADO TRAQUEAL\nPRODUCTO\n*\nTINCION DE GRAM\n*\nABUNDANTES COCOBACILOS GRAM NEGATIVO\nMICROORGANISMO\n*\nEscherichia coli\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n50,000 UFC/mL\nANTIBIOGRAMA\n*\nAMP/SULBACTAM\n>16/8	R\nAMIKACINA\n<=16	S\nAMPICILINA\n>16	R\nAZTREONAM\n>16	ESBL\nCEFTRIAXONA\n>32	ESBL\nCEFTAZIDIMA\n>16	ESBL\nCEFOTAXIMA\n>16	ESBL\nCEFOXITINA\n16	I\nCIPROFLOXACINA\n>2	R\nCEFEPIMA\n>16	R\nCEFTAZIDIMA/AVIBACTAM\n16	R\nERTAPENEM\n<=0.5	S\nGENTAMICINA\n>8	R\nIMIPENEM\n<=1	S\nLEVOFLOXACINA\n>4	R\nMEROPENEM\n<=1	S\nPIP/TAZO\n>64	R\nTRIMET/SULFA\n>2/38	R\nTETRACICLINA\n>8	R\nTOBRAMICINA\n>8	R\nMICROORGANISMO\n*\nAcinetobacter baumannii complex\nCUENTA\n*\n80,000 UFC/mL\nANTIBIOGRAMA\n*\nCOLISTINA\n<=2	I\nAMP/SULBACTAM\n>16/8	R\nAMIKACINA\n>32	R\nCEFTRIAXONA\n>32	R\nCEFTAZIDIMA\n>16	R\nCIPROFLOXACINA\n>2	R\nCEFEPIMA\n16	I\nGENTAMICINA\n>8	R\nIMIPENEM\n>4	R\nMEROPENEM\n>8	R\nTRIMET/SULFA\n>2/38	R\nTOBRAMICINA\n>8	R\n";
var PITCH_CULTIVO_ASPIRADO_2804_SOME = hdr("28/04/2026 01:45:42 p. m.", "2604280886") + "\nBACTERIOLOGIA\nASPIRADO TRAQUEAL\nPRODUCTO\n*\nMICROORGANISMO\n*\nEscherichia coli\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n100,000 UFC/mL\nANTIBIOGRAMA\n*\nAMP/SULBACTAM\n>16/8	R\nAMIKACINA\n<=16	S\nAMPICILINA\n>16	R\nCEFTRIAXONA\n>32	ESBL\nCEFOTAXIMA\n>16	ESBL\nCEFOXITINA\n<=8	S\nCIPROFLOXACINA\n>2	R\nCEFEPIMA\n>16	R\nCEFTAZIDIMA/AVIBACTAM\n<=8	S\nERTAPENEM\n<=0.5	S\nGENTAMICINA\n>8	R\nIMIPENEM\n<=1	S\nLEVOFLOXACINA\n>4	R\nMEROPENEM\n<=1	S\nPIP/TAZO\n64	I\nTRIMET/SULFA\n>2/38	R\nTETRACICLINA\n>8	R\nTOBRAMICINA\n>8	R\nMICROORGANISMO\n*\nStaphylococcus aureus\nCUENTA\n*\n20,000 UFC/mL\nANTIBIOGRAMA\n*\nCLINDAMICINA\n0.5	S\nSCREENING DE CEFOXITINA\n<=4	NEG\nERITROMICINA\n>4	R\nINDUCCION CLINDAMICINA\n<=4/0.5	NEG\nLINEZOLID\n<=2	S\nOXACILINA\n1	S\nPENICILINA\n>8	BLAC\nRIFAMPICINA\n<=1	S\nTRIMET/SULFA\n<=0.5/9.5	S\nTETRACICLINA\n>8	R\nVANCOMICINA\n1	S\nMICROORGANISMO\n*\nProteus mirabilis\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n100 UFC/mL\nANTIBIOGRAMA\n*\nAMP/SULBACTAM\n>16/8	R\nAMIKACINA\n<=16	S\nAMPICILINA\n>16	R\nCEFTRIAXONA\n>32	R\nCEFOTAXIMA\n>16	ESBL\nCEFOXITINA\n<=8	S\nCIPROFLOXACINA\n>2	R\nCEFEPIMA\n>16	R\nCEFTAZIDIMA/AVIBACTAM\n<=8	S\nERTAPENEM\n<=0.5	S\nGENTAMICINA\n<=4	S\nLEVOFLOXACINA\n>4	R\nMEROPENEM\n<=1	S\nPIP/TAZO\n<=16	S\nTRIMET/SULFA\n>2/38	R\nTETRACICLINA\n>8	R\nTOBRAMICINA\n>8	R\n";
var PITCH_CULTIVO_HEMO_SOME = PITCH_HEADER + "\nBACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\nPERIFERICO IZQUIERDO\nMICROORGANISMO\n*\nPseudomonas aeruginosa\nCOMENTARIO:\n*\nAISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)\nCUENTA\n*\n2 colonias\nANTIBIOGRAMA\n*\nCEFTAZIDIMA\n>16	R\nCEFEPIMA\n16	I\nCIPROFLOXACINA\n<=1	S\nMEROPENEM\n<=1	S\nPIP/TAZO\n64	S\n";
var PITCH_CULTIVO_LAB_SPECS = [
  { id: "pitch-lab-cult-at-1805", fecha: "18/05/2026", report: PITCH_CULTIVO_ASPIRADO_1805_SOME },
  { id: "pitch-lab-cult-peritonitis", fecha: "07/05/2026", report: PITCH_CULTIVO_PERITONEAL_SOME },
  { id: "pitch-lab-cult-uro", fecha: "05/05/2026", report: PITCH_CULTIVO_URO_SOME },
  { id: "pitch-lab-cult-at-2804", fecha: "28/04/2026", report: PITCH_CULTIVO_ASPIRADO_2804_SOME },
  { id: "pitch-lab-cult-hemo", fecha: "11/04/2026", report: PITCH_CULTIVO_HEMO_SOME }
];

// public/js/tour-pitch-labs.mjs
function buildPitchLabHistoryEntry(spec) {
  const resLabs = procesarLabs(spec.report).resLabs;
  return {
    id: spec.id,
    fecha: spec.fecha,
    hora: "",
    resLabs,
    parsed: extractParsedValues(resLabs),
    sourceText: spec.report
  };
}
function buildPitchLabHistoryEntries() {
  const trendSpecs = [
    { id: "pitch-lab-trend-1", fecha: "01/05/2026", report: OLDER_DEMO_SOME_LAB_REPORT },
    { id: "pitch-lab-trend-2", fecha: "04/05/2026", report: DEMO_SOME_LAB_REPORT },
    { id: "pitch-lab-trend-3", fecha: "06/05/2026", report: OLDER_DEMO_SOME_LAB_REPORT },
    { id: "pitch-lab-trend-4", fecha: "08/05/2026", report: DEMO_SOME_LAB_REPORT },
    { id: "pitch-lab-trend-5", fecha: "10/05/2026", report: OLDER_DEMO_SOME_LAB_REPORT }
  ];
  const out = trendSpecs.map(buildPitchLabHistoryEntry);
  PITCH_CULTIVO_LAB_SPECS.forEach(function(spec) {
    out.push(buildPitchLabHistoryEntry(spec));
  });
  return out;
}

// public/js/tour-pitch-seed-maps.mjs
function buildPitchDemoPatient(today) {
  return {
    id: PITCH_DEMO_PATIENT_ID,
    nombre: "DEMO P\xC9REZ",
    registro: "0008421-7",
    edad: "67 a\xF1os",
    sexo: "M",
    area: "SERVICIO DEMO",
    servicio: "SERVICIO DEMO",
    cuarto: "101",
    cama: "1",
    fromLab: false,
    isDemo: true,
    monitoreo: buildPitchMonitoreoHistorial(today)
  };
}
function fillPitchDemoClinicalMaps(maps, fecha, hora) {
  const { notes, indicaciones, labHistory, listadoProblemas } = maps;
  notes[PITCH_DEMO_PATIENT_ID] = {
    fecha,
    hora,
    interrogatorio: "",
    evolucion: "Paciente masculino de 67 a\xF1os con peritonitis asociada a di\xE1lisis peritoneal en manejo antibi\xF3tico. Hemodin\xE1micamente estable, afebril en el turno. Contin\xFAa monitoreo de glucometr\xEDas y balance h\xEDdrico.",
    estudios: "Cultivos con aislamientos documentados; ver pesta\xF1a Cultivos.",
    diagnosticos: [
      "Peritonitis asociada a di\xE1lisis peritoneal",
      "DM2 descompensada",
      "IRC estadio 3",
      "HAS"
    ],
    tratamiento: ["Cefepime 1 g IV c/8h", "Paracetamol 1 g IV c/8h"],
    ta: "118/72",
    fr: "18",
    fc: "88",
    temp: "36.8",
    peso: "70",
    medico: "Dr. Demo",
    profesor: ""
  };
  indicaciones[PITCH_DEMO_PATIENT_ID] = {
    fecha,
    hora,
    medicos: "Dr. Demo \xB7 SERVICIO DEMO",
    dieta: "Dieta renal, restricci\xF3n de K y P",
    cuidados: "Signos vitales c/8h, glucometr\xEDa c/6h, balance h\xEDdrico estricto",
    estudios: "Control de BH y QS ma\xF1ana",
    medicamentos: "1. Cefepime 1 g IV c/8h\n2. Paracetamol 1 g IV c/8h PRN dolor\n3. Losart\xE1n 50 mg VO c/24h",
    interconsultas: "Nefrolog\xEDa de seguimiento",
    otros: []
  };
  try {
    labHistory[PITCH_DEMO_PATIENT_ID] = buildPitchLabHistoryEntries();
    bumpLabHistoryRevision(PITCH_DEMO_PATIENT_ID);
  } catch {
    delete labHistory[PITCH_DEMO_PATIENT_ID];
  }
  listadoProblemas[PITCH_DEMO_PATIENT_ID] = buildTourDemoListadoProblemas(fecha, hora);
  fillPitchDemoMedMaps(maps, fecha);
}
function fillPitchDemoMedMaps(maps, fecha) {
  const { medRecetaByPatient, medNotaSelectionByPatient, recetaHuByPatient } = maps;
  medRecetaByPatient[PITCH_DEMO_PATIENT_ID] = {
    fechaActualizacion: fecha,
    items: [
      {
        id: "pitch-med-1",
        nombreRaw: "PARACETAMOL 1 G SOL INY (*)",
        viaRaw: "VIA INTRAVENOSA",
        dosisRaw: "1 G //",
        frecuenciaRaw: "CADA 8 HORAS",
        suspendido: false,
        diaTratamiento: null
      },
      {
        id: "pitch-med-2",
        nombreRaw: "CEFEPIME 1 G SOL INY (*)",
        viaRaw: "VIA INTRAVENOSA",
        dosisRaw: "1 G // *DIA# 2*",
        frecuenciaRaw: "CADA 8 HORAS",
        suspendido: false,
        diaTratamiento: 2
      }
    ]
  };
  medNotaSelectionByPatient[PITCH_DEMO_PATIENT_ID] = {
    "pitch-med-1": true,
    "pitch-med-2": true
  };
  recetaHuByPatient[PITCH_DEMO_PATIENT_ID] = normalizeRecetaHuDraft({
    fecha,
    meds: [
      { medicamento: "Cefepime", presentacion: "1 g IV", dosis: "1 g IV c/8h" },
      { medicamento: "Paracetamol", presentacion: "1 g IV", dosis: "1 g IV c/8h PRN" }
    ],
    labs: ["Biometr\xEDa hem\xE1tica", "Qu\xEDmica sangu\xEDnea", "Cultivos de control"],
    cuidados: "Signos vitales, glucometr\xEDa y balance h\xEDdrico",
    proximaCita: "Consulta de Nefrolog\xEDa en 2 semanas",
    proximaCitaFecha: fecha
  });
}

// public/js/tour-pitch-seed-data.mjs
function savePitchDemoAgenda(fecha) {
  const existingAgenda = storage.getScheduledProcedures().filter(function(ev) {
    return ev.patientId !== PITCH_DEMO_PATIENT_ID;
  });
  storage.saveScheduledProcedures(
    existingAgenda.concat([
      {
        id: "pitch-agenda-1",
        patientId: PITCH_DEMO_PATIENT_ID,
        procedure: "Cat\xE9ter peritoneal \u2014 revisi\xF3n",
        location: "Quir\xF3fano menor",
        date: fecha,
        time: "10:30",
        notes: "Demo pitch"
      },
      {
        id: "pitch-agenda-2",
        patientId: PITCH_DEMO_PATIENT_ID,
        procedure: "BH + QS control",
        location: "Laboratorio",
        date: fecha,
        time: "06:00",
        notes: "Demo pitch"
      }
    ])
  );
}
function applyPitchDemoClinicalSeed(state, today, fecha, hora) {
  const {
    notes,
    indicaciones,
    labHistory,
    listadoProblemas,
    medRecetaByPatient,
    medNotaSelectionByPatient,
    recetaHuByPatient,
    patients,
    setPatients,
    persistClinicalState,
    selectPatient,
    renderPatientList
  } = state;
  fillPitchDemoClinicalMaps(
    {
      notes,
      indicaciones,
      labHistory,
      listadoProblemas,
      medRecetaByPatient,
      medNotaSelectionByPatient,
      recetaHuByPatient
    },
    fecha,
    hora
  );
  savePitchDemoAgenda(fecha);
  capturePitchSandbox(patients);
  setPitchPatientIsolation(true);
  var demoPatient = buildPitchDemoPatient(today);
  setDemoPatients([demoPatient]);
  setPatients([demoPatient]);
  seedPitchDemoTodos();
  persistClinicalState();
  renderPatientList();
  selectPatient(PITCH_DEMO_PATIENT_ID);
}

// public/js/tour-pitch-seed-core.mjs
function seedPitchDemo(state) {
  const today = /* @__PURE__ */ new Date();
  const fecha = String(today.getDate()).padStart(2, "0") + "/" + String(today.getMonth() + 1).padStart(2, "0") + "/" + today.getFullYear();
  const hora = String(today.getHours()).padStart(2, "0") + ":" + String(today.getMinutes()).padStart(2, "0");
  applyPitchDemoClinicalSeed(state, today, fecha, hora);
  return { labPasteText: DEMO_TOUR_LAB_PASTE };
}
function clearPitchDemo(state) {
  const {
    notes,
    indicaciones,
    labHistory,
    listadoProblemas,
    medRecetaByPatient,
    medNotaSelectionByPatient,
    recetaHuByPatient,
    persistClinicalState,
    renderPatientList,
    getActiveId,
    setActiveId,
    patients
  } = state;
  setPitchPatientIsolation(false);
  setDemoPatients([]);
  resolvePitchDemoRestorePatients(state);
  clearPitchPatientsBackup();
  const sandbox = readPitchSandboxBackup();
  if (sandbox && Array.isArray(sandbox.scheduledProcedures)) {
    storage.saveScheduledProcedures(sandbox.scheduledProcedures);
  }
  clearPitchSandboxBackup();
  markPitchTourSessionActive(false);
  deletePitchDemoPatientMaps({
    notes,
    indicaciones,
    labHistory,
    listadoProblemas,
    medRecetaByPatient,
    medNotaSelectionByPatient,
    recetaHuByPatient
  });
  const agenda = storage.getScheduledProcedures().filter(function(ev) {
    return ev.patientId !== PITCH_DEMO_PATIENT_ID;
  });
  storage.saveScheduledProcedures(agenda);
  clearPitchDemoTodos();
  if (getActiveId() === PITCH_DEMO_PATIENT_ID || getActiveId() === PITCH_DEMO_PATIENT_ID_LEGACY) {
    setActiveId(patients.length ? patients[0].id : null);
  }
  persistClinicalState();
  renderPatientList();
}

export {
  seedPitchDemo,
  clearPitchDemo
};
//# sourceMappingURL=/js/chunks/chunk-2V2QEUUT.js.map
