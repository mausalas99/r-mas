import {
  normalizeTropTrendFields_,
  parseBhTrendValuesFromResLab,
  procesarLabs
} from "/mobile/js/chunks/chunk-N74FWNUD.js";
import {
  bumpLabHistoryRevision,
  tendEligibleSectionKey
} from "/mobile/js/chunks/chunk-LUBBZBEB.js";
import {
  getGlucometriaRegistroWindow
} from "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  storage
} from "/mobile/js/chunks/chunk-RU5G223P.js";

// public/js/tour-pitch-sandbox.mjs
var PITCH_DEMO_PATIENT_ID = "demo-pitch";
var PITCH_DEMO_PATIENT_ID_LEGACY = "demo-pitch-2";
var PITCH_SANDBOX_SS_KEY = "rpc-pitch-tour-sandbox-v1";
var PITCH_TOUR_ACTIVE_SS_KEY = "rpc-pitch-tour-active";
var pitchPatientsBackup = null;
function readPitchSandboxBackup() {
  try {
    const raw = sessionStorage.getItem(PITCH_SANDBOX_SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function writePitchSandboxBackup(data) {
  try {
    sessionStorage.setItem(PITCH_SANDBOX_SS_KEY, JSON.stringify(data));
  } catch {
  }
}
function clearPitchSandboxBackup() {
  try {
    sessionStorage.removeItem(PITCH_SANDBOX_SS_KEY);
  } catch {
  }
}
function markPitchTourSessionActive(active) {
  try {
    if (active) sessionStorage.setItem(PITCH_TOUR_ACTIVE_SS_KEY, "1");
    else sessionStorage.removeItem(PITCH_TOUR_ACTIVE_SS_KEY);
  } catch {
  }
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
    capturedAt: Date.now()
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
function clearPitchPatientsBackup() {
  pitchPatientsBackup = null;
}
function resolvePitchPersistPatients() {
  if (!pitchPatientIsolation) return void 0;
  const restored = restorePitchPatientsBackup();
  return restored && restored.length ? restored : void 0;
}
function tryRecoverPatientsFromPitchSandboxIfNeeded(state) {
  const { patients, setPatients, saveState } = state;
  const sandbox = readPitchSandboxBackup();
  if (!sandbox || !Array.isArray(sandbox.patients) || !sandbox.patients.length) return false;
  const onlyDemos = patients.length > 0 && patients.every(function(p) {
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
var pitchPatientIsolation = false;
function setPitchPatientIsolation(active) {
  pitchPatientIsolation = !!active;
}
function isPitchPatientIsolationActive() {
  return pitchPatientIsolation;
}
function isPitchDemoPatientId(patientId) {
  return patientId === PITCH_DEMO_PATIENT_ID || patientId === PITCH_DEMO_PATIENT_ID_LEGACY;
}
function filterPatientsForPitchTour(list) {
  if (!pitchPatientIsolation) return list;
  return (list || []).filter(function(p) {
    return p && p.id === PITCH_DEMO_PATIENT_ID;
  });
}

// public/js/tour-demo-some-lab.mjs
var DEMO_SOME_LAB_REPORT = "Expediente:	0008421-7	Solicitud:	2605110244\nNombre:	DEMO P\xC9REZ JUAN	Fecha Registro:	Apr 11 2026 9:42AM\nSexo:	MASCULINO	Ubicaci\xF3n:	SERVICIO DEMO\nEdad:	67	Medico:	SERVICIO DEMO\n\nHEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\nEstudio		Resultado	Unidades	Valor de Referencia\nRBC		4.71	M/uL	4.04 - 6.13\nHGB		*	11.85	g/dL	12.20 - 18.10\nHCT		*	38.4	%	37.7 - 53.7\nMCV		*	82	fL	80 - 97\nMCH		B	26.1	pg	27.0 - 31.2\nMCHC		*	32.0	g/dL	29.9 - 34.2\nRDW		*	13.2	%	11.6 - 14.8\nWBC		*	6.12	K/uL	4.00 - 11.00\nNEU		*	3.88	K/uL	2.00 - 6.90\nNEU%		*	63.4	%	37.0 - 80.0\nLYM		*	1.05	K/uL	0.60 - 3.40\nLYM%		*	17.2	%	10.0 - 50.0\nMONO		*	0.71	K/uL	0.000 - 0.900\nMONO%		*	11.6	%	0.00 - 12.00\nEOS		*	0.11	K/uL	0.000 - 0.700\nEOS%		*	1.8	%	0.00 - 7.00\nBASO		*	0.12	K/uL	0.000 - 0.200\nBASO%		*	2.0	%	0.00 - 2.50\nPLT		*	248	K/uL	142.00 - 424.00\nMPV		B	7.2	fL	7.4 - 10.4\n\nQUIMICA CLINICA\nCOMENTARIO DE MUESTRA\nEstudio		Resultado	Unidades	Valor de Referencia\nCOMENTARIO DE LA MUESTRA		*	\nGLUCOSA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nGLUCOSA EN SANGRE		*	94	mg/dL	60 - 100\nNITROGENO DE LA UREA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nNITROGENO DE LA UREA EN SANGRE		A	22	mg/dL	7 - 20\nCREATININA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nCREATININA EN SANGRE		A	1.35	mg/dL	0.6 - 1.4\nACIDO URICO EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nACIDO URICO EN SANGRE		A	7.4	mg/dL	4.8 - 8.7\nPROTEINAS TOTALES\nEstudio		Resultado	Unidades	Valor de Referencia\nPROTEINAS TOTALES		A	7.6	g/dL	6.1 - 7.9\nALBUMINA\nEstudio		Resultado	Unidades	Valor de Referencia\nALBUMINA		*	4.1	g/dL	3.2 - 5.5\nGLOBULINA SERICA\nEstudio		Resultado	Unidades	Valor de Referencia\nGLOBULINA SERICA		*	3.5	g/dL	\nRELACION A/G\nEstudio		Resultado	Unidades	Valor de Referencia\nRELACION A/G		*	1.17	\nAST(ASPARTATO AMINOTRANSFERASA)\nEstudio		Resultado	Unidades	Valor de Referencia\nAST(ASPARTATO AMINOTRANSFERASA)		*	19	UI/L	10 - 42\nALT ALANIN AMINO TRANSFERASA\nEstudio		Resultado	Unidades	Valor de Referencia\nALT ALANIN AMINO TRANSFERASA		*	14	UI/L	10 - 42\nALP FOSFATASA ALCALINA\nEstudio		Resultado	Unidades	Valor de Referencia\nALP FOSFATASA ALCALINA		A	118	UI/L	38 - 126\nBILIRRUBINA\nEstudio		Resultado	Unidades	Valor de Referencia\nBILIRRUBINA TOTAL		A	1.2	mg/dL	0.2 - 1.0\nBILIRRUBINA DIRECTA		A	0.5	mg/dL	0.0 - 0.2\nBILIRRUBINA INDIRECTA		A	0.7	mg/dL	0.2 - 0.8\nLDH DESHIDROGENASA LACTICA\nEstudio		Resultado	Unidades	Valor de Referencia\nLDH DESHIDROGENASA LACTICA		*	142	UI/L	91 - 180\nAMILASA SERICA\nEstudio		Resultado	Unidades	Valor de Referencia\nAMILASA		*	68	U/L	28 - 100\nCOLESTEROL\nEstudio		Resultado	Unidades	Valor de Referencia\nCOLESTEROL		B	142	mg/dL	130 - 200\nTRIGLICERIDOS\nEstudio		Resultado	Unidades	Valor de Referencia\nTRIGLICERIDOS		*	118	mg/dL	35 - 150\nCLORO\nEstudio		Resultado	Unidades	Valor de Referencia\nCLORO		*	102	mmol/L	101.0 - 110.0\nSODIO\nEstudio		Resultado	Unidades	Valor de Referencia\nSODIO		*	138	mmol/L	135.0 - 145.0\nPOTASIO\nEstudio		Resultado	Unidades	Valor de Referencia\nPOTASIO		*	3.9	mmol/L	3.6 - 5.0\nCALCIO\nEstudio		Resultado	Unidades	Valor de Referencia\nCALCIO EN SUERO		*	8.8	mg/dL	8.4 - 10.2\nFOSFORO EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nFOSFORO		*	3.8	mg/dL	2.5 - 4.6\n";
var OLDER_DEMO_SOME_LAB_REPORT = "Expediente:	0008421-7	Solicitud:	2603050188\nNombre:	DEMO P\xC9REZ JUAN	Fecha Registro:	Mar 05 2026 7:18AM\nSexo:	MASCULINO	Ubicaci\xF3n:	SERVICIO DEMO\nEdad:	67	Medico:	SERVICIO DEMO\n\nHEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\nEstudio		Resultado	Unidades	Valor de Referencia\nRBC		4.55	M/uL	4.04 - 6.13\nHGB		*	10.20	g/dL	12.20 - 18.10\nHCT		*	35.8	%	37.7 - 53.7\nMCV		*	81	fL	80 - 97\nWBC		*	5.40	K/uL	4.00 - 11.00\nPLT		*	198	K/uL	142.00 - 424.00\n\nQUIMICA CLINICA\nGLUCOSA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nGLUCOSA EN SANGRE		*	108	mg/dL	60 - 100\nNITROGENO DE LA UREA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nNITROGENO DE LA UREA EN SANGRE		A	28	mg/dL	7 - 20\nCREATININA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nCREATININA EN SANGRE		A	1.55	mg/dL	0.6 - 1.4\nCOLESTEROL\nEstudio		Resultado	Unidades	Valor de Referencia\nCOLESTEROL		B	155	mg/dL	130 - 200\nTRIGLICERIDOS\nEstudio		Resultado	Unidades	Valor de Referencia\nTRIGLICERIDOS		*	132	mg/dL	35 - 150\nSODIO\nEstudio		Resultado	Unidades	Valor de Referencia\nSODIO		B	134	mmol/L	135.0 - 145.0\nPOTASIO\nEstudio		Resultado	Unidades	Valor de Referencia\nPOTASIO		*	3.5	mmol/L	3.6 - 5.0\n";
var DEMO_GARCIA_LAB_REPORT = "Expediente:	0007755-3	Solicitud:	2605110312\nNombre:	DEMO GARC\xCDA ANA	Fecha Registro:	Apr 11 2026 11:05AM\nSexo:	FEMENINO	Ubicaci\xF3n:	SERVICIO DEMO\nEdad:	54	Medico:	SERVICIO DEMO\n\nHEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\nEstudio		Resultado	Unidades	Valor de Referencia\nHGB		*	10.40	g/dL	12.20 - 18.10\nHCT		*	33.1	%	37.7 - 53.7\nWBC		*	8.20	K/uL	4.00 - 11.00\nPLT		*	210	K/uL	142.00 - 424.00\nQUIMICA SANGUINEA\nGLUCOSA\nEstudio		Resultado	Unidades	Valor de Referencia\nGLUCOSA		*	142	mg/dL	70 - 110\nCREATININA EN SANGRE\nEstudio		Resultado	Unidades	Valor de Referencia\nCREATININA EN SANGRE		A	0.92	mg/dL	0.6 - 1.4\n";
var DEMO_TOUR_LAB_PASTE = DEMO_SOME_LAB_REPORT + "\n\n" + OLDER_DEMO_SOME_LAB_REPORT;

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

// public/js/listado-problemas-core.mjs
var SECCIONES = ["activos", "inactivos"];
function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function emptyListado(fecha, hora) {
  return {
    fecha: String(fecha || ""),
    hora: String(hora || ""),
    activos: [],
    inactivos: []
  };
}
function ensureSeccion(seccion) {
  if (!SECCIONES.includes(seccion)) {
    throw new Error("secci\xF3n inv\xE1lida: " + seccion);
  }
}
function addProblema(listado, seccion, datos) {
  ensureSeccion(seccion);
  const item = {
    id: nuevoId(),
    fecha: String(datos && datos.fecha || ""),
    descripcion: String(datos && datos.descripcion || "")
  };
  return Object.assign({}, listado, {
    [seccion]: (listado[seccion] || []).concat([item])
  });
}
function removeProblema(listado, seccion, id) {
  ensureSeccion(seccion);
  const arr = listado[seccion] || [];
  const filtered = arr.filter((p) => p.id !== id);
  if (filtered.length === arr.length) return listado;
  return Object.assign({}, listado, { [seccion]: filtered });
}

// public/js/tour-demo-listado-problemas.mjs
var TOUR_DEMO_PERITONITIS_BLOCK = "PERITONITIS ASOCIADA A DI\xC1LISIS PERITONEAL\nA) CL\xCDNICA: SOMNOLENCIA EXCESIVA DESDE 04/05/2026, N\xC1USEA DESDE 06/05/2026, V\xD3MITO (1 EPISODIO 06/05/2026), DOLOR ABDOMINAL LEVE 5/10 DESDE 06/05/2026, L\xCDQUIDO DE DI\xC1LISIS TURBIO CON FIBRINA DESDE 05/05/2026\nB) EXPLORACI\xD3N F\xCDSICA: ABDOMEN DISTENDIDO, DOLOR A LA PALPACI\xD3N SUPERFICIAL Y PROFUNDA DIFUSO CON PREDOMINIO EN HIPOGASTRIO Y FOSA IL\xCDACA DERECHA, SIGNO DE BLUMBERG POSITIVO, SITIO DE INSERCI\xD3N DE CAT\xC9TER SIN DATOS DE INFECCI\xD3N LOCAL\nC) PARACL\xCDNICA: L\xCDQUIDO PERITONEAL CON 4650 C\xC9LULAS, 94% POLIMORFONUCLEARES, GLUCOSA 300 MG/DL, LEUCOCITOSIS 18,000/UL, PCR 21 MG/L ELEVADA, CULTIVO PENDIENTE";
function buildTourDemoListadoProblemas(fecha, hora) {
  var l = emptyListado(fecha, hora);
  l = addProblema(l, "activos", {
    fecha: "06/05/2026",
    descripcion: TOUR_DEMO_PERITONITIS_BLOCK
  });
  l = addProblema(l, "activos", {
    fecha: "15/01/2024",
    descripcion: "DIABETES MELLITUS TIPO 2\nA) CL\xCDNICA: POLIURIA Y POLIDIPSIA DE 2 SEMANAS, GLUCOMETR\xCDAS CAPILARES 180\u2013220 MG/DL\nB) EXPLORACI\xD3N F\xCDSICA: PACIENTE ALERTA, MUCOSAS H\xDAMEDAS\nC) PARACL\xCDNICA: HBA1C 8.2%, GLUCOSA EN AYUNO 198 MG/DL"
  });
  l = addProblema(l, "inactivos", {
    fecha: "08/02/2026",
    descripcion: "NEUMON\xCDA ADQUIRIDA EN LA COMUNIDAD (RESUELTA)\nA) CUADRO FEBRIL Y TOS PRODUCTIVA HOSPITALIZADO EN FEBRERO/2026, ALTA CON MEJOR\xCDA CL\xCDNICA"
  });
  return l;
}

// public/js/receta-hu-core.mjs
var DEFAULT_RECETA_HU_CONSULT_SERVICES = [
  "Nefrolog\xEDa",
  "Oncolog\xEDa",
  "Cardiolog\xEDa",
  "Endocrinolog\xEDa",
  "Gastroenterolog\xEDa",
  "Neurolog\xEDa"
];
function normalizeRecetaHuConsultServices(list) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  const src = Array.isArray(list) && list.length ? list : DEFAULT_RECETA_HU_CONSULT_SERVICES;
  for (const item of src) {
    const s = String(item || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.length ? out : DEFAULT_RECETA_HU_CONSULT_SERVICES.slice();
}
function normalizeRecetaHuProximaCitaRow(row) {
  const src = row && typeof row === "object" ? row : {};
  const plazo = String(src.plazo != null ? src.plazo : "2 semanas").trim() || "2 semanas";
  const servicio = String(src.servicio != null ? src.servicio : "").trim();
  let texto = String(src.texto != null ? src.texto : "").trim();
  if (!texto && servicio) texto = buildProximaCitaText(plazo, servicio);
  return {
    plazo,
    servicio,
    texto,
    fecha: String(src.fecha != null ? src.fecha : "").trim()
  };
}
function migrateLegacyProximaCitas(src) {
  if (Array.isArray(src.proximasCitas) && src.proximasCitas.length) {
    return src.proximasCitas.map(normalizeRecetaHuProximaCitaRow).filter(function(row) {
      return row.texto || row.servicio || row.fecha;
    });
  }
  const legacyText = String(src.proximaCita != null ? src.proximaCita : "").trim();
  const legacyFecha = String(src.proximaCitaFecha != null ? src.proximaCitaFecha : "").trim();
  if (!legacyText && !legacyFecha) return [];
  return [
    normalizeRecetaHuProximaCitaRow({
      plazo: src.proximaPlazo,
      servicio: "",
      texto: legacyText,
      fecha: legacyFecha
    })
  ];
}
function formatProximasCitasForPdf(rows) {
  const items = (Array.isArray(rows) ? rows : []).map(normalizeRecetaHuProximaCitaRow).filter(function(row) {
    return row.texto || row.servicio || row.fecha;
  });
  const textLines = items.map(function(row) {
    return row.texto || buildProximaCitaText(row.plazo, row.servicio);
  }).filter(Boolean);
  const fechaLines = items.map(function(row) {
    return row.fecha;
  }).filter(Boolean);
  return {
    proximaCita: textLines.join("\n"),
    proximaCitaFecha: fechaLines.join("\n")
  };
}
function normalizeRecetaHuDraft(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const meds = Array.isArray(src.meds) ? src.meds : [];
  const labs = Array.isArray(src.labs) ? src.labs : [];
  return {
    fecha: String(src.fecha != null ? src.fecha : ""),
    meds: meds.map(function(row) {
      return {
        medicamento: String(row && row.medicamento != null ? row.medicamento : ""),
        presentacion: String(row && row.presentacion != null ? row.presentacion : ""),
        dosis: String(row && row.dosis != null ? row.dosis : "")
      };
    }).filter(function(row) {
      return row.medicamento.trim() || row.presentacion.trim() || row.dosis.trim();
    }),
    labs: labs.map(function(x) {
      return String(x || "");
    }),
    cuidados: String(src.cuidados != null ? src.cuidados : ""),
    proximasCitas: migrateLegacyProximaCitas(src),
    proximaPlazo: String(src.proximaPlazo != null ? src.proximaPlazo : "2 semanas")
  };
}
function formatRecetaHuFecha(d) {
  const dt = d instanceof Date ? d : /* @__PURE__ */ new Date();
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function buildProximaCitaText(plazo, servicio) {
  const p = String(plazo || "").trim() || "2 semanas";
  const s = String(servicio || "").trim();
  if (!s) return "";
  return "Acudir en " + p + " a consulta de " + s;
}
function buildRecetaHuGeneratePayload(args) {
  const patient = args && args.patient || {};
  const draft = normalizeRecetaHuDraft(args && args.draft);
  const fecha = draft.fecha || formatRecetaHuFecha(/* @__PURE__ */ new Date());
  const proximaPdf = formatProximasCitasForPdf(draft.proximasCitas);
  return {
    patient: {
      nombre: String(patient.nombre || ""),
      registro: String(patient.registro || ""),
      servicio: String(patient.servicio || "")
    },
    fecha,
    meds: draft.meds.filter(function(row) {
      return row.medicamento.trim() || row.presentacion.trim() || row.dosis.trim();
    }),
    labs: draft.labs.map(function(x) {
      return String(x || "").trim();
    }).filter(Boolean),
    cuidados: draft.cuidados,
    proximasCitas: draft.proximasCitas,
    proximaCita: proximaPdf.proximaCita,
    proximaCitaFecha: proximaPdf.proximaCitaFecha,
    doctorName: String(args && args.doctorName ? args.doctorName : ""),
    cedulaProfesional: String(args && args.cedulaProfesional ? args.cedulaProfesional : "")
  };
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

// public/js/features/diagrams-parse.mjs
function parsearSecciones(resLabs) {
  var secs = {};
  resLabs.forEach(function(linea) {
    var primera = linea.split("\n")[0].trim().replace("	", " ");
    var tokens = primera.split(" ");
    var key = tokens[0].replace(":", "");
    var vals = {};
    var i = 1;
    while (i < tokens.length) {
      var tok = tokens[i];
      if (!tok || tok === "-") {
        i++;
        continue;
      }
      var next = tokens[i + 1];
      if (next !== void 0 && !isNaN(parseFloat(next.replace("*", "")))) {
        vals[tok] = { val: next.replace("*", ""), ab: next.endsWith("*") };
        i += 2;
      } else {
        i++;
      }
    }
    secs[key] = vals;
  });
  return secs;
}
function g(secs, sec, key) {
  var s = secs[sec];
  if (!s) return null;
  var v = s[key];
  if (!v || v.val === "---") return null;
  return v;
}
function extractParsedValues(resLabs) {
  var secs = parsearSecciones(resLabs);
  function num(sec, key) {
    var v = g(secs, sec, key);
    return v ? parseFloat(v.val) : null;
  }
  return {
    Hb: num("BH", "Hb"),
    Hto: num("BH", "Hto"),
    Leu: num("BH", "Leu"),
    Plt: num("BH", "Plt"),
    Glu: num("QS", "Glu"),
    Cr: num("QS", "Cr"),
    eTFG: num("QS", "eTFG"),
    BUN: num("QS", "BUN"),
    PCR: num("QS", "PCR"),
    AU: num("QS", "AU"),
    TGL: num("QS", "TGL"),
    COL: num("QS", "COL"),
    Na: num("ESC", "Na"),
    K: num("ESC", "K"),
    Cl: num("ESC", "Cl"),
    HCO3: num("ESC", "HCO3"),
    Ca: num("ESC", "Ca"),
    AST: num("PFHs", "AST"),
    ALT: num("PFHs", "ALT"),
    FA: num("PFHs", "FA"),
    BT: num("PFHs", "BT")
  };
}
function buildParsedBySectionFromResLabs(resLabs, bhExtras) {
  var secs = parsearSecciones(resLabs || []);
  var out = {};
  Object.keys(secs).forEach(function(sec) {
    if (!tendEligibleSectionKey(sec)) return;
    var row = {};
    var tbl = secs[sec];
    Object.keys(tbl).forEach(function(k) {
      var cell = tbl[k];
      if (!cell || cell.val == null || cell.val === "---") return;
      var n = parseFloat(String(cell.val).replace(/\*/g, "").replace(",", "."));
      if (!isFinite(n)) return;
      row[k] = n;
    });
    if (Object.keys(row).length) {
      if (sec === "TROP") normalizeTropTrendFields_(row);
      out[sec] = row;
    }
  });
  (resLabs || []).forEach(function(entry) {
    var head = String(entry).split("\n")[0].trim();
    if (!/^BH/i.test(head) && !/^COAG/i.test(head)) return;
    var bhCells = parseBhTrendValuesFromResLab(entry);
    Object.keys(bhCells).forEach(function(k) {
      var cell = bhCells[k];
      if (!cell || cell.val == null || cell.val === "---") return;
      var n = parseFloat(String(cell.val).replace(/\*/g, "").replace(",", "."));
      if (!isFinite(n)) return;
      if (!out.BH) out.BH = {};
      if (out.BH[k] == null) out.BH[k] = n;
    });
  });
  if (bhExtras && typeof bhExtras === "object") {
    if (!out.BH) out.BH = {};
    Object.keys(bhExtras).forEach(function(k) {
      var n = parseFloat(String(bhExtras[k]).replace(/\*/g, "").replace(",", "."));
      if (isFinite(n) && out.BH[k] == null) out.BH[k] = n;
    });
  }
  return out;
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
    saveState,
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
  setPatients([buildPitchDemoPatient(today)]);
  seedPitchDemoTodos();
  saveState();
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
    saveState,
    renderPatientList,
    getActiveId,
    setActiveId,
    patients
  } = state;
  setPitchPatientIsolation(false);
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
  saveState();
  renderPatientList();
}

export {
  markPitchTourSessionActive,
  resolvePitchPersistPatients,
  tryRecoverPatientsFromPitchSandboxIfNeeded,
  setPitchPatientIsolation,
  isPitchPatientIsolationActive,
  filterPatientsForPitchTour,
  DEMO_SOME_LAB_REPORT,
  OLDER_DEMO_SOME_LAB_REPORT,
  DEMO_GARCIA_LAB_REPORT,
  emptyListado,
  addProblema,
  removeProblema,
  buildTourDemoListadoProblemas,
  normalizeRecetaHuConsultServices,
  normalizeRecetaHuDraft,
  formatRecetaHuFecha,
  buildProximaCitaText,
  buildRecetaHuGeneratePayload,
  parsearSecciones,
  extractParsedValues,
  buildParsedBySectionFromResLabs,
  seedPitchDemo,
  clearPitchDemo
};
//# sourceMappingURL=/js/chunks/chunk-WPXKJVD2.js.map
