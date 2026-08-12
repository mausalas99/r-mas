import {
  storage
} from "/mobile/js/chunks/chunk-ID2H6AJR.js";
import {
  bumpLabHistoryRevision,
  tendEligibleSectionKey
} from "/mobile/js/chunks/chunk-RHISJ2VG.js";
import {
  getGlucometriaRegistroWindow
} from "/mobile/js/chunks/chunk-URXNXYS2.js";

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

// public/js/labs-display.mjs
function normalizeGasometryInterpretationLine_(line) {
  var s = String(line == null ? "" : line);
  return /^Interpretación gasometría:/i.test(s.trim()) ? s.toUpperCase() : s;
}
function escTxt(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function renderToken(tok) {
  if (!tok) return tok;
  if (tok.endsWith("*")) {
    var inner = escTxt(tok.slice(0, -1));
    return '<strong class="lab-value-altered" title="Fuera de rango de referencia">' + inner + '</strong><span class="lab-value-star" aria-hidden="true">*</span>';
  }
  return escTxt(tok);
}
function formatLabSectionLabel(label, lineIndex) {
  var t = String(label || "").trim().replace(/:$/, "");
  if (/^Coag\.?$/i.test(t)) return "COAG";
  if (lineIndex === 0) return t;
  return t;
}
function isLabSectionLabel(label, lineIndex) {
  var t = String(label || "").trim().replace(/:$/, "");
  if (/^Coag\.?$/i.test(t) || /^COAG$/i.test(t)) return true;
  if (lineIndex !== 0) return false;
  return /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS|SEROL|GS|HECES|COAG|LIPASA|TROP|TIR|ENDO|CARD|FE|INFL|INM|META|NEF|NIVEL|TM|NUT|GI|TOX|HEPB|VIRAL|MICRO)$/i.test(
    t
  );
}
function isLabSectionHeaderHtml(html) {
  return /<span class="section-lbl">/.test(String(html || ""));
}
function renderEntry(text) {
  text = normalizeGasometryInterpretationLine_(text);
  return text.split("\n").map(function(line, li) {
    var tabIdx = line.indexOf("	");
    if (tabIdx >= 0) {
      var label = line.substring(0, tabIdx);
      var rest = line.substring(tabIdx + 1);
      var lh = isLabSectionLabel(label, li) ? '<span class="section-lbl">' + escTxt(formatLabSectionLabel(label, li)) + "</span>" : escTxt(label);
      var rh = rest.split(" ").map(function(tok) {
        if (!tok) return tok;
        if (tok === "-") return '<span class="text-gray-500">-</span>';
        return renderToken(tok);
      }).join(" ");
      return lh + "	" + rh;
    }
    return line.split(" ").map(function(tok, ti) {
      if (!tok) return tok;
      if (li === 0 && ti === 0) return '<span class="section-lbl">' + escTxt(tok) + "</span>";
      if (tok === "-") return '<span class="text-gray-500">-</span>';
      return renderToken(tok);
    }).join(" ");
  });
}

// public/js/labs-ego-parse-helpers.mjs
var EGO_SKIP_SEARCH = /^(N\/A|EstudioResultado|ESTUDIO|SEDIMENTO|QUIMICO|FISICO|MICROSCOPICO|URIANALISIS|EXAMEN GENERAL|OBSERVACIONES)/i;
var EGO_SKIP_LABEL = /^(N\/A|Estudio|Resultado|Unidades|Valor de Referencia|VALOR DE REF)/i;
var EGO_ABBREV = {
  NEGATIVO: "NEG",
  NEGATIVE: "NEG",
  POSITIVO: "POS",
  POSITIVE: "POS",
  AUSENTES: "AUS",
  AUSENTE: "AUS",
  ESCASAS: "ESC",
  ESCASO: "ESC",
  MODERADAS: "MOD",
  MODERADO: "MOD",
  ABUNDANTES: "ABD",
  ABUNDANTE: "ABD",
  AMARILLO: "AMAR",
  TURBIO: "TURB",
  CLARO: "CLARO"
};
var EGO_POS_NEG_TYPES = ["PROT", "GLU", "CET", "BILI", "NITR", "ESTLEU"];
var EGO_AUS_TYPES = ["BACT", "CELEP", "CLING", "CLINH", "LEVAD", "MOCO"];
function valorTrasEtiqueta(lineas, etiquetas) {
  for (var e = 0; e < etiquetas.length; e++) {
    var lbl = etiquetas[e].toUpperCase();
    for (var i = 0; i < lineas.length; i++) {
      if (lineas[i].toUpperCase() !== lbl) continue;
      for (var j = i + 1; j < Math.min(i + 10, lineas.length); j++) {
        var l = lineas[j].trim();
        if (!l || /^[ABHL]$/.test(l) || EGO_SKIP_LABEL.test(l) || /^[-–:/.]+$/.test(l)) continue;
        var mNum = l.match(/^(-?\d+[.,]?\d*)/);
        if (mNum) return mNum[1].replace(",", ".");
      }
    }
  }
  return null;
}
function esUnidadEGO_(l) {
  return /^(Hem\/uL|Leucocitos\/uL|E\.U\.\/dL|mOsm\/L|mg\/dL|mmol\/L|g\/dL|\/CAMPO|K\/uL|fL|pg|uL|U\/L|SEG\.?)$/i.test(l) || /^[a-zA-Z]+\/[a-zA-Z]+$/.test(l);
}
function tryParseEgoValue(l) {
  var mApr = l.match(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d+)/i);
  if (mApr) return mApr[1];
  if (esUnidadEGO_(l)) return null;
  if (/^\d[\d.,]*\s+[-–]\s+\d[\d.,]*$/.test(l)) return null;
  if (/^\d+[-–]\d+\//.test(l)) return null;
  if (/^\d+[-–]\d+$/.test(l)) return l;
  var mNum = l.match(/^(-?\d+[.,]?\d*)/);
  if (mNum) return mNum[1].replace(",", ".");
  if (l.length <= 30 && !/\d{4,}/.test(l) && !/VALOR DE REF/i.test(l)) return l.toUpperCase();
  return null;
}
function buscarValorEGO_(lineas, nombres) {
  for (var n = 0; n < nombres.length; n++) {
    for (var i = 0; i < lineas.length; i++) {
      if (lineas[i].toUpperCase() !== nombres[n].toUpperCase()) continue;
      for (var j = i + 1; j < Math.min(i + 8, lineas.length); j++) {
        var l = lineas[j].trim();
        if (!l || /^[ABHL]$/.test(l) || /^[:\-/.\s]+$/.test(l) || EGO_SKIP_SEARCH.test(l)) continue;
        var parsed = tryParseEgoValue(l);
        if (parsed != null) return parsed;
      }
    }
  }
  return "---";
}
function abreviarEGO_(val) {
  if (!val || val === "---") return "---";
  var v = val.toUpperCase().trim();
  return EGO_ABBREV[v] || v;
}
function marcarEGOPosNeg_(ab, tipo) {
  if (EGO_POS_NEG_TYPES.indexOf(tipo) !== -1) return ab !== "NEG" && ab !== "AUS" ? ab + "*" : ab;
  if (EGO_AUS_TYPES.indexOf(tipo) !== -1) return ab !== "AUS" ? ab + "*" : ab;
  return ab;
}
function marcarEGOThreshold_(ab, val, threshold) {
  var mR = val.match(/^(\d+)[-–](\d+)$/);
  if (mR) return parseInt(mR[1], 10) > threshold ? ab + "*" : ab;
  var vC = parseFloat(val);
  return !isNaN(vC) && vC > threshold ? ab + "*" : ab;
}
function marcarEGORange_(ab, val, low, high) {
  var v = parseFloat(val);
  return !isNaN(v) && (v < low || v > high) ? ab + "*" : ab;
}
function marcarEGO_(val, tipo) {
  if (!val || val === "---") return "---";
  var ab = abreviarEGO_(val);
  if (tipo === "SANG") {
    var vSang = parseFloat(val);
    if (!isNaN(vSang)) return vSang > 0 ? val + "*" : "NEG";
    return ab !== "NEG" && ab !== "AUS" ? ab + "*" : ab;
  }
  if (tipo === "UROBIL") {
    var vU = parseFloat(val);
    return !isNaN(vU) && vU > 1 ? ab + "*" : ab;
  }
  if (tipo === "PH") return marcarEGORange_(ab, val, 5.5, 6.5);
  if (tipo === "DENS") return marcarEGORange_(ab, val, 1.005, 1.025);
  if (tipo === "LEU") return marcarEGOThreshold_(ab, val, 5);
  if (tipo === "ERI") return marcarEGOThreshold_(ab, val, 2);
  return marcarEGOPosNeg_(ab, tipo);
}
var EGO_FIELD_DEFS = [
  { section: "fisico", key: "color", prefix: "", tipo: "COLOR" },
  { section: "fisico", key: "aspecto", prefix: "", tipo: "ASPECTO" },
  { section: "fisico", key: "ph", prefix: "pH ", tipo: "PH" },
  { section: "fisico", key: "dens", prefix: "D ", tipo: "DENS" },
  { section: "quimico", key: "prot", prefix: "Prot ", tipo: "PROT" },
  { section: "quimico", key: "glu", prefix: "Glu ", tipo: "GLU" },
  { section: "quimico", key: "cet", prefix: "Cet ", tipo: "CET" },
  { section: "quimico", key: "bilis", prefix: "Bili ", tipo: "BILI" },
  { section: "quimico", key: "sangre", prefix: "Sang ", tipo: "SANG" },
  { section: "quimico", key: "nitr", prefix: "Nitr ", tipo: "NITR" },
  { section: "quimico", key: "urobil", prefix: "Urobil ", tipo: "UROBIL" },
  { section: "quimico", key: "estLeu", prefix: "EstLeu ", tipo: "ESTLEU" },
  { section: "sedimento", key: "leu", prefix: "Leu ", tipo: "LEU" },
  { section: "sedimento", key: "eri", prefix: "Eri ", tipo: "ERI" },
  { section: "sedimento", key: "bact", prefix: "Bact ", tipo: "BACT", skipAus: true },
  { section: "sedimento", key: "celEpit", prefix: "CelEp ", tipo: "CELEP", skipAus: true },
  { section: "sedimento", key: "cilinG", prefix: "CilinG ", tipo: "CLING", skipAus: true },
  { section: "sedimento", key: "cilinH", prefix: "CilinH ", tipo: "CLINH", skipAus: true },
  { section: "sedimento", key: "levad", prefix: "Levad ", tipo: "LEVAD", skipAus: true },
  { section: "sedimento", key: "moco", prefix: "Moco ", tipo: "MOCO", skipAus: true }
];
var EGO_FIELD_LABELS = {
  color: ["COLOR"],
  aspecto: ["ASPECTO"],
  ph: ["PH"],
  dens: ["DENSIDAD", "GRAVEDAD ESPECIFICA"],
  prot: ["PROTEINAS", "PROTEINURIA"],
  glu: ["GLUCOSA"],
  cet: ["CETONAS", "CUERPOS CETONICOS"],
  bilis: ["BILIRRUBINAS", "BILIRRUBINA"],
  sangre: ["SANGRE"],
  nitr: ["NITRITOS"],
  urobil: ["UROBILINOGENO", "UROBILIN\xD3GENO"],
  estLeu: ["ESTERASA LEUCOCITARIA"],
  leu: ["LEUCOCITOS"],
  eri: ["ERITROCITOS", "HEMATIES"],
  bact: ["BACTERIAS"],
  celEpit: ["CELULAS EPITELIALES"],
  cilinG: ["CILINDROS GRANOLOSOS"],
  cilinH: ["CILINDROS HIALINOS"],
  levad: ["LEVADURAS"],
  moco: ["MOCO"]
};
function collectEgoFieldValues_(lineas) {
  var out = {};
  Object.keys(EGO_FIELD_LABELS).forEach(function(key) {
    out[key] = buscarValorEGO_(lineas, EGO_FIELD_LABELS[key]);
  });
  return out;
}
function buildEgoSections_(f, qOrina) {
  var sections = { fisico: [], quimico: [], sedimento: [] };
  EGO_FIELD_DEFS.forEach(function(def) {
    var val = f[def.key];
    if (val === "---") return;
    if (def.skipAus && abreviarEGO_(val) === "AUS") return;
    sections[def.section].push(def.prefix + marcarEGO_(val, def.tipo));
  });
  if (qOrina.na) sections.quimico.push("NaU " + qOrina.na);
  if (qOrina.k) sections.quimico.push("KU " + qOrina.k);
  if (qOrina.cl) sections.quimico.push("ClU " + qOrina.cl);
  if (qOrina.cr) sections.quimico.push("CrU " + qOrina.cr);
  return sections;
}

// public/js/labs-ego-parse.mjs
function extraerQuimicaOrinaParaEGO_(textoBruto) {
  var out = { na: null, k: null, cl: null, cr: null };
  if (!textoBruto) return out;
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return l.replace(/\*/g, "").trim();
  });
  out.k = valorTrasEtiqueta(lineas, ["POTASIO EN ORINA"]);
  out.na = valorTrasEtiqueta(lineas, ["SODIO EN ORINA"]);
  out.cr = valorTrasEtiqueta(lineas, ["CREATININA EN ORINA"]);
  var mCl = textoBruto.match(/CLORO\s+EN\s+ORINA\s*:?\s*(\d+[.,]?\d*)/i);
  if (mCl) out.cl = mCl[1].replace(",", ".");
  return out;
}
function egoBlockLineas_(textoBruto) {
  var tUp = textoBruto.toUpperCase();
  var pos = tUp.indexOf("EXAMEN GENERAL DE ORINA") !== -1 ? tUp.indexOf("EXAMEN GENERAL DE ORINA") : tUp.indexOf("ANALISIS DE ORINA") !== -1 ? tUp.indexOf("ANALISIS DE ORINA") : tUp.indexOf("URIANALISIS") !== -1 ? tUp.indexOf("URIANALISIS") : -1;
  if (pos === -1) return [];
  var fin = tUp.search(/BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA/);
  var bloque = fin !== -1 && fin > pos ? textoBruto.substring(pos, fin) : textoBruto.substring(pos);
  return bloque.split(/\r?\n/).map(function(l) {
    return l.replace(/\*/g, "").trim();
  });
}
function egoHasMinimalFields_(f) {
  return f.color !== "---" || f.aspecto !== "---" || f.ph !== "---" || f.leu !== "---" || f.eri !== "---";
}
function parseEGO_(textoBruto) {
  var qOrina = extraerQuimicaOrinaParaEGO_(textoBruto);
  var hasQO = !!(qOrina.na || qOrina.k || qOrina.cl || qOrina.cr);
  var lineas = egoBlockLineas_(textoBruto);
  if (!lineas.length && !hasQO) return "";
  var f = collectEgoFieldValues_(lineas);
  if (!hasQO && !egoHasMinimalFields_(f)) return "";
  var sections = buildEgoSections_(f, qOrina);
  if (!sections.fisico.length && !sections.quimico.length && !sections.sedimento.length) return "";
  var sub = ["EGO:"];
  if (sections.fisico.length) sub.push("  " + sections.fisico.join("  "));
  if (sections.quimico.length) sub.push("  " + sections.quimico.join("  "));
  if (sections.sedimento.length) sub.push("  " + sections.sedimento.join("  "));
  return sub.join("\n");
}

// public/js/labs-default-refs.mjs
var DEFAULT_LAB_REFS = {
  Hb: [12, 17.5],
  Hto: [36, 53],
  Leu: [4, 11],
  Plt: [150, 400],
  VCM: [80, 100],
  HCM: [27, 33],
  RBC: [4.2, 5.4],
  CHCM: [31.5, 34.5],
  RDW: [11.5, 14.5],
  MPV: [7.4, 10.4],
  Neu: [1.5, 8],
  Eos: [0, 0.6],
  Lin: [0.6, 3.4],
  Mono: [0, 0.9],
  Baso: [0, 0.2],
  NeuPct: [37, 80],
  LinPct: [10, 50],
  MonoPct: [0, 12],
  EosPct: [0, 7],
  BasoPct: [0, 2.5],
  Bandas: [0, 5],
  Mielo: [0, 1],
  Metamielo: [0, 1],
  Promielo: [0, 1],
  Blastos: [0, 1],
  Atipicos: [0, 5],
  Ret: [0.5, 2.5],
  TP: [11, 14],
  TTP: [25, 35],
  INR: [0.8, 1.2],
  Fib: [150, 400],
  DD: [0, 500],
  Glu: [70, 100],
  Cr: [0.5, 1.3],
  BUN: [7, 20],
  PCR: [0, 0.5],
  PCT: [0, 0.05],
  AU: [3.5, 7],
  TGL: [0, 150],
  COL: [0, 200],
  HDL: [40, 60],
  LDL: [0, 130],
  VLDL: [2, 40],
  IA: [0, 3.22],
  CTHDL: [0, 3.1],
  CPK: [30, 200],
  Na: [136, 145],
  K: [3.5, 5],
  Cl: [96, 106],
  HCO3: [22, 28],
  Ca: [8.5, 10.5],
  F: [2.5, 4.5],
  Mg: [1.6, 2.6],
  AST: [10, 40],
  ALT: [7, 56],
  FA: [44, 147],
  GGT: [0, 55],
  Prot: [6, 8.3],
  BT: [0.1, 1.2],
  Alb: [3.5, 5.2],
  BD: [0, 0.3],
  BI: [0.1, 1],
  LDH: [120, 250],
  Amil: [30, 110],
  Lip: [8, 57],
  TnI1: [0, 34],
  TnI2: [0, 34],
  TSH: [0.4, 4],
  T4L: [0.8, 1.8],
  HbA1c: [4, 5.6],
  NTproBNP: [0, 125],
  Fe: [50, 170],
  Ferr: [30, 400],
  CysC: [0.5, 1],
  Vanco: [10, 20],
  B12: [200, 900]
};
var DEFAULT_GASO_REFS = {
  pH: [7.35, 7.45],
  pCO2: [35, 45],
  pO2: [83, 100],
  Lactato: [0.5, 2.2],
  Na: [135, 148],
  K: [3.5, 5.3],
  GLU: [70, 110],
  Hto: [34, 50],
  Bica: [22, 28],
  iCa: [1.12, 1.32]
};
function isValidRangePair_(r) {
  return r && r.length === 2 && isFinite(r[0]) && isFinite(r[1]) && r[1] > r[0];
}
function collectPriorRefsFromHistory(history) {
  var out = /* @__PURE__ */ Object.create(null);
  if (!history || !history.length) return out;
  for (var i = 0; i < history.length; i++) {
    var refs = history[i] && history[i].refsBySection;
    if (!refs || typeof refs !== "object") continue;
    Object.keys(refs).forEach(function(sec) {
      var row = refs[sec];
      if (!row || typeof row !== "object") return;
      if (!out[sec]) out[sec] = /* @__PURE__ */ Object.create(null);
      Object.keys(row).forEach(function(k) {
        var r = row[k];
        if (isValidRangePair_(r)) out[sec][k] = [r[0], r[1]];
      });
    });
  }
  return out;
}
function mergeRefsMap_(base, overlay) {
  var out = /* @__PURE__ */ Object.create(null);
  if (base && typeof base === "object") {
    Object.keys(base).forEach(function(k) {
      if (isValidRangePair_(base[k])) out[k] = [base[k][0], base[k][1]];
    });
  }
  if (overlay && typeof overlay === "object") {
    Object.keys(overlay).forEach(function(k) {
      if (isValidRangePair_(overlay[k])) out[k] = [overlay[k][0], overlay[k][1]];
    });
  }
  return out;
}
function mergeRefsBySection_(reportRefs, priorBySec) {
  var out = /* @__PURE__ */ Object.create(null);
  var prior = priorBySec && typeof priorBySec === "object" ? priorBySec : null;
  var report = reportRefs && typeof reportRefs === "object" ? reportRefs : null;
  var keys = /* @__PURE__ */ Object.create(null);
  if (prior) Object.keys(prior).forEach(function(k) {
    keys[k] = true;
  });
  if (report) Object.keys(report).forEach(function(k) {
    keys[k] = true;
  });
  Object.keys(keys).forEach(function(sec) {
    var merged = mergeRefsMap_(prior && prior[sec], report && report[sec]);
    if (Object.keys(merged).length) out[sec] = merged;
  });
  return out;
}
function mergeGasRefs_(base, overlay) {
  return mergeRefsMap_(base, overlay);
}
function resolveLabFieldRange_(data, fieldKey, priorRefs, defaults) {
  if (data && isValidRangePair_([data.min, data.max])) return [data.min, data.max];
  var fromPrior = priorRefs && priorRefs[fieldKey];
  if (isValidRangePair_(fromPrior)) return [fromPrior[0], fromPrior[1]];
  var table = defaults || DEFAULT_LAB_REFS;
  var d = table[fieldKey];
  return isValidRangePair_(d) ? [d[0], d[1]] : null;
}

// public/js/labs-extract.mjs
function extraerConRango(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var idx = t.indexOf(nombre);
    if (idx === -1) continue;
    var start = idx + nombre.length;
    var sub = texto.substring(start, start + 220);
    var mValor = sub.match(/(-?\d+[.,]?\d*)/);
    if (!mValor) continue;
    var valorStr = mValor[1];
    var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
    if (!mRango) return { valor: valorStr, min: null, max: null };
    return {
      valor: valorStr,
      min: parseFloat(mRango[1].replace(",", ".")),
      max: parseFloat(mRango[2].replace(",", "."))
    };
  }
  return { valor: "---", min: null, max: null };
}
function esContextoUrinario_(texto, idxNombre, nombreLen) {
  var after = texto.substring(idxNombre + nombreLen, idxNombre + nombreLen + 48).toUpperCase();
  if (/^\s*(EN\s+ORINA|URINARIO|URINARIA)\b/.test(after)) return true;
  return false;
}
function esFraccionColesterol_(texto, idxNombre, nombreLen) {
  var after = texto.substring(idxNombre + nombreLen, idxNombre + nombreLen + 16).toUpperCase();
  return /^\s*(HDL|LDL)\b/.test(after);
}
function esContextoSedimentoOrina_(texto, idxNombre, nombreLen) {
  var w = texto.substring(idxNombre, Math.min(texto.length, idxNombre + nombreLen + 120));
  if (/\/CAMPO\b/i.test(w)) return true;
  if (/Leucocitos\/uL|Hem\/uL|E\.U\.\/dL/i.test(w)) return true;
  var head = texto.substring(Math.max(0, idxNombre - 4500), idxNombre).toUpperCase();
  if (!/URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA/.test(head)) return false;
  var lastOrina = Math.max(
    head.lastIndexOf("URIANALISIS"),
    head.lastIndexOf("EXAMEN GENERAL DE ORINA"),
    head.lastIndexOf("ANALISIS DE ORINA")
  );
  if (lastOrina === -1) return true;
  var after = head.substring(lastOrina);
  return !/BIOMETRIA\s+HEMATICA|\bHGB\b|\bWBC\b|\bRBC\s+\d|\bPLT\s+\d/i.test(after);
}
function extraerConRangoBH(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      if (esContextoSedimentoOrina_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      var subStart = idx + nombre.length;
      var sub = texto.substring(subStart, subStart + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (!mRango) return { valor: valorStr, min: null, max: null };
      return {
        valor: valorStr,
        min: parseFloat(mRango[1].replace(",", ".")),
        max: parseFloat(mRango[2].replace(",", "."))
      };
    }
  }
  return { valor: "---", min: null, max: null };
}
function extraerConRangoSuero(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      if (esContextoUrinario_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      if (nombre === "COLESTEROL" && esFraccionColesterol_(texto, idx, nombre.length)) {
        start = idx + nombre.length;
        continue;
      }
      var subStart = idx + nombre.length;
      var sub = texto.substring(subStart, subStart + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (!mRango) return { valor: valorStr, min: null, max: null };
      return {
        valor: valorStr,
        min: parseFloat(mRango[1].replace(",", ".")),
        max: parseFloat(mRango[2].replace(",", "."))
      };
    }
  }
  return { valor: "---", min: null, max: null };
}
function extraerIndiceAterogenico_(texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  var nombres = ["INDICE ATEROGENICO", "\xCDNDICE ATEROG\xC9NICO", "INDICE ATEROG\xC9NICO"];
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      var sub = texto.substring(idx + nombre.length, idx + nombre.length + 220);
      var mValor = sub.match(/(-?\d+[.,]?\d*)/);
      if (!mValor) {
        start = idx + nombre.length;
        continue;
      }
      var valorStr = mValor[1];
      var mRiesgo = sub.match(/(\d+[.,]?\d*)\s*RIESGO/);
      if (mRiesgo) {
        return {
          valor: valorStr,
          min: 0,
          max: parseFloat(mRiesgo[1].replace(",", "."))
        };
      }
      var mRango = sub.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
      if (mRango) {
        return {
          valor: valorStr,
          min: parseFloat(mRango[1].replace(",", ".")),
          max: parseFloat(mRango[2].replace(",", "."))
        };
      }
      return { valor: valorStr, min: null, max: null };
    }
  }
  return { valor: "---", min: null, max: null };
}
var COAG_ROW_BOUNDARIES_ = [
  "TIEMPO DE PROTROMBINA",
  "TIEMPO DE TROMBOPLASTINA",
  "INR",
  "FIBRINOGENO",
  "FIBRIN\xD3GENO",
  "DIMERO D",
  "D-DIMERO",
  "D DIMERO",
  "TESTIGO",
  "OBSERVACIONES",
  "FROTIS",
  "DIFERENCIAL",
  "BIOMETRIA"
];
function isCoagPanelTitleAfter_(tUpper, idx, nombreLen) {
  var after = tUpper.substring(idx + nombreLen, idx + nombreLen + 24);
  return /^\s*Y\s+TROMBO/.test(after);
}
function findCoagBoundaryPos_(tUpper, fromIdx, bound) {
  if (bound !== "INR") return tUpper.indexOf(bound, fromIdx);
  var slice = tUpper.substring(fromIdx);
  var re = /(?:^|[^A-Z0-9])INR(?![A-Z0-9])/g;
  var m = re.exec(slice);
  if (!m) return -1;
  var at = m[0].indexOf("INR");
  return fromIdx + m.index + at;
}
function coagWindowEnd_(tUpper, fromIdx, nombre) {
  var end = Math.min(tUpper.length, fromIdx + 220);
  var nombreU = String(nombre || "").toUpperCase();
  for (var i = 0; i < COAG_ROW_BOUNDARIES_.length; i++) {
    var bound = COAG_ROW_BOUNDARIES_[i];
    if (bound === nombreU) continue;
    var pos = findCoagBoundaryPos_(tUpper, fromIdx, bound);
    if (pos > fromIdx && pos < end) end = pos;
  }
  return end;
}
function parseCoagValorRango_(sub) {
  if (!sub) return null;
  var clean = String(sub).replace(/TESTIGO[\s\S]*$/i, " ");
  clean = clean.replace(/\b(?:Campo|Labo)\s*-?\d+/gi, " ");
  var mRango = clean.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
  var min = mRango ? parseFloat(mRango[1].replace(",", ".")) : null;
  var max = mRango ? parseFloat(mRango[2].replace(",", ".")) : null;
  var rangoIdx = mRango ? clean.search(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/) : -1;
  var beforeRango = rangoIdx >= 0 ? clean.substring(0, rangoIdx) : clean;
  var mValor = beforeRango.match(/(-?\d+[.,]?\d*)/);
  if (!mValor) return null;
  return { valor: mValor[1], min, max };
}
function isFibrinogenoNombre_(nombre) {
  return /^FIBRIN[OÓ]GENO$/.test(String(nombre || ""));
}
function isUefFibrinogenoMatch_(tUpper, idx) {
  var before = tUpper.substring(Math.max(0, idx - 48), idx);
  if (/\bUEF\b/.test(before)) return true;
  return /EQUIVALENTES\s+DE\s*$/i.test(before.trimEnd());
}
function shouldSkipCoagMatch_(tUpper, nombre, idx) {
  if (nombre === "TIEMPO DE PROTROMBINA" && isCoagPanelTitleAfter_(tUpper, idx, nombre.length)) {
    return true;
  }
  if (isFibrinogenoNombre_(nombre) && isUefFibrinogenoMatch_(tUpper, idx)) {
    return true;
  }
  if (nombre !== "INR") return false;
  var before = tUpper.charAt(idx - 1) || " ";
  var afterCh = tUpper.charAt(idx + 3) || " ";
  return /[A-Z0-9]/.test(before) || /[A-Z0-9]/.test(afterCh);
}
function isImplausibleInr_(valorStr, maxInr) {
  var inrN = parseFloat(String(valorStr || "").replace(",", "."));
  return isFinite(inrN) && inrN > maxInr;
}
function isImplausibleFib_(valorStr) {
  var fibN = parseFloat(String(valorStr || "").replace(",", "."));
  return !isFinite(fibN) || fibN < 10 || fibN > 2e3;
}
function tryParseCoagAt_(texto, tUpper, nombre, idx, maxInr) {
  if (shouldSkipCoagMatch_(tUpper, nombre, idx)) return null;
  var subStart = idx + nombre.length;
  var parsed = parseCoagValorRango_(texto.substring(subStart, coagWindowEnd_(tUpper, subStart, nombre)));
  if (!parsed) return null;
  if (nombre === "INR" && isImplausibleInr_(parsed.valor, maxInr)) return null;
  if (isFibrinogenoNombre_(nombre) && isImplausibleFib_(parsed.valor)) return null;
  return parsed;
}
function extraerConRangoCoag(nombres, texto, opts) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  var maxInr = opts && typeof opts.maxInr === "number" ? opts.maxInr : 8;
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var start = 0;
    while (true) {
      var idx = t.indexOf(nombre, start);
      if (idx === -1) break;
      var parsed = tryParseCoagAt_(texto, t, nombre, idx, maxInr);
      if (parsed) return parsed;
      start = idx + nombre.length;
    }
  }
  return { valor: "---", min: null, max: null };
}
function extraerConRangoPanel(nombres, texto) {
  if (!texto) return { valor: "---", min: null, max: null };
  var t = texto.toUpperCase();
  for (var i = 0; i < nombres.length; i++) {
    var nombre = nombres[i].toUpperCase();
    var idx = t.indexOf(nombre);
    if (idx === -1) continue;
    var sub = texto.substring(idx + nombre.length, idx + nombre.length + 260);
    var stripped = sub;
    var reName = new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    stripped = stripped.replace(reName, " ");
    var mValor = stripped.match(/(-?\d+[.,]?\d*)/);
    if (!mValor) continue;
    var valorStr = mValor[1];
    var mRango = stripped.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
    if (!mRango) return { valor: valorStr, min: null, max: null };
    return {
      valor: valorStr,
      min: parseFloat(mRango[1].replace(",", ".")),
      max: parseFloat(mRango[2].replace(",", "."))
    };
  }
  return { valor: "---", min: null, max: null };
}
function marcarSegunRango(valorStr, min, max) {
  if (valorStr === "---" || valorStr == null) return valorStr;
  var v = parseFloat(String(valorStr).replace(",", "."));
  if (isNaN(v) || min == null || max == null) return valorStr;
  return v < min || v > max ? valorStr + "*" : valorStr;
}
function fmt(val) {
  if (!val || val === "---") return val;
  var star = val.endsWith("*");
  var n = parseFloat((star ? val.slice(0, -1) : val).replace(",", "."));
  if (isNaN(n)) return val;
  return String(n) + (star ? "*" : "");
}
function fmtLabRanged_(data, fieldKey, priorRefs, defaults) {
  if (!data || data.valor === "---" || data.valor == null) return data ? data.valor : "---";
  var range = resolveLabFieldRange_(data, fieldKey, priorRefs, defaults);
  if (!range) return fmt(data.valor);
  return fmt(marcarSegunRango(data.valor, range[0], range[1]));
}
function toNum_(v) {
  if (v === "---" || v == null) return null;
  var n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

// public/js/labs-anion-gap.mjs
function parseLabNum_(str) {
  if (str === "---" || str == null || str === "") return null;
  var n = parseFloat(String(str).replace(",", "."));
  return isNaN(n) ? null : n;
}
function formatAgToken_(ag) {
  if (ag == null || !isFinite(ag)) return "---";
  var rounded = Math.round((ag + Number.EPSILON) * 10) / 10;
  var agStr = rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
  return marcarSegunRango(agStr, 8, 12);
}
function formatPlainToken_(n) {
  if (n == null || !isFinite(n)) return "---";
  var rounded = Math.round((n + Number.EPSILON) * 10) / 10;
  return rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
}
function computeAnionGapValue_(naStr, clStr, hco3Str) {
  var na = parseLabNum_(naStr);
  var cl = parseLabNum_(clStr);
  var hco3 = parseLabNum_(hco3Str);
  if (na == null || cl == null || hco3 == null) return null;
  return na - (cl + hco3);
}
function computeAlbuminCorrectedAnionGapValue_(naStr, clStr, hco3Str, albStr) {
  var ag = computeAnionGapValue_(naStr, clStr, hco3Str);
  if (ag == null) return null;
  var alb = parseLabNum_(albStr);
  if (alb == null) return null;
  return ag + 2.5 * (4 - alb);
}
function computeUrinaryAnionGapValue_(naUStr, kUStr, clUStr) {
  var na = parseLabNum_(naUStr);
  var k = parseLabNum_(kUStr);
  var cl = parseLabNum_(clUStr);
  if (na == null || k == null || cl == null) return null;
  return na + k - cl;
}
function computeAnionGap_(naStr, clStr, hco3Str) {
  return formatAgToken_(computeAnionGapValue_(naStr, clStr, hco3Str));
}
function computeAlbuminCorrectedAnionGap_(naStr, clStr, hco3Str, albStr) {
  return formatAgToken_(computeAlbuminCorrectedAnionGapValue_(naStr, clStr, hco3Str, albStr));
}
function computeUrinaryAnionGap_(naUStr, kUStr, clUStr) {
  return formatPlainToken_(computeUrinaryAnionGapValue_(naUStr, kUStr, clUStr));
}
function extractUrineElectrolytes_(texto) {
  if (!texto) return { na: "---", k: "---", cl: "---" };
  var na = extraerConRango(["SODIO EN ORINA", "SODIO URINARIO"], texto);
  var k = extraerConRango(["POTASIO EN ORINA", "POTASIO URINARIO"], texto);
  var cl = extraerConRango(["CLORO EN ORINA", "CLORO URINARIO"], texto);
  return { na: na.valor, k: k.valor, cl: cl.valor };
}
function resolveEffectiveAnionGapValue_(naStr, clStr, hco3Str, albStr) {
  var agc = computeAlbuminCorrectedAnionGapValue_(naStr, clStr, hco3Str, albStr);
  if (agc != null) return agc;
  return computeAnionGapValue_(naStr, clStr, hco3Str);
}

// public/js/labs-fluid-interpret-values.mjs
function parseFluidLeu_(raw) {
  var c = String(raw || "").replace(/\*/g, "").trim();
  if (!c) return null;
  if (/^\d{1,3},\d{3}$/.test(c)) c = c.replace(",", "");
  else c = c.replace(",", ".");
  return toNum_(c);
}
function parsePmnField_(raw, leuNum) {
  var empty = { pmnNum: null, pmnPct: null, predominant: false };
  if (!raw) return empty;
  var s = String(raw).replace(/\*/g, "").trim().toUpperCase();
  if (/PREDOMIN/i.test(s)) return { pmnNum: null, pmnPct: null, predominant: true };
  var pctMatch = s.match(/^(\d+(?:[.,]\d+)?)\s*%?$/);
  if (!pctMatch) return empty;
  var n = toNum_(pctMatch[1]);
  if (n == null) return empty;
  if (/%/.test(s) || n <= 100 && leuNum != null) {
    return {
      pmnNum: leuNum != null ? Math.round(leuNum * n / 100) : null,
      pmnPct: n,
      predominant: n >= 50
    };
  }
  return { pmnNum: n, pmnPct: null, predominant: true };
}
function isGramNegative_(raw) {
  return /\bNEGAT/i.test(String(raw || ""));
}
function gramIsPositive_(raw) {
  var s = String(raw || "").trim();
  if (!s || isGramNegative_(s)) return false;
  return /\b(POSITIV|COCC|BACIL|POLIMORFONUCLE|ABUNDANT)/i.test(s);
}
function parseLcrProteinMgdl_(raw) {
  var s = String(raw || "").replace(/\*/g, "").trim();
  if (!s) return null;
  var m = s.match(/^(\d+(?:[.,]\d+)?)/);
  return m ? toNum_(m[1]) : null;
}

// public/js/labs-lcr-scan.mjs
function isLcrFieldLabel_(txt) {
  return /^(RECUENTO(?:\s+CELULAR)?|LEUCOCITOS(?:\s+POLIMORFONUCLEARES|\s*\/\s*MM3?)?|POLIMORFONUCLEARES|LINFOCITOS|%PMN|%LINFOCITOS|GLUCOSA|PROTEINAS|CLORURO|GRAM|TINTA(?:\s+CHINA)?|ERITROCITOS|COAGLUTIN(?:ACION)?|PH\b|ASPECTO|OTROS|LCR|ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA|COMENTARIOS?)$/i.test(
    txt
  );
}
function scanNumericAfter_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var raw = lineas[j].replace(/\*/g, "").trim();
    if (!raw) continue;
    if (isLcrFieldLabel_(raw)) break;
    var m = raw.match(/^(\d+(?:[.,]\d+)?)/);
    if (m) return m[1].replace(",", ".");
  }
  return "";
}
function scanTextAfter_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var txt = lineas[j].replace(/\*/g, "").trim();
    if (!txt) continue;
    if (/ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA/i.test(txt)) continue;
    if (isLcrFieldLabel_(txt)) break;
    if (/^\d+(?:[.,]\d+)?$/.test(txt)) break;
    if (/^---+$/.test(txt)) return "";
    return txt.toUpperCase();
  }
  return "";
}
function scanLeucocitos_(lineas, i) {
  for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
    var raw = lineas[j].replace(/\*/g, "").trim();
    if (!raw) continue;
    if (isLcrFieldLabel_(raw)) break;
    if (/^---+$/.test(raw)) return "0";
    var m = raw.match(/^(\d+(?:[.,]\d+)?)\s*$/);
    if (m) return m[1].replace(",", ".");
  }
  return "";
}
function scanProteinas_(lineas, i, lin) {
  var mL = lin.match(/PROTEINAS\s*([A-Z])\s*$/i);
  var letra = mL ? mL[1].toUpperCase() : "";
  var val = scanNumericAfter_(lineas, i, 4);
  return val ? val + letra : "";
}
function emptyLcrFields_() {
  return { pH: "", aspecto: "", leu: "", glu: "", prot: "", cl: "", gram: "", tinta: "" };
}
function scanLcrLine_(fields, lineas, i, linUp, lin) {
  if (linUp.indexOf("PH") === 0) fields.pH = scanNumericAfter_(lineas, i, 4);
  if (linUp.indexOf("ASPECTO") === 0) fields.aspecto = scanTextAfter_(lineas, i, 4);
  if (linUp.indexOf("RECUENTO CELULAR") === 0 || linUp.indexOf("LEUCOCITOS") === 0) {
    var leuVal = scanLeucocitos_(lineas, i);
    if (leuVal !== "") fields.leu = leuVal;
  }
  if (linUp.indexOf("GLUCOSA") === 0) fields.glu = scanNumericAfter_(lineas, i, 4);
  if (linUp.indexOf("PROTEINAS") === 0) fields.prot = scanProteinas_(lineas, i, lin);
  if (linUp.indexOf("CLORURO") === 0) fields.cl = scanNumericAfter_(lineas, i, 4);
  if (linUp.indexOf("GRAM") === 0) fields.gram = scanTextAfter_(lineas, i, 4);
  if (linUp.indexOf("TINTA CHINA") === 0) fields.tinta = scanTextAfter_(lineas, i, 4);
}
function isInvalidLcrTextField_(val) {
  if (val === "" || val == null) return true;
  var s = String(val).toUpperCase().trim();
  if (/^---+$/.test(s)) return true;
  return isLcrFieldLabel_(s);
}
function lcrFieldsEmpty_(fields) {
  return !(fields.aspecto || fields.leu !== "" || fields.glu || fields.prot || fields.cl || fields.gram || fields.tinta || fields.pH);
}
function buildLcrLine_(fields) {
  var p = ["LCR:"];
  if (fields.pH) p.push("pH", fields.pH);
  if (fields.aspecto) p.push("Asp", fields.aspecto);
  if (fields.leu !== "") p.push("Leu", fields.leu);
  if (fields.glu) p.push("Glu", fields.glu);
  if (fields.prot) p.push("Prot", fields.prot);
  if (fields.cl) p.push("Cl", fields.cl);
  if (fields.gram) p.push("Gram", fields.gram);
  if (fields.tinta) p.push("Tinta", fields.tinta);
  return p[0] + "	" + p.slice(1).join(" ");
}

// public/js/labs-lcr-parse.mjs
function collectLcrBlocks_(textoBruto) {
  var t = String(textoBruto || "");
  var blocks = [];
  var mChem = t.match(/CITOQUIMICO\s+DE\s+LCR[\s\S]*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i);
  if (mChem) blocks.push(mChem[0]);
  var mMicro = t.match(/CITOQUIMICO\s+LIQ\.?\s+LCR[\s\S]*?(?=CUADERNILLO|$)/i);
  if (mMicro) {
    var micro = mMicro[0];
    var dup = blocks.some(function(b) {
      return b === micro;
    });
    if (!dup) blocks.push(micro);
  }
  return blocks;
}
function lcrBlocksNormText_(textoBruto) {
  return collectLcrBlocks_(textoBruto).map(function(b) {
    return b.replace(/\r/g, "").replace(/\s+/g, " ");
  });
}
function parseLcrFieldsFromBlock_(bloque) {
  var lineas = bloque.split(/\r?\n/).map(function(l) {
    return l.trim();
  });
  var fields = emptyLcrFields_();
  for (var i = 0; i < lineas.length; i++) {
    scanLcrLine_(fields, lineas, i, lineas[i].toUpperCase(), lineas[i]);
  }
  return fields;
}
function mergeLcrScalar_(accVal, nextVal) {
  if (nextVal === "" || nextVal == null) return accVal;
  if (accVal === "" || accVal == null) return nextVal;
  return accVal;
}
function mergeLcrText_(accVal, nextVal) {
  if (nextVal === "" || nextVal == null) return accVal;
  if (accVal === "" || accVal == null || isInvalidLcrTextField_(accVal)) return nextVal;
  return accVal;
}
function mergeLcrLeu_(accVal, nextVal) {
  if (nextVal === "" || nextVal == null) return accVal;
  if (accVal === "" || accVal == null) return nextVal;
  return accVal;
}
function mergeLcrFields_(blocks) {
  var merged = emptyLcrFields_();
  for (var b = 0; b < blocks.length; b++) {
    var next = parseLcrFieldsFromBlock_(blocks[b]);
    merged.pH = mergeLcrScalar_(merged.pH, next.pH);
    merged.aspecto = mergeLcrText_(merged.aspecto, next.aspecto);
    merged.leu = mergeLcrLeu_(merged.leu, next.leu);
    merged.glu = mergeLcrScalar_(merged.glu, next.glu);
    merged.prot = mergeLcrScalar_(merged.prot, next.prot);
    merged.cl = mergeLcrScalar_(merged.cl, next.cl);
    merged.gram = mergeLcrText_(merged.gram, next.gram);
    merged.tinta = mergeLcrText_(merged.tinta, next.tinta);
  }
  return merged;
}
function fieldsToLcrParsed_(fields) {
  if (lcrFieldsEmpty_(fields)) return null;
  return {
    line: buildLcrLine_(fields),
    pH: toNum_(fields.pH),
    aspecto: fields.aspecto || "",
    leu: fields.leu === "" ? null : parseFluidLeu_(fields.leu),
    glu: toNum_(fields.glu),
    protMgdl: parseLcrProteinMgdl_(fields.prot),
    cl: toNum_(fields.cl),
    gram: fields.gram || "",
    tinta: fields.tinta || ""
  };
}
function parseLcrParsed(textoBruto) {
  var blocks = collectLcrBlocks_(textoBruto);
  if (!blocks.length) return null;
  return fieldsToLcrParsed_(mergeLcrFields_(blocks));
}
function parsearLCR(textoBruto) {
  var parsed = parseLcrParsed(textoBruto);
  return parsed && parsed.line ? parsed.line : "";
}

// public/js/labs-gaso-section.mjs
function gasoBlockForExtract_(bloqueGaso) {
  return String(bloqueGaso || "").replace(/\r/g, "").replace(/\s+/g, " ");
}
function extractGasoPh_(bloqueX) {
  var phData = extraerConRango(["PH "], bloqueX);
  if (phData.valor === "---") phData = extraerConRango(["PH"], bloqueX);
  return phData;
}
function fmtGasoRanged_(data, fieldKey, gasRefs) {
  return fmtLabRanged_(data, fieldKey, gasRefs, DEFAULT_GASO_REFS);
}
function extractGasoFormatted_(bloqueX, textoFuera, gasRefs) {
  var phData = extractGasoPh_(bloqueX);
  var hco3Data = extraerConRango(["HCO3"], bloqueX);
  var naAG = textoFuera ? extraerConRangoSuero(["SODIO"], textoFuera) : { valor: "---" };
  var clAG = textoFuera ? extraerConRangoSuero(["CLORO"], textoFuera) : { valor: "---" };
  var albAG = textoFuera ? extraerConRangoSuero(["ALBUMINA"], textoFuera) : { valor: "---" };
  var urine = textoFuera ? extractUrineElectrolytes_(textoFuera) : { na: "---", k: "---", cl: "---" };
  var iCaData = extraerConRango(["CA++ IONIZADO", "CALCIO IONIZADO", "CA IONIZADO"], bloqueX);
  var agEff = resolveEffectiveAnionGapValue_(naAG.valor, clAG.valor, hco3Data.valor, albAG.valor);
  return {
    phData,
    pH: fmtGasoRanged_(phData, "pH", gasRefs),
    pCO2: fmtGasoRanged_(extraerConRango(["PCO2"], bloqueX), "pCO2", gasRefs),
    pO2: fmtGasoRanged_(extraerConRango(["PO2 "], bloqueX), "pO2", gasRefs),
    Na: fmtGasoRanged_(extraerConRango(["SODIO"], bloqueX), "Na", gasRefs),
    K: fmtGasoRanged_(extraerConRango(["POTASIO"], bloqueX), "K", gasRefs),
    GLU: fmtGasoRanged_(extraerConRango(["GLUCOSA"], bloqueX), "GLU", gasRefs),
    Lac: fmtGasoRanged_(extraerConRango(["LACTATO"], bloqueX), "Lactato", gasRefs),
    Bica: fmtGasoRanged_(hco3Data, "Bica", gasRefs),
    Hto: fmtGasoRanged_(extraerConRango(["HCT ", "HEMATOCRITO"], bloqueX), "Hto", gasRefs),
    iCa: fmtGasoRanged_(iCaData, "iCa", gasRefs),
    AG: computeAnionGap_(naAG.valor, clAG.valor, hco3Data.valor),
    AGc: computeAlbuminCorrectedAnionGap_(naAG.valor, clAG.valor, hco3Data.valor, albAG.valor),
    UAG: computeUrinaryAnionGap_(urine.na, urine.k, urine.cl),
    DD: computeDeltaDelta_(agEff, hco3Data.valor)
  };
}
function appendGasoPair_(p, key, val) {
  if (val !== "---") p.push(key, val);
}
function buildGasoLine_(g2) {
  var p = ["GASES"];
  appendGasoPair_(p, "pH", g2.pH);
  appendGasoPair_(p, "pCO2", g2.pCO2);
  appendGasoPair_(p, "pO2", g2.pO2);
  appendGasoPair_(p, "Na", g2.Na);
  appendGasoPair_(p, "K", g2.K);
  appendGasoPair_(p, "GLU", g2.GLU);
  appendGasoPair_(p, "Lactato", g2.Lac);
  appendGasoPair_(p, "Bica", g2.Bica);
  appendGasoPair_(p, "AG", g2.AG);
  appendGasoPair_(p, "AGc", g2.AGc);
  appendGasoPair_(p, "UAG", g2.UAG);
  appendGasoPair_(p, "Delta-Delta", g2.DD);
  appendGasoPair_(p, "Hto", g2.Hto);
  appendGasoPair_(p, "iCa", g2.iCa);
  return p[0] + "	" + p.slice(1).join(" ");
}
function parseGaso_(bloqueGaso, textoFuera, gasRefs) {
  if (!bloqueGaso) return "";
  var bloqueX = gasoBlockForExtract_(bloqueGaso);
  var g2 = extractGasoFormatted_(bloqueX, textoFuera, gasRefs);
  if (g2.phData.valor === "---") return "";
  return buildGasoLine_(g2);
}
function labSectionKey_(line) {
  var s = String(line == null ? "" : line).trim();
  if (!s) return "";
  var tab = s.indexOf("	");
  if (tab >= 0) return s.substring(0, tab).trim().toUpperCase();
  var colon = s.indexOf(":");
  if (colon > 0) return s.substring(0, colon + 1).trim().toUpperCase();
  var m = s.match(/^([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\b/);
  return m ? m[1].toUpperCase() : s.toUpperCase();
}
function lineRichnessScore_(line) {
  var s = normalizeLabLine_(line);
  if (!s) return 0;
  var score = s.length;
  score += (s.match(/\b(?:AG|AGC|UAG|DELTA-DELTA|ICA|LACTATO|BICA|PCO2|PO2)\b/gi) || []).length * 8;
  score += (s.match(/\d/g) || []).length;
  return score;
}
function normalizeGasometryInterpretationLine_2(line) {
  var s = String(line == null ? "" : line);
  return /^Interpretación gasometría:/i.test(s.trim()) ? s.toUpperCase() : s;
}
function normalizeLabLine_(line) {
  return normalizeGasometryInterpretationLine_2(line).replace(/\s+/g, " ").trim();
}
function labRowText_(row) {
  if (row && typeof row === "object" && typeof row.visible === "string") return row.visible;
  return String(row == null ? "" : row);
}
function dedupeSingletonSections_(rows) {
  var singleton = {
    BH: 1,
    QS: 1,
    ESC: 1,
    PFHS: 1,
    LIPASA: 1,
    TROP: 1,
    GASES: 1,
    PIE: 1,
    "LCR:": 1,
    "LIQ:": 1,
    HECES: 1,
    FROTIS: 1,
    EGO: 1,
    SEROL: 1,
    GS: 1,
    PROT12H: 1,
    PROT24H: 1,
    "INTERPRETACI\xD3N GASOMETR\xCDA:": 1,
    "INTERPRETACI\xD3N ASCITIS:": 1,
    "INTERPRETACI\xD3N CITOQU\xCDMICO:": 1,
    TIR: 1,
    ENDO: 1,
    CARD: 1,
    FE: 1,
    INFL: 1,
    INM: 1,
    META: 1,
    NEF: 1,
    NIVEL: 1,
    TM: 1,
    NUT: 1,
    GI: 1,
    TOX: 1,
    HEPB: 1,
    VIRAL: 1,
    MICRO: 1
  };
  var list = (rows || []).filter(function(r) {
    return normalizeLabLine_(labRowText_(r)) !== "";
  });
  var best = /* @__PURE__ */ Object.create(null);
  var keep = [];
  for (var i = 0; i < list.length; i++) {
    var raw = list[i];
    var rowText = labRowText_(raw);
    var key = labSectionKey_(rowText);
    if (!singleton[key]) {
      keep.push(raw);
      continue;
    }
    var cand = { row: raw, idx: i, score: lineRichnessScore_(rowText) };
    var prev = best[key];
    if (!prev || cand.score > prev.score || cand.score === prev.score && cand.idx > prev.idx) {
      best[key] = cand;
    }
  }
  var chosen = /* @__PURE__ */ Object.create(null);
  Object.keys(best).forEach(function(k2) {
    chosen[best[k2].idx] = best[k2].row;
  });
  var out = [];
  for (var j = 0; j < list.length; j++) {
    var rowRaw = list[j];
    var rText = labRowText_(rowRaw);
    var k = labSectionKey_(rText);
    if (!singleton[k]) out.push(rowRaw);
    else if (chosen[j]) out.push(chosen[j]);
  }
  return out;
}
function valueFromSectionLine_(line, key) {
  var s = normalizeLabLine_(line);
  if (!s) return null;
  var m = s.match(
    new RegExp(
      "(?:^|\\s)" + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+(-?\\d+(?:\\.\\d+)?)(\\*)?",
      "i"
    )
  );
  return m ? m[1] + (m[2] || "") : null;
}
function markGasoToken_(valStr, gasRefs, fieldKey) {
  if (valStr == null || valStr === "") return valStr;
  var bare = String(valStr).replace(/\*$/, "");
  var range = resolveLabFieldRange_(
    { valor: bare, min: null, max: null },
    fieldKey,
    gasRefs,
    DEFAULT_GASO_REFS
  );
  if (range) return fmt(marcarSegunRango(bare, range[0], range[1]));
  var starred = String(valStr).endsWith("*");
  return fmt(starred ? bare + "*" : bare);
}
function pickBestSectionLine_(rows, sectionName) {
  var sec = String(sectionName || "").toUpperCase();
  var best = null;
  (rows || []).forEach(function(row, idx) {
    if (labSectionKey_(row) !== sec) return;
    var cand = { row: String(row), idx, score: lineRichnessScore_(row) };
    if (!best || cand.score > best.score || cand.score === best.score && cand.idx > best.idx) best = cand;
  });
  return best ? best.row : "";
}
function formatNumericToken_(n) {
  if (n == null || !isFinite(n)) return "";
  var rounded = Math.round((n + Number.EPSILON) * 10) / 10;
  return rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
}
function appendMarkedAgToken_(out, key, value) {
  if (value == null) return;
  out.push(key, marcarSegunRango(formatNumericToken_(value), 8, 12));
}
function appendAnionGapDerivedTokens_(out, base, na, cl, bica, alb) {
  var agRaw = computeAnionGapValue_(na || "---", cl || "---", bica || "---");
  appendMarkedAgToken_(out, "AG", agRaw);
  var agc = computeAlbuminCorrectedAnionGapValue_(
    na || "---",
    cl || "---",
    bica || "---",
    alb || "---"
  );
  appendMarkedAgToken_(out, "AGc", agc);
  var uagExisting = valueFromSectionLine_(base, "UAG");
  if (uagExisting != null && uagExisting !== "") {
    out.push("UAG", String(uagExisting).replace(/\*$/, ""));
  }
  var ddv = computeDeltaDeltaValue_(agc != null ? agc : agRaw, bica || "---");
  if (ddv != null) out.push("Delta-Delta", formatNumericToken_(ddv));
}
function rebuildGasesFromResults_(rows, gasRefs) {
  var gases = pickBestSectionLine_(rows, "GASES");
  if (!gases) return { gasesLine: "", interpLine: "" };
  var base = normalizeLabLine_(gases);
  var out = ["GASES"];
  var orderedKeys = ["pH", "pCO2", "pO2", "Na", "K", "GLU", "Lactato", "Bica", "Hto", "iCa"];
  var values = {};
  orderedKeys.forEach(function(k) {
    values[k] = valueFromSectionLine_(base, k);
  });
  var qs = pickBestSectionLine_(rows, "QS");
  var esc = pickBestSectionLine_(rows, "ESC");
  var pfhs = pickBestSectionLine_(rows, "PFHS");
  var na = valueFromSectionLine_(qs, "Na") || valueFromSectionLine_(esc, "Na") || values.Na;
  var cl = valueFromSectionLine_(qs, "Cl") || valueFromSectionLine_(esc, "Cl");
  var alb = valueFromSectionLine_(pfhs, "Alb");
  orderedKeys.forEach(function(k) {
    if (values[k] != null && values[k] !== "") {
      out.push(k, markGasoToken_(values[k], gasRefs, k));
    }
  });
  appendAnionGapDerivedTokens_(out, base, na, cl, values.Bica, alb);
  return { gasesLine: out[0] + "	" + out.slice(1).join(" "), interpLine: "" };
}
function reprocessLabResultLines_(rows, opts) {
  var gasRefs = opts && opts.gasRefs;
  var clean = dedupeSingletonSections_(rows || []);
  var rebuilt = rebuildGasesFromResults_(clean, gasRefs);
  var out = clean.filter(function(r) {
    var k = labSectionKey_(r);
    return k !== "GASES" && k !== "INTERPRETACI\xD3N GASOMETR\xCDA:";
  });
  if (rebuilt.gasesLine) out.push(rebuilt.gasesLine);
  if (rebuilt.interpLine) out.push(rebuilt.interpLine);
  return dedupeSingletonSections_(out);
}
function computeDeltaDeltaValue_(agValue, hco3Str) {
  if (agValue == null) return null;
  var hco3 = parseFloat(String(hco3Str).replace(",", "."));
  if (isNaN(hco3)) return null;
  var deltaHco3 = 24 - hco3;
  if (deltaHco3 <= 0) return null;
  return (agValue - 12) / deltaHco3;
}
function computeDeltaDelta_(agValue, hco3Str) {
  var dd = computeDeltaDeltaValue_(agValue, hco3Str);
  if (dd == null) return "---";
  var rounded = Math.round(dd * 10) / 10;
  return rounded === Math.trunc(rounded) ? String(rounded.toFixed(0)) : String(rounded);
}
function parsePIE_(tNorm) {
  var hasPIEInmuno = /PRUEBA INMUNOLOGICA DE EMBARAZO/i.test(tNorm);
  var hasPrueba = /PRUEBA DE EMBARAZO/i.test(tNorm);
  if (!hasPIEInmuno && !hasPrueba) return "";
  if (hasPIEInmuno) {
    var idx = tNorm.toUpperCase().indexOf("PRUEBA INMUNOLOGICA DE EMBARAZO");
    var sub = tNorm.substring(idx, idx + 400);
    var subUp = sub.toUpperCase();
    var sueroIdx = subUp.indexOf("SUERO");
    var m = null;
    if (sueroIdx !== -1) {
      m = sub.substring(sueroIdx, sueroIdx + 100).match(/\b(NEGATIVO|POSITIVO)\b/i);
    }
    if (!m) {
      var orinaIdx = subUp.indexOf("ORINA");
      if (orinaIdx !== -1) m = sub.substring(orinaIdx, orinaIdx + 100).match(/\b(NEGATIVO|POSITIVO)\b/i);
    }
    if (!m) return "";
    return "PIE	" + m[1].toUpperCase() + "*";
  }
  var idxPie = tNorm.toUpperCase().indexOf("PRUEBA DE EMBARAZO");
  var subPie = tNorm.substring(idxPie, idxPie + 300);
  var mPie = subPie.match(/\b(NEGATIVO|POSITIVO)\b/i);
  if (!mPie) return "";
  return "PIE	" + mPie[1].toUpperCase() + "*";
}

// public/js/labs-bh.mjs
var BH_EXTRA_DISPLAY_LABELS = {
  RBC: "Eri",
  CHCM: "CHCM",
  RDW: "RDW",
  MPV: "VPM",
  Ret: "Ret",
  Lin: "Lin#",
  Mono: "Mono#",
  Baso: "Baso#",
  NeuPct: "Seg",
  LinPct: "Lin",
  MonoPct: "Mono",
  EosPct: "Eos",
  BasoPct: "Baso",
  Bandas: "Band",
  Mielo: "Mielo",
  Metamielo: "Meta",
  Promielo: "Prom",
  Blastos: "Blast",
  Atipicos: "Atip"
};
var BH_DIFF_DISPLAY_ORDER = [
  "NeuPct",
  "LinPct",
  "MonoPct",
  "EosPct",
  "BasoPct",
  "Bandas",
  "Mielo",
  "Metamielo",
  "Promielo",
  "Blastos",
  "Atipicos"
];
var BH_SCALAR_EXT_ORDER = ["RBC", "CHCM", "RDW", "MPV", "Ret", "Lin", "Mono", "Baso"];
var BH_SOME_TREND_ORDER = [
  "RBC",
  "Hb",
  "Hto",
  "VCM",
  "HCM",
  "CHCM",
  "RDW",
  "Leu",
  "Neu",
  "NeuPct",
  "Lin",
  "LinPct",
  "Mono",
  "MonoPct",
  "Eos",
  "EosPct",
  "Baso",
  "BasoPct",
  "Plt",
  "MPV",
  "Ret",
  "TP",
  "TTP",
  "INR",
  "Fib",
  "DD",
  "Bandas",
  "Mielo",
  "Metamielo",
  "Promielo",
  "Blastos",
  "Atipicos"
];
var QS_SOME_TREND_ORDER = [
  "Glu",
  "BUN",
  "Cr",
  "eTFG",
  "AU",
  "PCR",
  "PCT",
  "COL",
  "HDL",
  "LDL",
  "VLDL",
  "TGL",
  "IA",
  "CTHDL",
  "VSG",
  "CPK"
];
function sortTrendSpecsBySomeOrder(sectionKey, specs) {
  var order = sectionKey === "BH" ? BH_SOME_TREND_ORDER : sectionKey === "QS" ? QS_SOME_TREND_ORDER : null;
  if (!order) return (specs || []).slice();
  var rank = /* @__PURE__ */ Object.create(null);
  order.forEach(function(fk, i) {
    rank[fk] = i;
  });
  return (specs || []).slice().sort(function(a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a.fieldKey) ? rank[a.fieldKey] : 9999;
    var rb = Object.prototype.hasOwnProperty.call(rank, b.fieldKey) ? rank[b.fieldKey] : 9999;
    if (ra !== rb) return ra - rb;
    return String(a.cardTitle || a.fieldKey).localeCompare(String(b.cardTitle || b.fieldKey), "es");
  });
}
var BH_DIFF_RANGE_LABELS = {
  NeuPct: ["SEGMENTADOS", "NEU%", "NEUTROFILOS%"],
  LinPct: ["LINFOCITOS", "LYM%", "LINFOCITOS%"],
  MonoPct: ["MONOCITOS", "MONO%"],
  EosPct: ["EOSINOFILOS", "EOS%"],
  BasoPct: ["BASOFILOS", "BASO%"],
  Bandas: ["BANDAS", "CAYADOS"],
  Mielo: ["MIELOCITOS"],
  Metamielo: ["METAMIELOCITOS"],
  Promielo: ["PROMIELOCITOS"],
  Blastos: ["BLASTOS"],
  Atipicos: ["LINF. ATIPICOS", "LINF ATIPICOS", "LINFOCITOS ATIPICOS", "VARIANTES", "ATIPICOS"]
};
function bhExtraDisplayLabel(key) {
  return BH_EXTRA_DISPLAY_LABELS[key] || key;
}
var BH_TREND_TITLES = {
  NeuPct: "Segmentados",
  LinPct: "Linfocitos",
  MonoPct: "Monocitos",
  EosPct: "Eosin\xF3filos",
  BasoPct: "Bas\xF3filos",
  Bandas: "Bandas",
  Mielo: "Mielocitos",
  Metamielo: "Metamielocitos",
  Promielo: "Promielocitos",
  Blastos: "Blastos",
  Atipicos: "Linf. at\xEDpicos"
};
function bhTrendDisplayTitle(fieldKey) {
  return BH_TREND_TITLES[fieldKey] || bhExtraDisplayLabel(fieldKey) || fieldKey;
}
var BH_OUTPUT_LABEL_TO_FIELD = {
  Seg: "NeuPct",
  Lin: "LinPct",
  Mono: "MonoPct",
  Eos: "EosPct",
  Baso: "BasoPct",
  Band: "Bandas",
  Meta: "Metamielo",
  Mielo: "Mielo",
  Prom: "Promielo",
  Blast: "Blastos",
  Atip: "Atipicos",
  NeuPct: "NeuPct",
  LinPct: "LinPct",
  MonoPct: "MonoPct",
  EosPct: "EosPct",
  BasoPct: "BasoPct",
  Bandas: "Bandas",
  Metamielo: "Metamielo",
  Promielo: "Promielo",
  Blastos: "Blastos",
  Atipicos: "Atipicos",
  Hb: "Hb",
  Hto: "Hto",
  VCM: "VCM",
  HCM: "HCM",
  Leu: "Leu",
  Neu: "Neu",
  Plt: "Plt",
  RBC: "RBC",
  Eri: "RBC",
  CHCM: "CHCM",
  RDW: "RDW",
  VPM: "MPV",
  MPV: "MPV",
  Ret: "Ret",
  TP: "TP",
  TTP: "TTP",
  INR: "INR",
  Fib: "Fib",
  DD: "DD"
};
function bhFieldKeyFromOutputLabel(label) {
  return BH_OUTPUT_LABEL_TO_FIELD[label] || label;
}
function parseBhTokenPairs_(text, into) {
  if (!text) return;
  var tokens = String(text).trim().split(/\s+/);
  var i = 0;
  while (i < tokens.length) {
    var label = tokens[i];
    if (!label || label === "-") {
      i++;
      continue;
    }
    var next = tokens[i + 1];
    if (next == null) {
      i++;
      continue;
    }
    var m = next.match(/^(-?\d+(?:[.,]\d+)?)(?:%)?(\*)?$/);
    if (m) {
      var fk = bhFieldKeyFromOutputLabel(label);
      var val = m[1].replace(",", ".");
      into[fk] = { val, ab: next.indexOf("*") >= 0 };
      i += 2;
    } else {
      i++;
    }
  }
}
function parseBhTrendValuesFromResLab(entry) {
  var out = {};
  if (!entry) return out;
  var lines = String(entry).split(/\r?\n/);
  lines.forEach(function(line) {
    var trimmed = line.trim();
    if (!trimmed) return;
    var tab = trimmed.indexOf("	");
    if (tab < 0) return;
    var head = trimmed.substring(0, tab).trim().replace(/:$/, "");
    var body = trimmed.substring(tab + 1).trim();
    if (/^BH$/i.test(head) || /^COAG$/i.test(head)) {
      parseBhTokenPairs_(body, out);
      return;
    }
    if (body) parseBhTokenPairs_(body, out);
  });
  return out;
}
function formatBhDiffPctDisplay_(key, rawVal, tNorm, priorRefs) {
  var label = bhExtraDisplayLabel(key);
  var val = String(rawVal);
  var labels = BH_DIFF_RANGE_LABELS[key];
  if (labels && tNorm) {
    var d = extraerConRangoBH(labels, tNorm);
    if (d.valor && d.valor !== "---") {
      val = fmtLabRanged_(d, key, priorRefs);
    }
  } else if (val && val !== "---") {
    val = fmtLabRanged_({ valor: val, min: null, max: null }, key, priorRefs);
  }
  if (val.endsWith("*")) return label + " " + val.slice(0, -1) + "%*";
  return label + " " + val + "%";
}
function formatBhExtrasDisplayParts(bhExtras, sourceText) {
  if (!bhExtras || typeof bhExtras !== "object") return [];
  var tNorm = sourceText ? String(sourceText) : "";
  var parts = [];
  var seen = {};
  function addScalarKey(k) {
    if (seen[k]) return;
    var v = bhExtras[k];
    if (v == null || String(v).trim() === "") return;
    seen[k] = true;
    parts.push(bhExtraDisplayLabel(k) + " " + String(v));
  }
  BH_SCALAR_EXT_ORDER.forEach(addScalarKey);
  BH_DIFF_DISPLAY_ORDER.forEach(function(k) {
    if (seen[k] || !bhExtras[k]) return;
    seen[k] = true;
    parts.push(formatBhDiffPctDisplay_(k, bhExtras[k], tNorm));
  });
  Object.keys(bhExtras).forEach(function(k) {
    if (seen[k]) return;
    var v = bhExtras[k];
    if (v == null || String(v).trim() === "") return;
    seen[k] = true;
    if (BH_DIFF_DISPLAY_ORDER.indexOf(k) !== -1) {
      parts.push(formatBhDiffPctDisplay_(k, v, tNorm));
    } else {
      parts.push(bhExtraDisplayLabel(k) + " " + String(v));
    }
  });
  return parts;
}
function formatBhExtrasDisplayLine(bhExtras, sourceText) {
  var parts = formatBhExtrasDisplayParts(bhExtras, sourceText);
  if (!parts.length) return "";
  return "BH ext	" + parts.join("  ");
}
function pairListToDisplay_(pairs) {
  var out = [];
  for (var i = 0; i < pairs.length; i += 2) {
    if (pairs[i + 1] !== void 0) out.push(pairs[i] + " " + pairs[i + 1]);
  }
  return out.join("  ");
}
function formatCoagResLabLine_(coagDisplay) {
  if (!coagDisplay || !coagDisplay.length) return "";
  return "COAG	" + coagDisplay.join("  ");
}
function extractCoagBodyFromBhLine_(line) {
  var m = String(line || "").match(/^(?:COAG|Coag\.?)\t(.+)/i);
  return m ? m[1].trim() : "";
}
var COAG_FIELD_MERGE_ORDER_ = ["TP", "TTP", "INR", "Fib", "DD"];
function coagFieldMergeRank_(key) {
  var i = COAG_FIELD_MERGE_ORDER_.indexOf(key);
  return i === -1 ? 999 : i;
}
function mergeCoagResLabRows_(rows) {
  var coagByKey = /* @__PURE__ */ Object.create(null);
  (rows || []).forEach(function(row) {
    var body = extractCoagBodyFromBhLine_(row);
    if (!body) return;
    body.split(/\s{2,}/).forEach(function(tok) {
      var t = tok.trim();
      if (!t) return;
      var key = t.split(/\s+/)[0];
      var score = lineRichnessScore_(t);
      var prev = coagByKey[key];
      if (!prev || score > prev.score) coagByKey[key] = { tok: t, score };
    });
  });
  var keys = Object.keys(coagByKey);
  if (!keys.length) return "";
  keys.sort(function(a, b) {
    var ra = coagFieldMergeRank_(a);
    var rb = coagFieldMergeRank_(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
  return formatCoagResLabLine_(
    keys.map(function(k) {
      return coagByKey[k].tok;
    })
  );
}
function extraerSimpleBh_(labels, texto) {
  if (!texto) return "";
  for (var li = 0; li < labels.length; li++) {
    var lbl = labels[li];
    var idx = -1;
    var up = String(texto).toUpperCase();
    var lu = lbl.toUpperCase();
    var from = 0;
    while (true) {
      var p = up.indexOf(lu, from);
      if (p === -1) break;
      var after = up.charAt(p + lu.length);
      var before = up.charAt(p - 1) || " ";
      var isWordBoundaryBefore = !/[A-Z0-9_]/.test(before);
      var isExactBoundary = lu.charAt(lu.length - 1) === "%" || !/[A-Z0-9]/.test(after);
      if (isWordBoundaryBefore && isExactBoundary) {
        idx = p + lu.length;
        break;
      }
      from = p + lu.length;
    }
    if (idx === -1) continue;
    var sub = texto.substring(idx, idx + 80);
    var m = sub.match(/(-?\d+[.,]?\d*)/);
    if (m) return m[1].replace(",", ".");
  }
  return "";
}
function fmtBhRanged_(data, fieldKey, priorRefs) {
  return fmtLabRanged_(data, fieldKey, priorRefs);
}
function extractBhScalarFields_(tNorm, priorRefs) {
  return {
    Hb: fmtBhRanged_(extraerConRango(["HGB", "HEMOGLOBINA TOTAL", "HEMOGLOBINA"], tNorm), "Hb", priorRefs),
    Hto: fmtBhRanged_(extraerConRango(["HCT ", "HEMATOCRITO"], tNorm), "Hto", priorRefs),
    VCM: fmtBhRanged_(extraerConRango(["MCV ", "VCM "], tNorm), "VCM", priorRefs),
    HCM: fmtBhRanged_(extraerConRango(["MCH ", "HCM "], tNorm), "HCM", priorRefs),
    CHCM: fmtBhRanged_(extraerConRango(["MCHC", "CHCM"], tNorm), "CHCM", priorRefs),
    RDW: fmtBhRanged_(extraerConRango(["RDW "], tNorm), "RDW", priorRefs),
    Leu: fmtBhRanged_(extraerConRango(["WBC "], tNorm), "Leu", priorRefs),
    RBC: fmtBhRanged_(extraerConRangoBH(["RBC ", "ERITROCITOS", "HEMATIES"], tNorm), "RBC", priorRefs),
    Plt: fmtBhRanged_(extraerConRango(["PLT "], tNorm), "Plt", priorRefs),
    MPV: fmtBhRanged_(extraerConRango(["MPV ", "VPM "], tNorm), "MPV", priorRefs),
    Ret: fmtBhRanged_(extraerConRango(["RETICULOCITOS"], tNorm), "Ret", priorRefs),
    TP: fmtBhRanged_(extraerConRangoCoag(["TIEMPO DE PROTROMBINA"], tNorm), "TP", priorRefs),
    TTP: fmtBhRanged_(extraerConRangoCoag(["TIEMPO DE TROMBOPLASTINA"], tNorm), "TTP", priorRefs),
    INR: fmtBhRanged_(extraerConRangoCoag(["INR ", "INR"], tNorm), "INR", priorRefs),
    Fib: fmtBhRanged_(extraerConRangoCoag(["FIBRINOGENO", "FIBRIN\xD3GENO"], tNorm), "Fib", priorRefs),
    DD: fmtBhRanged_(extraerConRangoCoag(["DIMERO D", "D-DIMERO", "D DIMERO"], tNorm), "DD", priorRefs),
    Neu: fmtBhRanged_(extraerConRango(["NEU "], tNorm), "Neu", priorRefs),
    Eos: fmtBhRanged_(extraerConRango(["EOS "], tNorm), "Eos", priorRefs)
  };
}
function pushBhExtra_(extras, key, value) {
  if (value && value !== "---" && value !== "") extras[key] = String(value);
}
function buildBhExtras_(tNorm, Leu) {
  var extras = {};
  var linData = extraerConRango(["LYM ", "LINFOCITOS"], tNorm);
  var monoData = extraerConRango(["MONO "], tNorm);
  var basoData = extraerConRango(["BASO "], tNorm);
  if (Leu !== "---") {
    pushBhExtra_(extras, "Lin", linData.valor);
    pushBhExtra_(extras, "Mono", monoData.valor);
    pushBhExtra_(extras, "Baso", basoData.valor);
  }
  pushBhExtra_(extras, "NeuPct", extraerSimpleBh_(["NEU%", "NEUTROFILOS%", "SEGMENTADOS"], tNorm));
  pushBhExtra_(extras, "LinPct", extraerSimpleBh_(["LYM%", "LINFOCITOS%", "LINFOCITOS"], tNorm));
  pushBhExtra_(extras, "MonoPct", extraerSimpleBh_(["MONO%", "MONOCITOS%", "MONOCITOS"], tNorm));
  pushBhExtra_(extras, "EosPct", extraerSimpleBh_(["EOS%", "EOSINOFILOS%", "EOSINOFILOS"], tNorm));
  pushBhExtra_(extras, "BasoPct", extraerSimpleBh_(["BASO%", "BASOFILOS%", "BASOFILOS"], tNorm));
  pushBhExtra_(extras, "Bandas", extraerSimpleBh_(["BANDAS", "CAYADOS"], tNorm));
  pushBhExtra_(extras, "Mielo", extraerSimpleBh_(["MIELOCITOS"], tNorm));
  pushBhExtra_(extras, "Metamielo", extraerSimpleBh_(["METAMIELOCITOS"], tNorm));
  pushBhExtra_(extras, "Promielo", extraerSimpleBh_(["PROMIELOCITOS"], tNorm));
  pushBhExtra_(extras, "Blastos", extraerSimpleBh_(["BLASTOS"], tNorm));
  pushBhExtra_(
    extras,
    "Atipicos",
    extraerSimpleBh_(
      ["LINF. ATIPICOS", "LINF ATIPICOS", "LINFOCITOS ATIPICOS", "VARIANTES", "ATIPICOS"],
      tNorm
    )
  );
  return extras;
}
function buildBhCorePairs_(f) {
  var corePairs = [];
  if (f.Hb !== "---") corePairs.push("Hb", f.Hb);
  if (f.Hto !== "---") corePairs.push("Hto", f.Hto);
  if (f.VCM !== "---") corePairs.push("VCM", f.VCM);
  if (f.HCM !== "---") corePairs.push("HCM", f.HCM);
  if (f.Leu !== "---") corePairs.push("Leu", f.Leu);
  if (f.Neu !== "---") corePairs.push("Neu", f.Neu);
  if (f.Eos !== "---") corePairs.push("Eos", f.Eos);
  if (f.Plt !== "---") corePairs.push("Plt", f.Plt);
  return corePairs;
}
function buildBhCoagDisplay_(f) {
  var coagDisplay = [];
  if (f.TP !== "---") coagDisplay.push("TP " + f.TP);
  if (f.TTP !== "---") coagDisplay.push("TTP " + f.TTP);
  if (f.INR !== "---") coagDisplay.push("INR " + f.INR);
  if (f.Fib !== "---") coagDisplay.push("Fib " + f.Fib);
  if (f.DD !== "---") coagDisplay.push("DD " + f.DD);
  return coagDisplay;
}
function mergeBhIndexExtras_(extras, f) {
  if (f.RBC !== "---") pushBhExtra_(extras, "RBC", f.RBC);
  if (f.CHCM !== "---") pushBhExtra_(extras, "CHCM", f.CHCM);
  if (f.RDW !== "---") pushBhExtra_(extras, "RDW", f.RDW);
  if (f.MPV !== "---") pushBhExtra_(extras, "MPV", f.MPV);
  if (f.Ret !== "---") pushBhExtra_(extras, "Ret", f.Ret);
}
function buildBhDiffDisplay_(extras, tNorm, hasCompactBody, priorRefs) {
  if (hasCompactBody) return [];
  var diffDisplay = [];
  BH_DIFF_DISPLAY_ORDER.forEach(function(k) {
    var v = extras[k];
    if (!v || v === "0") return;
    diffDisplay.push(formatBhDiffPctDisplay_(k, v, tNorm, priorRefs));
  });
  return diffDisplay;
}
function buildBhIndexDisplay_(f, hasCompactBody) {
  if (hasCompactBody) return [];
  var indexDisplay = [];
  if (f.RBC !== "---") indexDisplay.push("Eri " + f.RBC);
  if (f.CHCM !== "---") indexDisplay.push("CHCM " + f.CHCM);
  if (f.RDW !== "---") indexDisplay.push("RDW " + f.RDW);
  if (f.MPV !== "---") indexDisplay.push("VPM " + f.MPV);
  if (f.Ret !== "---") indexDisplay.push("Ret " + f.Ret);
  return indexDisplay;
}
function buildBhVisibleLine_(hasCompactBody, corePairs, indexDisplay, diffDisplay) {
  if (hasCompactBody) return "BH	" + pairListToDisplay_(corePairs);
  if (!indexDisplay.length && !diffDisplay.length) return "";
  var sub = ["BH:"];
  if (indexDisplay.length) sub.push("  Hem.	" + indexDisplay.join("  "));
  if (diffDisplay.length) sub.push("  Dif.	" + diffDisplay.join("  "));
  return sub.join("\n");
}
function bhHasAnyData_(f, extras) {
  var hasCore = [f.Hb, f.Hto, f.VCM, f.HCM, f.Leu, f.Neu, f.Eos, f.Plt].some(function(v) {
    return v !== "---";
  });
  var hasExtIdx = [f.RBC, f.CHCM, f.RDW, f.MPV, f.Ret].some(function(v) {
    return v !== "---";
  });
  var hasCoag = [f.TP, f.TTP, f.INR, f.Fib, f.DD].some(function(v) {
    return v !== "---";
  });
  return hasCore || hasExtIdx || hasCoag || Object.keys(extras).length > 0;
}
function parseBH_(tNorm, priorRefs) {
  var f = extractBhScalarFields_(tNorm, priorRefs);
  var extras = buildBhExtras_(tNorm, f.Leu);
  if (!bhHasAnyData_(f, extras)) return { visible: "", coagVisible: "", extras: {} };
  var corePairs = buildBhCorePairs_(f);
  var hasCompactBody = corePairs.length > 0;
  var coagDisplay = buildBhCoagDisplay_(f);
  if (hasCompactBody || coagDisplay.length) mergeBhIndexExtras_(extras, f);
  var visible = buildBhVisibleLine_(
    hasCompactBody,
    corePairs,
    buildBhIndexDisplay_(f, hasCompactBody),
    buildBhDiffDisplay_(extras, tNorm, hasCompactBody, priorRefs)
  );
  return { visible, coagVisible: formatCoagResLabLine_(coagDisplay), extras };
}
function mergeBhResLabRows_(rows) {
  var list = (rows || []).map(function(r) {
    return String(r == null ? "" : r);
  }).filter(function(s) {
    return /^BH\b/i.test(s.trim());
  });
  if (!list.length) return { bh: "", coag: "" };
  var best = list[0];
  var bestScore = lineRichnessScore_(best);
  for (var i = 1; i < list.length; i++) {
    var sc = lineRichnessScore_(list[i]);
    if (sc > bestScore) {
      bestScore = sc;
      best = list[i];
    }
  }
  var coagRows = [];
  list.forEach(function(row) {
    String(row).split(/\r?\n/).forEach(function(line) {
      if (extractCoagBodyFromBhLine_(line)) coagRows.push(line);
    });
  });
  var coag = mergeCoagResLabRows_(coagRows);
  var lines = best.split(/\r?\n/).filter(function(line) {
    return !/^(?:\s*Coag\.|COAG)\t/i.test(line.trim());
  });
  var bh = lines.join("\n").trim();
  return { bh, coag };
}

// public/js/labs-cultivo-scan.mjs
function findBacteriologiaSectionIdx_(lineasTexto) {
  var idxBact = -1;
  var idxMyco = -1;
  for (var i = 0; i < lineasTexto.length; i++) {
    var sec = lineasTexto[i].replace(/\r/g, "").replace(/\s+/g, " ").trim();
    if (/^BACTERIOLOGIA$/i.test(sec)) {
      idxBact = i;
      break;
    }
    if (/^MYCOBACTERIAS$/i.test(sec)) idxMyco = i;
  }
  return idxBact !== -1 ? idxBact : idxMyco;
}
function isTipoCultivoSkipLine_(lUp) {
  return /^BACTERIOLOGIA$/.test(lUp) || /^ESTUDIO\b/.test(lUp) || /^RESULTADO$/.test(lUp) || /^UNIDADES$/.test(lUp) || /^VALOR DE REFERENCIA$/.test(lUp);
}
function isExplicitTipoCultivoLine_(l, lUp) {
  return /\bUROCULTIVO\b/i.test(l) || /\bHEMOCULTIVO\b/i.test(l) || /^CATETER(\b|$)/i.test(lUp) || /^BACILOSCOPIA\b/i.test(lUp) || /^CULTIVO\s+DE\s+MICOBACTERIAS\b/i.test(lUp);
}
function isTipoCultivoCandidate_(lUp) {
  return !/^(TINCION|CALIDAD|ESTADO|MICROORGANISMO|COMENTARIO|CUENTA|ANTIBIOGRAMA|REPORTE\s+PRELIMINAR|1\s+MUESTRA|OBSERVACIONES|SECCION)\b/i.test(
    lUp
  );
}
function detectTipoCultivoLine(lineasTexto) {
  var idxSec = findBacteriologiaSectionIdx_(lineasTexto);
  if (idxSec === -1) return "";
  var candidate = "";
  for (var ii = idxSec + 1; ii < Math.min(idxSec + 35, lineasTexto.length); ii++) {
    var l = lineasTexto[ii].replace(/\r/g, "").replace(/\*/g, " ").replace(/\s+/g, " ").trim();
    if (!l) continue;
    var lUp = l.toUpperCase();
    if (isTipoCultivoSkipLine_(lUp)) continue;
    if (/^PRODUCTO$/.test(lUp)) break;
    if (isExplicitTipoCultivoLine_(l, lUp)) return l;
    if (!candidate && isTipoCultivoCandidate_(lUp)) candidate = l;
  }
  return candidate;
}
function cleanMycoLine_(line) {
  return String(line || "").replace(/\r/g, "").replace(/\*+/g, "").replace(/\s+/g, " ").trim();
}
function extractMuestraMycobacterias_(slice) {
  for (var o = 0; o < slice.length; o++) {
    if (!/^OBSERVACIONES\b/i.test(cleanMycoLine_(slice[o]))) continue;
    for (var o2 = o + 1; o2 < Math.min(o + 8, slice.length); o2++) {
      var obs = cleanMycoLine_(slice[o2]);
      if (!obs || /^OBSERVACIONES$/i.test(obs)) continue;
      if (/^(ESTUDIO|RESULTADO|UNIDADES|\*+)$/i.test(obs)) continue;
      return obs.toUpperCase();
    }
    break;
  }
  return "";
}
function isMycoResultSkipLine_(tUp) {
  return /^(ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA|1\s+MUESTRA)$/i.test(tUp) || /^SECCION\s+DE\s+MICOBACTERIAS/i.test(tUp) || /^REPORTE\s+PRELIMINAR/i.test(tUp);
}
function readMycoCultivoValue_(slice, k) {
  for (var k2 = k + 1; k2 < Math.min(k + 6, slice.length); k2++) {
    var v = cleanMycoLine_(slice[k2]);
    if (v && v.length > 2) return v.toUpperCase();
  }
  return "";
}
function findMycoStudyResult_(slice, fromIdx) {
  for (var k = fromIdx + 1; k < Math.min(fromIdx + 22, slice.length); k++) {
    var t = cleanMycoLine_(slice[k]);
    if (!t) continue;
    var tUp = t.toUpperCase();
    if (/^(BACILOSCOPIA|CULTIVO\s+DE\s+MICOBACTERIAS)/i.test(tUp)) break;
    if (/^OBSERVACIONES/i.test(tUp)) break;
    if (isMycoResultSkipLine_(tUp)) continue;
    if (/^CULTIVO$/i.test(tUp)) {
      var cultVal = readMycoCultivoValue_(slice, k);
      if (cultVal) return cultVal;
      continue;
    }
    if (/NEGATIVO|POSITIVO|PENDIENTE|EN CURSO|CRECIMIENTO|NO SE AISL/i.test(tUp) && t.length < 120) {
      return tUp;
    }
  }
  return "NEGATIVO";
}
function parseMycobacteriasStudies_(lineasTexto, fechaC) {
  var idxM = -1;
  for (var i = 0; i < lineasTexto.length; i++) {
    if (/^MYCOBACTERIAS$/i.test(cleanMycoLine_(lineasTexto[i]))) {
      idxM = i;
      break;
    }
  }
  if (idxM === -1) return "";
  var end = lineasTexto.length;
  for (var j = idxM + 1; j < lineasTexto.length; j++) {
    var sec = cleanMycoLine_(lineasTexto[j]);
    if (/^(HEMATOLOGIA|BACTERIOLOGIA|QUIMICA|BIOMETRIA|GASOMETRIA)\b/i.test(sec)) {
      end = j;
      break;
    }
  }
  var slice = lineasTexto.slice(idxM, end);
  var muestra = extractMuestraMycobacterias_(slice);
  var studyRe = /^(BACILOSCOPIA|CULTIVO\s+DE\s+MICOBACTERIAS|CULTIVO\s+DE\s+MYCOBACTERIAS)\b/i;
  var chunks = [];
  for (var si = 0; si < slice.length; si++) {
    var tipo = cleanMycoLine_(slice[si]);
    if (!studyRe.test(tipo)) continue;
    tipo = tipo.toUpperCase();
    var resultado = findMycoStudyResult_(slice, si);
    var header = tipo;
    if (muestra && header.indexOf(muestra) === -1) header += " (" + muestra + ")";
    chunks.push(header + " " + fechaC + ": " + resultado);
  }
  return chunks.length ? chunks.join("\n\n") : "";
}
function detectMuestraDesdeProducto(lineasTexto) {
  var idxProd = -1;
  for (var i = 0; i < lineasTexto.length; i++) {
    var prodLine = lineasTexto[i].replace(/\r/g, "").replace(/\*+/g, "").trim();
    if (/^PRODUCTO\b/i.test(prodLine)) {
      idxProd = i;
      break;
    }
  }
  if (idxProd === -1) return "";
  for (var j = idxProd + 1; j < Math.min(idxProd + 14, lineasTexto.length); j++) {
    var s = lineasTexto[j].replace(/\r/g, "").replace(/\*/g, "").trim();
    if (!s) continue;
    if (/^TINCION(\s+DE)?\s*GRAM/i.test(s)) break;
    if (/^CALIDAD DE LA MUESTRA$/i.test(s)) break;
    if (/^ESTADO DE CULTIVO$/i.test(s)) break;
    if (/^REPORTE PRELIMINAR$/i.test(s)) break;
    if (/^MICROORGANISMO$/i.test(s)) break;
    if (/^COMENTARIO/i.test(s)) break;
    return s;
  }
  return "";
}
function buildCultivoTipoDisplay(tipoLine, muestra) {
  var t = tipoLine ? tipoLine.replace(/\s+/g, " ").trim().toUpperCase() : "";
  var m = muestra ? muestra.replace(/\s+/g, " ").trim().toUpperCase() : "";
  if (t && m) return t + " (" + m + ")";
  if (t) return t;
  if (m) return "CULTIVO (" + m + ")";
  return "CULTIVO";
}
function parseInterpAntibiograma(vL) {
  var vClean = vL.replace(/\*+$/g, "").trim();
  if (!vClean) return null;
  var tabs = vClean.split(/\t+/).map(function(x) {
    return x.trim();
  }).filter(Boolean);
  if (tabs.length >= 2) {
    var interp = tabs[tabs.length - 1].toUpperCase().replace(/\*+$/, "");
    var mic = tabs.slice(0, -1).join(" ").trim();
    if (/^(S|R|I|NEG|POS|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL)$/.test(interp)) return { mic, interp };
    if (/^NO\s+SUSCEPTIBLE$/i.test(interp)) return { mic, interp: "NO SUSCEPTIBLE" };
  }
  var mV = vClean.match(/^([<>]=?\s*\d+(?:\.\d+)?(?:\/\d+)?)\s+(S|R|I|NEG|POS|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL)$/i);
  if (mV) return { mic: mV[1].replace(/\s/g, ""), interp: mV[2].toUpperCase() };
  var mN = vClean.match(/^(\d+)\s+(S|R|I|ESBL|BLEE|BLAC|KPC|NDM|VIM|IMP|MBL)$/i);
  if (mN) return { mic: mN[1], interp: mN[2].toUpperCase() };
  var lim = vClean.toUpperCase();
  if (/^(S|R|I)$/.test(lim)) return { mic: "", interp: lim };
  if (/NO\s+SUSCEPTIBLE/i.test(vClean)) return { mic: "", interp: "NO SUSCEPTIBLE" };
  return null;
}
var ORDEN_MARCA_RESISTENCIA = {
  KPC: 1,
  NDM: 2,
  VIM: 3,
  IMP: 4,
  "OXA-48": 5,
  "OXA-otras": 6,
  MBL: 7,
  SPM: 8,
  GIM: 9,
  ESBL: 20,
  BLEE: 21,
  CRE: 30,
  "Carb-R": 31,
  AmpC: 40,
  MRSA: 50,
  VRE: 51,
  "Col-R": 52
};
function normalizeResistenciaText_(texto) {
  return texto.toUpperCase().replace(/Á/g, "A").replace(/É/g, "E").replace(/Í/g, "I").replace(/Ó/g, "O").replace(/Ú/g, "U");
}
function applyCarbapenemasaTags_(u, add) {
  if (/\bKPC\b|KPC-/.test(u)) add("KPC");
  if (/\bNDM\b|NDM-/.test(u)) add("NDM");
  if (/\bVIM\b|VIM-/.test(u)) add("VIM");
  if (/\bIMP-\d|\bIMP\s*1\b|\bIMP1\b/.test(u) || /BETALACTAMASA\s+IMP/.test(u)) add("IMP");
  if (/\bOXA[- ]?48\b|OXA48\b/.test(u)) add("OXA-48");
  if (/\bOXA[- ]?(23|24|51|58)(?![0-9])\b/i.test(u)) add("OXA-otras");
  if (/\bMBL\b|METALO\s*BETA|METALOCARBAPENEMAS|METALO-?\s*BETALACTAMASA|BETALACTAMASA\s+DE\s+ZINC/.test(u)) {
    add("MBL");
  }
  if (/\bSPM\b|SPM-/.test(u)) add("SPM");
  if (/\bGIM\b|GIM-/.test(u)) add("GIM");
}
function applyCreCarbTags_(u, add, seen) {
  if (/\bCPE\b|\bCRE\b|ENTEROBACTER(I)?A\s+RESISTENTE\s+A\s+CARBAPEN|BACILO\s+CARBAPEN/.test(u)) {
    add("CRE");
  }
  if (/RESISTEN(CIA|TE)\s+.*CARBAPEN|CARBAPEN.*RESIST|NO\s+SUSCEPTIB.*CARBAPEN|ANTICARBAPEN|ANTI-?CARBAPEN|PRODUCTOR\s+DE\s+CARBAPENEMASA|PRODUCTOR(ES)?\s+CARBAPEN|DETECTO\s+CARBAPENEMASA|DETECT[OÓ]\s+CARBAPENEMASA|CARBAPENEMASA\s+DETECTAD/i.test(
    u
  )) {
    if (!seen.KPC && !seen.NDM && !seen.VIM && !seen.IMP && !seen["OXA-48"] && !seen.MBL) add("Carb-R");
  }
}
function applyBetaLactamTags_(u, add) {
  if (/\bESBL\b|BETALACTAMASAS?\s+DE\s+ESPECTRO|ESPECTRO\s+EXTENDIDO|BLEE\s*\+\s*ESBL/.test(u)) add("ESBL");
  if (/\(BLEE\)|\bBLEE\b|BETALACTAMASAS?\s*\(?BLEE\)?|PRODUCTOR\s+DE\s+BETALACTAMASAS(?!\s+DE\s+ESPECTRO)/.test(u)) {
    add("BLEE");
  }
  if (/\bAMPC\b|AMP\s*C\b|BETALACTAMASA\s+AMPC|CEPHAMYCIN/.test(u)) add("AmpC");
}
function applyStaphEnteroColTags_(u, add) {
  if (/\bMECA\b|\bMRSA\b|METICILIN(A)?\s*-?\s*RESIST|OXACILIN(A)?\s*:\s*R(?!\s*\d)/.test(u)) add("MRSA");
  if (/\bVRE\b|VANCOMICIN(A)?\s*-?\s*RESIST|ENTEROCOC.*VANCO\s*R|VANCO\s*[-–]\s*R/.test(u)) add("VRE");
  if (/COLISTIN(A)?\s*[-–:]?\s*R|POLIMIXIN(A)?\s*[-–:]?\s*R|RESIST.*COLISTIN/.test(u)) add("Col-R");
}
function extractMarcasResistenciaDesdeTexto(texto) {
  var u = normalizeResistenciaText_(texto);
  var seen = {};
  var tags = [];
  function add(tag) {
    if (!tag || seen[tag]) return;
    seen[tag] = 1;
    tags.push(tag);
  }
  applyCarbapenemasaTags_(u, add);
  applyCreCarbTags_(u, add, seen);
  applyBetaLactamTags_(u, add);
  applyStaphEnteroColTags_(u, add);
  tags.sort(function(a, b) {
    return (ORDEN_MARCA_RESISTENCIA[a] || 99) - (ORDEN_MARCA_RESISTENCIA[b] || 99);
  });
  return tags;
}
function finalizeMarcasResistencia_(marcas) {
  marcas.sort(function(a, b) {
    return (ORDEN_MARCA_RESISTENCIA[a] || 99) - (ORDEN_MARCA_RESISTENCIA[b] || 99);
  });
  if (marcas.indexOf("BLEE") !== -1) marcas = marcas.filter(function(m) {
    return m !== "ESBL";
  });
  if (marcas.some(function(m) {
    return /^(KPC|NDM|VIM|IMP|OXA-48|OXA-otras|MBL|SPM|GIM)$/.test(m);
  })) {
    marcas = marcas.filter(function(m) {
      return m !== "Carb-R";
    });
  }
  if (marcas.indexOf("CRE") !== -1) marcas = marcas.filter(function(m) {
    return m !== "Carb-R";
  });
  return marcas;
}
function detectMarcasResistenciaCultivoSlice(sliceLines) {
  var blob = sliceLines.join("\n");
  var marcas = extractMarcasResistenciaDesdeTexto(blob);
  var seen = {};
  marcas.forEach(function(m) {
    seen[m] = 1;
  });
  var inAb = false;
  for (var i = 0; i < sliceLines.length; i++) {
    var L = sliceLines[i].replace(/\*+$/g, "").trim();
    if (/^ANTIBIOGRAMA/i.test(L)) {
      inAb = true;
      continue;
    }
    if (inAb && /^MICROORGANISMO|^IDENTIFICACION/i.test(L)) {
      inAb = false;
      continue;
    }
    if (!inAb) continue;
    var p = parseInterpAntibiograma(L);
    if (!p || !p.interp) continue;
    var it = p.interp.toUpperCase();
    if (it === "ESBL" && !seen.ESBL) {
      marcas.push("ESBL");
      seen.ESBL = 1;
    }
    if (it === "BLEE" && !seen.BLEE) {
      marcas.push("BLEE");
      seen.BLEE = 1;
    }
    if (/^(KPC|NDM|VIM|IMP|MBL)$/.test(it) && !seen[it]) {
      marcas.push(it);
      seen[it] = 1;
    }
  }
  return finalizeMarcasResistencia_(marcas);
}
function compactarLineasAntibiograma(sensCrudas, abreviarFn) {
  if (!sensCrudas.length) return "";
  var rank = { R: 4, "NO SUSCEPTIBLE": 4, ESBL: 4, BLEE: 4, BLAC: 4, KPC: 4, NDM: 4, VIM: 4, IMP: 4, MBL: 4, I: 2, S: 1, POS: 1 };
  var byKey = {};
  sensCrudas.forEach(function(s) {
    var key = abreviarFn(s.med);
    if (!key) return;
    var it = String(s.interp || "").toUpperCase();
    var r = rank[it] || 0;
    if (!byKey[key] || r > byKey[key]._r) byKey[key] = { interp: it, _r: r };
  });
  var R = [], I = [], E = [], S = [];
  Object.keys(byKey).sort().forEach(function(k) {
    var it = byKey[k].interp;
    if (it === "S" || it === "POS") S.push(k);
    else if (it === "I") I.push(k);
    else if (it === "ESBL") E.push(k);
    else R.push(k);
  });
  function cap(arr, n) {
    if (!arr.length) return "";
    if (arr.length <= n) return arr.join(", ");
    return arr.slice(0, n).join(", ") + " +" + (arr.length - n);
  }
  var parts = [];
  if (R.length) parts.push("R: " + cap(R, 14));
  if (I.length) parts.push("I: " + cap(I, 8));
  if (E.length) parts.push("ESBL: " + cap(E, 8));
  if (S.length) parts.push("S: " + cap(S, 18));
  if (!parts.length) return "ATB sin interpretaciones";
  var line = "ATB " + parts.join(" | ");
  if (line.length <= 220) return line;
  return "ATB " + parts.join("\n");
}
function readGermenName_(lineasTexto, i) {
  for (var k = i + 1; k < Math.min(i + 14, lineasTexto.length); k++) {
    var cand = lineasTexto[k].replace(/\r/g, "").replace(/\*/g, "").trim();
    if (!cand) continue;
    if (/^COMENTARIO/i.test(cand)) break;
    if (/^MICROORGANISMO/i.test(cand)) break;
    if (/^ANTIBIOGRAMA/i.test(cand)) break;
    if (/^CUENTA/i.test(cand)) break;
    if (!/MALDI|IDENTIF|ESPECTROMETRIA|ESPECTRO/i.test(cand)) {
      return { germen: cand.toUpperCase(), nameEnd: k };
    }
  }
  return null;
}
function findGermenRunEnd_(lineasTexto, i, nameEnd) {
  for (var m = i + 1; m < lineasTexto.length; m++) {
    var Lm = lineasTexto[m].replace(/\r/g, "").replace(/\*+$/g, "").trim();
    if (/^MICROORGANISMO(\s|$)/i.test(Lm) && m > nameEnd) return m;
    if (/^IDENTIFICACION\s+POR\s+ESPECTROMETRIA/i.test(Lm)) return m;
  }
  return lineasTexto.length;
}
function findCultivoGermenRuns(lineasTexto) {
  var runs = [];
  for (var i = 0; i < lineasTexto.length; i++) {
    var L = lineasTexto[i].replace(/\r/g, "").replace(/\*+$/g, "").trim();
    if (!/^MICROORGANISMO(\s|$)/i.test(L)) continue;
    var named = readGermenName_(lineasTexto, i);
    if (!named) continue;
    runs.push({ germen: named.germen, i0: i, i1: findGermenRunEnd_(lineasTexto, i, named.nameEnd) });
    i = findGermenRunEnd_(lineasTexto, i, named.nameEnd) - 1;
  }
  return runs;
}
function extractCuentaKassFromLineas(sliceLines) {
  var tNorm = sliceLines.join(" ").replace(/\s+/g, " ");
  var tUpper = tNorm.toUpperCase();
  var pCuenta = tUpper.indexOf("CUENTA DE KASS");
  if (pCuenta === -1) pCuenta = tUpper.indexOf("CUENTA");
  if (pCuenta === -1) return "";
  var fragC = tNorm.substring(pCuenta, pCuenta + 110);
  var fragBeforeAb = fragC.split(/\bANTIBIOGRAMA\b/i)[0];
  var mUfc = fragBeforeAb.match(/\+?\d[\d,]*(?:\.\d+)?\s*UFC(?:\s*\/\s*M?L)?/i);
  if (mUfc) {
    return mUfc[0].replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim().toUpperCase();
  }
  var mC = fragBeforeAb.match(/([<>]=?\s?\d+(\.\d+)?\s*[A-Z%/]*)/i);
  if (mC) return mC[1].trim().toUpperCase();
  var mColonias = fragBeforeAb.match(/(\d[\d,]*\s+COLONIAS?)/i);
  if (mColonias) return mColonias[1].replace(/\s+/g, " ").trim().toUpperCase();
  for (var li = 0; li < sliceLines.length; li++) {
    var Lc = sliceLines[li].replace(/\r/g, "").replace(/\*+$/g, "").trim();
    if (!/^CUENTA/i.test(Lc)) continue;
    for (var lk = li + 1; lk < Math.min(li + 6, sliceLines.length); lk++) {
      var cand = sliceLines[lk].replace(/\r/g, "").replace(/\*/g, "").trim();
      if (!cand || cand === "*") continue;
      if (/^MICROORGANISMO|^ANTIBIOGRAMA|^COMENTARIO/i.test(cand)) break;
      return cand.replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim().toUpperCase();
    }
  }
  return "";
}
function parseSensCrudasAntibiogramaSlice(lineasAb) {
  var sensCrudas = [];
  for (var i = 0; i < lineasAb.length - 1; i++) {
    var nL = lineasAb[i], vL = lineasAb[i + 1];
    if (!nL || nL.length <= 3 || /ANTIBIOGRAMA|MICROORGANISMO|COMENTARIO:?|CUENTA|PRODUCTO|ESTADO|MUESTRA|GRAM|IDENTIFICACION|ESTUDIO\s+RESULTADO/i.test(nL)) continue;
    var parsed = parseInterpAntibiograma(vL);
    if (!parsed) {
      var lim = vL.toUpperCase();
      if (/^(S|R|I)$/.test(lim)) parsed = { mic: "", interp: lim };
    }
    if (parsed && parsed.interp) sensCrudas.push({ med: nL.toUpperCase(), mic: parsed.mic, interp: parsed.interp });
  }
  return sensCrudas;
}
function parseCuentaFromCultivoChunkLines(lines) {
  if (!lines || !lines.length) return "";
  for (var i = 0; i < lines.length; i++) {
    var m = String(lines[i] == null ? "" : lines[i]).replace(/\*+$/g, "").trim().match(/^Cuenta:\s*(.+)$/i);
    if (m) {
      return m[1].replace(/\s+/g, " ").replace(/\s*\/\s*/g, "/").trim();
    }
  }
  return "";
}

// public/js/labs-cultivo-abbr.mjs
var ATB_ABBR_RULES = [
  [/PIPERACILINA|PIP\/TAZ/, "PIP/TAZO"],
  [/TRIMET|TMP\/SMX|TRIMET\/SULFA/, "TMP/SMX"],
  [/AMP\S*\/\s*SULB|AMPICILINA.*SULBACTAM|AMP\/SULB/, "AMP-SULB"],
  [/GENT\.?\s*SINERG|SINERG/, "GENT-SIN"],
  [/GENTAMICINA/, "GENT"],
  [/AMIKACINA/, "AMIK"],
  [/TOBRAMICINA/, "TOBRA"],
  [/TETRACICLINA/, "TETRA"],
  [/NITROFURANTOINA/, "NITRO"],
  [/CIPROFLOXACINA/, "CIPRO"],
  [/LEVOFLOXACINA/, "LVX"],
  [/MEROPENEM/, "MERO"],
  [/ERTAPENEM/, "ERTA"],
  [/IMIPENEM/, "IMI"],
  [/CEFTRIAXONA/, "CFTX"],
  [/CEFOTAXIMA/, "CTX"],
  [/CEFOXITINA/, "CFXN"],
  [/CEFAZOLINA/, "CFZ"],
  [/CEFEPIMA/, "FEP"],
  [/CEFTAZIDIM.*AVIBACT|AVIBACTAM/, "CAZ-AVI"],
  [/CEFTAZIDIM|CEFTAZIDIMA/, "CAZ"],
  [/DAPTOMICINA/, "DAPTO"],
  [/LINEZOLID/, "LINEZ"],
  [/VANCOMICINA/, "VANCO"],
  [/PENICILINA|BENZILPENICILINA/, "PEN"],
  [/AMPICILINA/, "AMP"],
  [/CLINDAMICINA/, "CLINDA"]
];
function abreviarAbAtb_(n) {
  n = String(n || "").toUpperCase().trim();
  for (var i = 0; i < ATB_ABBR_RULES.length; i++) {
    if (ATB_ABBR_RULES[i][0].test(n)) return ATB_ABBR_RULES[i][1];
  }
  if (/AMPICILINA/.test(n) && !/SULB/.test(n)) return "AMP";
  var base = n.replace(/\bSODICO\b|\bSODIUM\b|\bDISODICO\b/g, "").trim().split("(")[0].trim().split(/\s+/)[0];
  return base.length > 10 ? base.substring(0, 10) : base;
}

// public/js/labs-cultivo-atb.mjs
function isCultivoChromeBodyLine_(line) {
  var t = String(line || "").trim();
  if (!t) return true;
  if (/^USER\b/i.test(t)) return true;
  if (/\bLabo\s*-?\d+/i.test(t) && /\b(DJEG|UANL|Campo|Feme)\b/i.test(t)) return true;
  return false;
}
function formatCultivoCondensedForCopy(chunkText, _studyDateLine) {
  var lines = [];
  var chunkLines = String(chunkText || "").trim().split(/\n/).map(function(l) {
    return l.trim();
  }).filter(function(l) {
    return l && !isCultivoChromeBodyLine_(l);
  });
  if (!chunkLines.length) return lines.join("\n");
  var head = chunkLines[0].replace(/\s*·\s*Preliminar\b/gi, "").replace(/\s*·\s*$/g, "").replace(/\s{2,}/g, " ").trim();
  if (head) lines.push(head);
  for (var i = 1; i < chunkLines.length; i++) {
    if (/^ATB\b/i.test(chunkLines[i]) || /^Cuenta:/i.test(chunkLines[i])) {
      lines.push(chunkLines[i]);
    }
  }
  return lines.join("\n");
}
function classifyAtbInterp(itRaw) {
  var u = String(itRaw || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (u === "S" || u === "POS" || u === "SENSIBLE" || u === "SUSCEPTIBLE") return "s";
  if (u === "I" || u === "IND" || u.indexOf("INDETER") !== -1 || u.indexOf("INTERMED") !== -1) {
    return "i";
  }
  return "r";
}
function extractMicSortKey(micRaw) {
  var t = String(micRaw || "").trim().replace(/\s+/g, " ").replace(/,/g, ".").replace(/\u2264/g, "<=").replace(/\u2265/g, ">=");
  if (!t) return NaN;
  var m = t.match(/(?:<=|>=|<|>|=)?\s*(\d+(?:\.\d+)?)/);
  if (m) return parseFloat(m[1]);
  return NaN;
}
function sortSensByGradeInBucket(items, bucket) {
  var arr = items.slice();
  arr.sort(function(a, b) {
    var ka = extractMicSortKey(a.mic);
    var kb = extractMicSortKey(b.mic);
    var na = isNaN(ka);
    var nb = isNaN(kb);
    if (na && nb) {
      return String(a.med || "").localeCompare(String(b.med || ""), "es", { sensitivity: "base" });
    }
    if (na) return 1;
    if (nb) return -1;
    if (bucket === "r") {
      if (kb !== ka) return kb - ka;
      return String(a.med || "").localeCompare(String(b.med || ""), "es", { sensitivity: "base" });
    }
    if (ka !== kb) return ka - kb;
    return String(a.med || "").localeCompare(String(b.med || ""), "es", { sensitivity: "base" });
  });
  return arr;
}
function formatAtbDetailRowHtml(s) {
  var med = String(s.med || "").trim();
  var mic = String(s.mic || "").trim();
  var itTrim = String(s.interp || "").trim();
  var medEl = '<span class="atb-ris-drug">' + escTxt(med || "\u2014") + "</span>";
  var chunks = [];
  if (mic) {
    chunks.push(
      '<span class="atb-ris-mic"><span class="atb-ris-mic-lbl">CMI</span> ' + escTxt(mic) + "</span>"
    );
  }
  if (itTrim) {
    chunks.push(
      '<span class="atb-ris-int atb-ris-int--' + escTxt(classifyAtbInterp(itTrim)) + '">' + escTxt(itTrim) + "</span>"
    );
  }
  var meta = chunks.length > 0 ? '<span class="atb-ris-meta">' + chunks.join('<span class="atb-ris-meta-sep" aria-hidden="true">\xB7</span>') + "</span>" : "";
  return '<li class="atb-ris-detail-item"><div class="atb-ris-detail-line">' + medEl + (meta ? meta : "") + "</div></li>";
}
function buildAtbRisSummaryHtml(sensCrudas) {
  if (!sensCrudas || !sensCrudas.length) return "";
  var buckets = { r: [], i: [], s: [] };
  sensCrudas.forEach(function(s) {
    buckets[classifyAtbInterp(s.interp)].push(s);
  });
  var order = [
    { key: "r", label: "R", panelTitle: "Resistencias" },
    { key: "i", label: "I", panelTitle: "Indeterminado" },
    { key: "s", label: "S", panelTitle: "Sensible" }
  ];
  var wraps = [];
  order.forEach(function(o) {
    var list = buckets[o.key];
    if (!list.length) return;
    var sorted = sortSensByGradeInBucket(list, o.key);
    var items = sorted.map(formatAtbDetailRowHtml).join("");
    wraps.push(
      '<span class="cult-atb-ris-chip-wrap"><span class="atb-chip atb-chip--' + o.key + '" tabindex="0" role="button">' + escTxt(o.label) + '</span><div class="atb-ris-hover-panel atb-ris-hover-panel--' + o.key + '" role="region" aria-label="' + escTxt(o.panelTitle) + '"><div class="atb-ris-panel-head">' + escTxt(o.panelTitle) + '</div><ul class="atb-ris-detail-list">' + items + "</ul></div></span>"
    );
  });
  return '<div class="cult-atb-ris-summary"><div class="cult-atb-ris-chips" role="group" aria-label="Antibiograma (R / I / S); coloca el cursor sobre cada letra para el detalle">' + wraps.join("") + "</div></div>";
}
function extractSensCrudasForGermFromSource(sourceText, germQuery) {
  var q = String(germQuery || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (!q || q === "\u2014" || q === "NEGATIVO") return null;
  var lineasTexto = String(sourceText || "").split("\n").map(function(l) {
    return l.replace(/\r/g, "");
  });
  var runs = findCultivoGermenRuns(lineasTexto);
  function matches(run) {
    var g2 = String(run.germen || "").replace(/\s+/g, " ").trim().toUpperCase();
    if (!g2) return false;
    if (g2 === q || q === g2) return true;
    if (q.indexOf(g2) !== -1 || g2.indexOf(q) !== -1) return true;
    var qTok = q.split(/\s+/).filter(Boolean)[0] || "";
    var gTok = g2.split(/\s+/).filter(Boolean)[0] || "";
    if (qTok.length > 3 && gTok.length > 3 && (qTok === gTok || q.indexOf(gTok) === 0 || g2.indexOf(qTok) === 0)) return true;
    return false;
  }
  for (var ri = 0; ri < runs.length; ri++) {
    if (!matches(runs[ri])) continue;
    var sliceLines = lineasTexto.slice(runs[ri].i0, runs[ri].i1);
    var subNorm = sliceLines.join("\n");
    var idxAbLoc = subNorm.toUpperCase().indexOf("ANTIBIOGRAMA");
    if (idxAbLoc === -1) return null;
    var lineasAb = subNorm.substring(idxAbLoc).split("\n").map(function(l) {
      return l.replace(/\r/g, "").replace(/\*+/g, "").trim();
    });
    return parseSensCrudasAntibiogramaSlice(lineasAb);
  }
  return null;
}
function isParsedCultivoHeaderLine(t) {
  var s = String(t || "").trim();
  if (!s) return false;
  if (/^CULTIVO\b/i.test(s)) return true;
  if (/^(UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO)\b/i.test(s)) return true;
  if (/^TINCION\s+DE\s+GRAM/i.test(s)) return true;
  if (/^CATETER\b/i.test(s)) return true;
  if (/^BACILOSCOPIA\b/i.test(s)) return true;
  if (/^CULTIVO\s+DE\s+MICOBACTERIAS\b/i.test(s)) return true;
  if (/^(SECRECION|LIQUIDO|ASPIRADO|ABSCESO|BRONCOALVEOLAR)\b/i.test(s)) return true;
  return /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ()\s/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i.test(s);
}

// public/js/labs-cultivo.mjs
function isCultivoReportText_(tUpper) {
  return tUpper.indexOf("HEMOCULTIVO") !== -1 || tUpper.indexOf("CULTIVO") !== -1 || tUpper.indexOf("MICROORGANISMO") !== -1 || tUpper.indexOf("MYCOBACTERIAS") !== -1 || tUpper.indexOf("BACILOSCOPIA") !== -1;
}
function parseCultivoFecha_(tNorm) {
  var mFecha = tNorm.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  return mFecha ? mFecha[1].padStart(2, "0") + "/" + mFecha[2].padStart(2, "0") : "N/D";
}
function buildGermenChunk_(run, sliceLines, sitio, fechaC, reportePreliminar) {
  var subNorm = sliceLines.join("\n");
  var idxAbLoc = subNorm.toUpperCase().indexOf("ANTIBIOGRAMA");
  var head = sitio + " " + fechaC + ": " + run.germen;
  var headTags = [];
  if (reportePreliminar) headTags.push("Preliminar");
  detectMarcasResistenciaCultivoSlice(sliceLines).forEach(function(m) {
    if (headTags.indexOf(m) === -1) headTags.push(m);
  });
  if (headTags.length) head += " \xB7 " + headTags.join(" \xB7 ");
  var chunk = head;
  if (idxAbLoc !== -1) {
    var lineasAb = subNorm.substring(idxAbLoc).split("\n").map(function(l) {
      return l.replace(/\r/g, "").replace(/\*/g, "").trim();
    });
    var abCompact = compactarLineasAntibiograma(parseSensCrudasAntibiogramaSlice(lineasAb), abreviarAbAtb_);
    if (abCompact) chunk += "\n" + abCompact;
  }
  var cuentaRun = extractCuentaKassFromLineas(sliceLines);
  if (cuentaRun) chunk += "\nCuenta: " + cuentaRun;
  return chunk;
}
function parseCultivoGermenRuns_(germenRuns, lineasTexto, sitio, fechaC, reportePreliminar) {
  var chunks = [];
  for (var ri = 0; ri < germenRuns.length; ri++) {
    var run = germenRuns[ri];
    chunks.push(buildGermenChunk_(run, lineasTexto.slice(run.i0, run.i1), sitio, fechaC, reportePreliminar));
  }
  return chunks.join("\n\n");
}
function parseCultivoNegativo_(tNorm, tUpper, sitio, fechaC) {
  if (tNorm.toUpperCase().indexOf("BACILOSCOPIA") !== -1 && tNorm.toUpperCase().indexOf("POSITIVO") !== -1) {
    var mPos = tNorm.match(/BACILOSCOPIA[^.\n]*POSITIVO[^\n.]*/i);
    return "BACILOSCOPIA " + fechaC + ": " + (mPos ? mPos[0].trim() : "BACILOSCOPIA POSITIVA");
  }
  var estado = "NEGATIVO";
  var pEst = tUpper.indexOf("ESTADO");
  if (pEst !== -1) {
    var fEst = tNorm.substring(pEst + 17, pEst + 80).split("*")[1] || tNorm.substring(pEst + 17, pEst + 80);
    estado = fEst.split("MICRO")[0].split("PRODUCTO")[0].trim().toUpperCase();
  }
  return sitio + " " + fechaC + ": " + estado;
}
function parseCultivo_(textoBruto, tNorm) {
  var tUpper = tNorm.toUpperCase();
  if (!isCultivoReportText_(tUpper)) return "";
  var fechaC = parseCultivoFecha_(tNorm);
  var lineasTexto = textoBruto.split("\n").map(function(l) {
    return l.replace(/\r/g, "");
  });
  var germenRuns = findCultivoGermenRuns(lineasTexto);
  var mycoOut = parseMycobacteriasStudies_(lineasTexto, fechaC);
  if (mycoOut && !germenRuns.length) return mycoOut;
  var sitio = buildCultivoTipoDisplay(detectTipoCultivoLine(lineasTexto), detectMuestraDesdeProducto(lineasTexto));
  var reportePreliminar = /REPORTE\s+PRELIMINAR/i.test(lineasTexto.join("\n"));
  if (germenRuns.length) {
    return parseCultivoGermenRuns_(germenRuns, lineasTexto, sitio, fechaC, reportePreliminar);
  }
  return parseCultivoNegativo_(tNorm, tUpper, sitio, fechaC);
}

// public/js/labs-egfr.mjs
function normalizePatientSexoForEgfr(sexo) {
  var s = String(sexo == null ? "" : sexo).trim().toUpperCase();
  if (!s) return "";
  if (s === "F" || s === "FEMENINO" || s === "MUJER" || s === "FEMALE") return "F";
  if (s === "M" || s === "MASCULINO" || s === "HOMBRE" || s === "MALE") return "M";
  return "";
}
function patientEdadPartsForEgfr(patient) {
  if (!patient) return { edadRaw: "", edadUnidad: "a\xF1os" };
  var raw = String(patient.edad == null ? "" : patient.edad).trim();
  if (!raw) return { edadRaw: "", edadUnidad: "a\xF1os" };
  var m = raw.match(/^(\d+)\s*(años|meses|días|dias|semanas)?/i);
  if (!m) {
    var n = parseInt(raw, 10);
    return { edadRaw: isFinite(n) ? String(n) : "", edadUnidad: "a\xF1os" };
  }
  var unit = (m[2] || "a\xF1os").toLowerCase();
  if (unit === "dias") unit = "d\xEDas";
  return { edadRaw: m[1], edadUnidad: unit };
}
function buildEgfrPatientCtx(hdrEdadRaw, hdrEdadUnidad, chartPatient) {
  if (!chartPatient) return null;
  var sexo = normalizePatientSexoForEgfr(chartPatient.sexo);
  if (!sexo) return null;
  var edadParts = patientEdadPartsForEgfr(chartPatient);
  return {
    edad: edadParts.edadRaw || hdrEdadRaw || "",
    edadUnidad: edadParts.edadRaw ? edadParts.edadUnidad : hdrEdadUnidad || "a\xF1os",
    sexo
  };
}
function ageYearsFromLabDemographics(edadRaw, edadUnidad) {
  var n = parseInt(String(edadRaw == null ? "" : edadRaw).trim(), 10);
  if (!isFinite(n) || n < 0) return null;
  var u = String(edadUnidad || "a\xF1os").toLowerCase();
  if (u === "meses") return n / 12;
  if (u === "d\xEDas" || u === "dias") return n / 365.25;
  if (u === "semanas") return n / 52.143;
  return n;
}
function computeEgfrCkdEpi2021Creatinine(scrMgDl, ageYears, isFemale) {
  var scr = typeof scrMgDl === "number" ? scrMgDl : parseFloat(String(scrMgDl || "").replace(/,/g, "."));
  if (!isFinite(scr) || scr <= 0) return null;
  var age = Number(ageYears);
  if (!isFinite(age) || age < 18 || age > 120) return null;
  var k = isFemale ? 0.7 : 0.9;
  var alpha = isFemale ? -0.241 : -0.302;
  var scrK = scr / k;
  var minTerm = Math.min(scrK, 1);
  var maxTerm = Math.max(scrK, 1);
  var egfr = 142 * Math.pow(minTerm, alpha) * Math.pow(maxTerm, -1.2) * Math.pow(0.9938, age) * (isFemale ? 1.012 : 1);
  if (!isFinite(egfr) || egfr <= 0) return null;
  return egfr;
}

// public/js/labs-chemistry.mjs
var ESC_MERGE_FIELD_ORDER = ["Na", "Cl", "K", "Ca", "F", "Mg"];
var PFH_MERGE_FIELD_ORDER = [
  "Alb",
  "AST",
  "ALT",
  "FA",
  "GGT",
  "Prot",
  "BT",
  "BD",
  "BI",
  "LDH",
  "Amil"
];
var LIPASA_MERGE_FIELD_ORDER = ["Lip"];
var PAIR_VALUE_RE_ = /^(-?\d+(?:[.,]\d+)?%?)\*?$|^---$/;
function extraerProcalcitonina_(texto) {
  var defaultRange = { valor: "---", min: 0, max: 0.05 };
  if (!texto) return defaultRange;
  var t = texto.toUpperCase();
  var positions = [];
  var start = 0;
  while (true) {
    var p = t.indexOf("PROCALCITONINA", start);
    if (p === -1) break;
    positions.push(p);
    start = p + "PROCALCITONINA".length;
  }
  if (!positions.length) return defaultRange;
  for (var i = positions.length - 1; i >= 0; i--) {
    var pos = positions[i] + "PROCALCITONINA".length;
    var sub = texto.substring(pos, pos + 220);
    var mVal = sub.match(/(-?\d+[.,]?\d*)/);
    if (!mVal) continue;
    var valor = mVal[1];
    var rangeM = sub.match(/ADULTO[^0-9<]*<\s*=?\s*(\d+[.,]?\d*)/i);
    var max = rangeM ? parseFloat(rangeM[1].replace(",", ".")) : 0.05;
    return { valor, min: 0, max };
  }
  return defaultRange;
}
function fmtSuero_(data, fieldKey, priorRefs) {
  return fmtLabRanged_(data, fieldKey, priorRefs);
}
function appendQsPair_(p, key, val) {
  if (val !== "---") p.push(key, val);
}
function appendEgfrIfEligible_(p, crData, patientCtx) {
  if (!patientCtx) return;
  var ageY = ageYearsFromLabDemographics(patientCtx.edad, patientCtx.edadUnidad);
  var sexo = patientCtx.sexo;
  if (ageY == null || ageY < 18 || sexo !== "M" && sexo !== "F") return;
  var scrNum = toNum_(crData.valor);
  if (scrNum == null || scrNum <= 0) return;
  var egfr = computeEgfrCkdEpi2021Creatinine(scrNum, ageY, sexo === "F");
  if (egfr != null) p.push("eTFG", String(Math.round(egfr)));
}
function extractQsFormatted_(texto, priorRefs) {
  var crData = extraerConRangoSuero(["CREATININA EN SANGRE", "CREATININA"], texto);
  return {
    Glu: fmtSuero_(extraerConRangoSuero(["GLUCOSA EN SANGRE", "GLUCOSA EN", "GLUCOSA"], texto), "Glu", priorRefs),
    crData,
    Cr: fmtSuero_(crData, "Cr", priorRefs),
    BUN: fmtSuero_(
      extraerConRangoSuero(["NITROGENO DE LA UREA EN SANGRE", "NITROGENO DE LA UREA", "UREA"], texto),
      "BUN",
      priorRefs
    ),
    PCR: fmtSuero_(extraerConRangoSuero(["PROTEINA C REACTIVA", "PROTE\xCDNA C REACTIVA"], texto), "PCR", priorRefs),
    PCT: fmtSuero_(extraerProcalcitonina_(texto), "PCT", priorRefs),
    AU: fmtSuero_(extraerConRangoSuero(["ACIDO URICO EN SANGRE", "ACIDO URICO", "\xC1CIDO \xDARICO"], texto), "AU", priorRefs),
    COL: fmtSuero_(extraerConRangoSuero(["COLESTEROL"], texto), "COL", priorRefs),
    HDL: fmtSuero_(extraerConRangoSuero(["COLESTEROL HDL", "HDL COLESTEROL"], texto), "HDL", priorRefs),
    LDL: fmtSuero_(extraerConRangoSuero(["COLESTEROL LDL", "LDL COLESTEROL"], texto), "LDL", priorRefs),
    VLDL: fmtSuero_(extraerConRangoSuero(["VLDL"], texto), "VLDL", priorRefs),
    TGL: fmtSuero_(extraerConRangoSuero(["TRIGLICERIDOS", "TRIGLIC\xC9RIDOS"], texto), "TGL", priorRefs),
    IA: fmtSuero_(extraerIndiceAterogenico_(texto), "IA", priorRefs),
    CTHDL: fmtSuero_(
      extraerConRangoSuero(["COCIENTE COL.TOT/HDL", "COCIENTE COL.TOT / HDL", "COCIENTE COL TOT/HDL"], texto),
      "CTHDL",
      priorRefs
    ),
    VSG: fmtSuero_(extraerConRangoSuero(["VSG ", "VELOCIDAD DE SEDIMENTACION"], texto), "VSG", priorRefs),
    CPK: fmtSuero_(
      extraerConRangoSuero(
        [
          "CPK CREATIN FOSFO QUINASA",
          "CPK CREATINA FOSFOQUINASA",
          "CREATINA FOSFOQUINASA",
          "CREATIN FOSFO QUINASA",
          "CREATINA KINASA",
          "CK TOTAL",
          "CPK TOTAL",
          "CPK "
          // No usar 'CK ' solo: coincide con «SHOCK» en ubicación.
        ],
        texto
      ),
      "CPK",
      priorRefs
    )
  };
}
function parseQS_(texto, patientCtx, priorRefs) {
  var q = extractQsFormatted_(texto, priorRefs);
  var vals = [
    q.Glu,
    q.Cr,
    q.BUN,
    q.PCR,
    q.PCT,
    q.AU,
    q.COL,
    q.HDL,
    q.LDL,
    q.VLDL,
    q.TGL,
    q.IA,
    q.CTHDL,
    q.VSG,
    q.CPK
  ];
  if (vals.every(function(v) {
    return v === "---";
  })) {
    return "";
  }
  var p = ["QS"];
  appendQsPair_(p, "Glu", q.Glu);
  if (q.Cr !== "---") {
    p.push("Cr", q.Cr);
    appendEgfrIfEligible_(p, q.crData, patientCtx);
  }
  appendQsPair_(p, "BUN", q.BUN);
  appendQsPair_(p, "PCR", q.PCR);
  appendQsPair_(p, "PCT", q.PCT);
  appendQsPair_(p, "AU", q.AU);
  appendQsPair_(p, "COL", q.COL);
  appendQsPair_(p, "HDL", q.HDL);
  appendQsPair_(p, "LDL", q.LDL);
  appendQsPair_(p, "VLDL", q.VLDL);
  appendQsPair_(p, "TGL", q.TGL);
  appendQsPair_(p, "IA", q.IA);
  appendQsPair_(p, "CTHDL", q.CTHDL);
  appendQsPair_(p, "VSG", q.VSG);
  appendQsPair_(p, "CPK", q.CPK);
  return p[0] + "	" + p.slice(1).join(" ");
}
function parseESC_(texto, priorRefs) {
  var naData = extraerConRangoSuero(["SODIO"], texto);
  if (naData.valor === "---") return "";
  var clData = extraerConRangoSuero(["CLORO"], texto);
  var kData = extraerConRangoSuero(["POTASIO"], texto);
  var caData = extraerConRangoSuero(["CALCIO EN SUERO", "CALCIO"], texto);
  var fData = extraerConRangoSuero(["FOSFORO EN SANGRE", "FOSFORO", "F\xD3SFORO"], texto);
  var mgData = extraerConRangoSuero(["MAGNESIO"], texto);
  var Na = fmtLabRanged_(naData, "Na", priorRefs);
  var Cl = fmtLabRanged_(clData, "Cl", priorRefs);
  var K = fmtLabRanged_(kData, "K", priorRefs);
  var Ca = fmtLabRanged_(caData, "Ca", priorRefs);
  var F = fmtLabRanged_(fData, "F", priorRefs);
  var Mg = fmtLabRanged_(mgData, "Mg", priorRefs);
  var p = ["ESC"];
  p.push("Na", Na);
  if (Cl !== "---") p.push("Cl", Cl);
  if (K !== "---") p.push("K", K);
  if (Ca !== "---") p.push("Ca", Ca);
  if (F !== "---") p.push("F", F);
  if (Mg !== "---") p.push("Mg", Mg);
  return p[0] + "	" + p.slice(1).join(" ");
}
function parsePFH_(tNorm, priorRefs) {
  var albData = extraerConRangoSuero(["ALBUMINA"], tNorm);
  var astData = extraerConRango(["AST(ASPARTATO AMINOTRANSFERASA)", "AST "], tNorm);
  var altData = extraerConRango(["ALT ALANIN AMINO TRANSFERASA", "ALT "], tNorm);
  var alpData = extraerConRango(["ALP FOSFATASA ALCALINA", "FOSFATASA ALCALINA"], tNorm);
  var ggtData = extraerConRango(["GGT", "GAMA GLUTAMIL TRANSFERASA", "GAMMA GLUTAMIL TRANSFERASA"], tNorm);
  var protData = extraerConRangoSuero(["PROTEINAS TOTALES", "PROTE\xCDNAS TOTALES"], tNorm);
  var btData = extraerConRango(["BILIRRUBINA TOTAL"], tNorm);
  var bdData = extraerConRango(["BILIRRUBINA DIRECTA"], tNorm);
  var biData = extraerConRango(["BILIRRUBINA INDIRECTA"], tNorm);
  var ldhData = extraerConRango(
    ["LDH DESHIDROGENASA LACTICA", "LDH DESHIDROGENASA LAC", "LDH "],
    tNorm
  );
  var amilData = extraerConRango(["AMILASA SERICA", "AMILASA"], tNorm);
  var Alb = fmtLabRanged_(albData, "Alb", priorRefs);
  var AST = fmtLabRanged_(astData, "AST", priorRefs);
  var ALT = fmtLabRanged_(altData, "ALT", priorRefs);
  var FA = fmtLabRanged_(alpData, "FA", priorRefs);
  var GGT = fmtLabRanged_(ggtData, "GGT", priorRefs);
  var Prot = fmtLabRanged_(protData, "Prot", priorRefs);
  var BT = fmtLabRanged_(btData, "BT", priorRefs);
  var BD = fmtLabRanged_(bdData, "BD", priorRefs);
  var BI = fmtLabRanged_(biData, "BI", priorRefs);
  var LDH = fmtLabRanged_(ldhData, "LDH", priorRefs);
  var Amil = fmtLabRanged_(amilData, "Amil", priorRefs);
  if ([Alb, AST, ALT, FA, GGT, Prot, BT, BD, BI, LDH, Amil].every(function(v) {
    return v === "---";
  })) return "";
  var p = ["PFHs"];
  if (Alb !== "---") p.push("Alb", Alb);
  if (AST !== "---") p.push("AST", AST);
  if (ALT !== "---") p.push("ALT", ALT);
  if (FA !== "---") p.push("FA", FA);
  if (GGT !== "---") p.push("GGT", GGT);
  if (Prot !== "---") p.push("Prot", Prot);
  if (BT !== "---") p.push("BT", BT);
  if (BD !== "---") p.push("BD", BD);
  if (BI !== "---") p.push("BI", BI);
  if (LDH !== "---") p.push("LDH", LDH);
  if (Amil !== "---") p.push("Amil", Amil);
  return p[0] + "	" + p.slice(1).join(" ");
}
function parseLipasa_(texto, priorRefs) {
  var lipData = extraerConRango(["LIPASA SERICA", "LIPASA"], texto);
  var Lip = fmtLabRanged_(lipData, "Lip", priorRefs);
  if (Lip === "---") return "";
  return "LIPASA	Lip " + Lip;
}
function pairTokenScore_(val) {
  var s = String(val == null ? "" : val);
  var score = s.length;
  if (s.indexOf("*") >= 0) score += 5;
  if (/\d/.test(s)) score += 2;
  return score;
}
function ingestTabPairBody_(body, into) {
  var tokens = String(body || "").trim().split(/\s+/).filter(Boolean);
  var i = 0;
  while (i < tokens.length) {
    var label = tokens[i];
    var next = tokens[i + 1];
    if (!label || next == null) {
      i += 1;
      continue;
    }
    if (!PAIR_VALUE_RE_.test(next)) {
      i += 1;
      continue;
    }
    var key = String(label).replace(/:$/, "");
    var score = pairTokenScore_(next);
    var prev = into[key];
    if (!prev || score > prev.score) into[key] = { val: next, score };
    i += 2;
  }
}
function mergeTabPairResLabRows_(rows, sectionRe, preferredOrder) {
  var list = (rows || []).map(function(r) {
    return String(r == null ? "" : r).trim();
  }).filter(function(s) {
    return s && sectionRe.test(s);
  });
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  var header = list[0].split(/\t/)[0] || list[0].split(/\s/)[0] || "";
  var byKey = /* @__PURE__ */ Object.create(null);
  list.forEach(function(row) {
    var tab = row.indexOf("	");
    var body = tab >= 0 ? row.slice(tab + 1) : row.replace(sectionRe, "").trim();
    if (tab >= 0) header = row.slice(0, tab).trim() || header;
    ingestTabPairBody_(body, byKey);
  });
  var keys = Object.keys(byKey);
  if (!keys.length) return list[list.length - 1];
  var order = preferredOrder || [];
  var rank = /* @__PURE__ */ Object.create(null);
  order.forEach(function(k, i) {
    rank[k] = i;
  });
  keys.sort(function(a, b) {
    var ra = Object.prototype.hasOwnProperty.call(rank, a) ? rank[a] : 9999;
    var rb = Object.prototype.hasOwnProperty.call(rank, b) ? rank[b] : 9999;
    if (ra !== rb) return ra - rb;
    return String(a).localeCompare(String(b), "es");
  });
  var parts = [];
  keys.forEach(function(k) {
    parts.push(k, byKey[k].val);
  });
  return header + "	" + parts.join(" ");
}
function mergeQsResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^QS\b/i, QS_SOME_TREND_ORDER);
}
function mergeEscResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^ESC\b/i, ESC_MERGE_FIELD_ORDER);
}
function mergePfhResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^PFHS?\b/i, PFH_MERGE_FIELD_ORDER);
}
function mergeLipasaResLabRows_(rows) {
  return mergeTabPairResLabRows_(rows, /^LIPASA\b/i, LIPASA_MERGE_FIELD_ORDER);
}

// public/js/labs-troponin.mjs
var TROPONINA_HS_NORMAL_MAX_NG_L = 34;
var TROPONINA_TEST_NAMES = [
  "TROPONINA I (ALTA SENSIBILIDAD)",
  "HS TNL O TROPONINA I",
  "HSTNL O TROPONINA I",
  "HSTNL O TROPONINA",
  "TROPONINA I",
  "TROPONINA"
];
function troponinaQualFromSub_(sub) {
  if (/INDETERMINADO/i.test(sub)) return "indet";
  if (/POSITIVO/i.test(sub)) return "pos";
  if (/NEGATIVO/i.test(sub)) return "neg";
  return "";
}
function troponinaRefsFromHit_(hit) {
  if (hit.max != null && hit.min != null && hit.max > hit.min) {
    return { min: hit.min, max: hit.max };
  }
  return { min: 0, max: TROPONINA_HS_NORMAL_MAX_NG_L };
}
function formatTnIDisplay_(valorStr, qual, minRef, maxRef) {
  var out = fmt(marcarSegunRango(valorStr, minRef, maxRef));
  var v = parseFloat(String(valorStr).replace(",", "."));
  var flagged = qual === "indet" || qual === "pos" || isFinite(v) && (v > maxRef || v < minRef);
  if (flagged && out !== "---" && !String(out).endsWith("*")) out += "*";
  return out;
}
function parseTnINum_(token) {
  var m = String(token || "").match(/^([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}
function troponinaDeltaPct_(v1, v2) {
  if (!isFinite(v1) || !isFinite(v2) || v1 === 0) return null;
  return (v2 - v1) / v1 * 100;
}
function formatTroponinaDeltaPct_(pct) {
  if (pct == null || !isFinite(pct)) return "";
  var rounded = Math.round(pct * 10) / 10;
  return (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)) + "%";
}
function extractAllTroponinaFromText_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return [];
  var texto = textoBruto.replace(/\r/g, "");
  var tUp = texto.toUpperCase();
  var hits = [];
  TROPONINA_TEST_NAMES.forEach(function(nombre) {
    var nameUp = nombre.toUpperCase();
    var start = 0;
    while (true) {
      var idx = tUp.indexOf(nameUp, start);
      if (idx === -1) break;
      var sub = texto.substring(idx, idx + 320);
      var subText = texto.substring(idx + nameUp.length, idx + nameUp.length + 220);
      var mValor = subText.match(/(-?\d+[.,]?\d*)/);
      if (mValor) {
        var mRango = subText.match(/(\d+[.,]?\d*)\s*-\s*(\d+[.,]?\d*)/);
        hits.push({
          valor: mValor[1],
          min: mRango ? parseFloat(mRango[1].replace(",", ".")) : null,
          max: mRango ? parseFloat(mRango[2].replace(",", ".")) : null,
          qual: troponinaQualFromSub_(sub),
          index: idx
        });
      }
      start = idx + nameUp.length;
    }
  });
  hits.sort(function(a, b) {
    return a.index - b.index;
  });
  var deduped = [];
  hits.forEach(function(h) {
    var overlap = deduped.find(function(prev) {
      return Math.abs(prev.index - h.index) < 100 && prev.valor === h.valor;
    });
    if (!overlap) deduped.push(h);
  });
  return deduped;
}
function buildTroponinaResLabLine_(values) {
  var list = (values || []).filter(function(v) {
    return v && v.display && v.display !== "---";
  });
  if (!list.length) return "";
  if (list.length === 1) {
    return "TROP	TnI " + list[0].display;
  }
  var v1 = list[0];
  var v2 = list[list.length - 1];
  var pct = troponinaDeltaPct_(v1.raw, v2.raw);
  var delta = formatTroponinaDeltaPct_(pct);
  var body = "TnI1 " + v1.display + " TnI2 " + v2.display;
  if (delta) body += " \u0394% " + delta;
  return "TROP	" + body;
}
function parseTnIDisplayTokensFromResLabRow_(row) {
  var s = String(row || "");
  if (!/^TROP\b/i.test(s.trim())) return [];
  var out = [];
  var re = /\bTnI(\d?)\s+([\d.]+\*?)/gi;
  var m;
  while (m = re.exec(s)) {
    out.push({ display: m[2], raw: parseTnINum_(m[2]) });
  }
  return out;
}
function mergeTroponinaResLabRows_(rows) {
  var tokens = [];
  (rows || []).forEach(function(row) {
    parseTnIDisplayTokensFromResLabRow_(row).forEach(function(tok) {
      tokens.push(tok);
    });
  });
  if (!tokens.length) return "";
  if (tokens.length === 1) return "TROP	TnI " + tokens[0].display;
  return buildTroponinaResLabLine_([tokens[0], tokens[tokens.length - 1]]);
}
function normalizeTropTrendFields_(row) {
  if (!row || typeof row !== "object") return row;
  if (row.TnI != null && row.TnI1 == null) row.TnI1 = row.TnI;
  delete row.TnI;
  delete row["\u0394%"];
  delete row.dTnI;
  return row;
}
function parseTroponina_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf("TROPONINA") === -1 && tUp.indexOf("HSTNL") === -1 && tUp.indexOf("HS TNL") === -1) {
    return "";
  }
  var hits = extractAllTroponinaFromText_(textoBruto);
  if (!hits.length) return "";
  var values = hits.map(function(hit) {
    var refs = troponinaRefsFromHit_(hit);
    return {
      display: formatTnIDisplay_(hit.valor, hit.qual, refs.min, refs.max),
      raw: parseFloat(String(hit.valor).replace(",", "."))
    };
  });
  if (values.length === 1) {
    return buildTroponinaResLabLine_(values);
  }
  return buildTroponinaResLabLine_([values[0], values[values.length - 1]]);
}

// public/js/labs-grupo-sangre.mjs
function hasGrupoSangreMarkers_(textoBruto) {
  return /GRUPO\s+SANGU[IÍ]NEO/i.test(textoBruto) || /COOMBS\s+DIRECTO/i.test(textoBruto) || /COOMBS\s+INDIRECTO/i.test(textoBruto);
}
function normalizeGrupoRh_(raw) {
  var s = String(raw || "").toUpperCase().replace(/−/g, "-").replace(/\s+/g, " ").trim();
  if (!s) return "";
  var m = s.match(/^(A|B|AB|O)\s*(POSITIVO|NEGATIVO|\+|-)$/);
  if (!m) return "";
  var rh = m[2] === "POSITIVO" || m[2] === "+" ? "+" : "-";
  return m[1] + rh;
}
function formatCoombsToken_(raw) {
  var s = String(raw || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!s) return "";
  var strength = (s.match(/(?:^|[^0-9A-Z])([1-4]\+)(?![0-9A-Z])/) || [])[1];
  var hasPos = /\bPOSITIVO\b/.test(s) || !!strength;
  var hasNeg = /\bNEGATIVO\b/.test(s);
  if (hasPos) return (strength || "pos") + "*";
  if (hasNeg) return "neg";
  return "";
}
function isLabelOrNoise_(line) {
  return !line || /^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(line) || /^BANCO\s+DE\s+SANGRE$/i.test(line) || /^REPORTE\s+DE\s+GRUPO/i.test(line) || /^GRUPO\s+SANGU/i.test(line) || /^COOMBS\s+(DIRECTO|INDIRECTO)/i.test(line);
}
function resultFromSameOrNextLine_(lineas, i) {
  var same = String(lineas[i] || "");
  var tabIdx = same.indexOf("	");
  if (tabIdx >= 0) {
    var after = same.substring(tabIdx + 1).replace(/\t/g, " ").trim();
    if (after && !isLabelOrNoise_(after)) return after;
  }
  for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
    var t = String(lineas[j] || "").replace(/\t/g, " ").trim();
    if (isLabelOrNoise_(t)) {
      if (/^GRUPO\s+SANGU|^COOMBS\s+(DIRECTO|INDIRECTO)/i.test(t)) break;
      continue;
    }
    return t;
  }
  return "";
}
function findEstudioResult_(lineas, pattern) {
  for (var i = 0; i < lineas.length; i++) {
    var head = String(lineas[i] || "").replace(/\t.*$/, "").trim();
    if (!pattern.test(head)) continue;
    return resultFromSameOrNextLine_(lineas, i);
  }
  return "";
}
function parseGrupoSangreCoombs_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  if (!hasGrupoSangreMarkers_(textoBruto)) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var grupo = normalizeGrupoRh_(
    findEstudioResult_(lineas, /^GRUPO\s+SANGU[IÍ]NEO(?:\s*\/\s*RH)?$/i)
  );
  var cd = formatCoombsToken_(findEstudioResult_(lineas, /^COOMBS\s+DIRECTO$/i));
  var ci = formatCoombsToken_(findEstudioResult_(lineas, /^COOMBS\s+INDIRECTO$/i));
  var parts = [];
  if (grupo) parts.push(grupo);
  if (cd) parts.push("CD " + cd);
  if (ci) parts.push("CI " + ci);
  if (!parts.length) return "";
  return "GS	" + parts.join(" ");
}

// public/js/labs-section-order.mjs
var HEAD_ORDER = ["BH", "QS", "ESC", "PFHS", "GASES"];
var TAIL_ORDER = ["CUANTORINA", "EGO"];
var HEAD_RANK = /* @__PURE__ */ Object.create(null);
var TAIL_RANK = /* @__PURE__ */ Object.create(null);
HEAD_ORDER.forEach(function(k, i) {
  HEAD_RANK[k] = i;
});
TAIL_ORDER.forEach(function(k, i) {
  TAIL_RANK[k] = i;
});
var HEAD_LEN = HEAD_ORDER.length;
var OTROS_RANK = HEAD_LEN;
var TAIL_BASE = HEAD_LEN + 1;
function labSectionOrderKey(row) {
  var s = String(row == null ? "" : row).trim();
  if (!s) return "";
  var firstLine2 = s.split(/\r?\n/, 1)[0] || "";
  var tab = firstLine2.indexOf("	");
  if (tab >= 0) firstLine2 = firstLine2.substring(0, tab);
  var colon = firstLine2.indexOf(":");
  if (colon > 0) firstLine2 = firstLine2.substring(0, colon);
  var m = firstLine2.match(/^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9]+)/);
  return m ? m[1].toUpperCase() : "";
}
function sectionRank_(key) {
  if (!key) return OTROS_RANK;
  if (Object.prototype.hasOwnProperty.call(HEAD_RANK, key)) return HEAD_RANK[key];
  if (Object.prototype.hasOwnProperty.call(TAIL_RANK, key)) return TAIL_BASE + TAIL_RANK[key];
  return OTROS_RANK;
}
function sortResLabsByClinicalOrder(rows) {
  var list = (rows || []).map(function(row, idx) {
    return { row, idx, rank: sectionRank_(labSectionOrderKey(row)) };
  });
  list.sort(function(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.idx - b.idx;
  });
  return list.map(function(item) {
    return String(item.row == null ? "" : item.row);
  });
}

// public/js/labs-reslabs-sanitize.mjs
var LAB_SECTION_LEAD_RE = /^(BH|QS|ESC|PFHs?|GASES|COAG|ORINA|EGO|CUANTORINA|PltCit|LIPASA|CULTIVO|LCR|TROP|GS|SEROL|FROTIS|HECES|PIE|INTERPRETACI[OÓ]N|LIQ|ASCITIS|TIR|ENDO|CARD|FE|INFL|INM|META|NEF|NIVEL|TM|NUT|GI|TOX|HEPB|VIRAL|MICRO)\b/i;
var CULTIVO_START_RE = /^(?:(?:CULTIVO|BACTERIOLOGIA|UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO|TINCION\s+DE\s+GRAM|CATETER|ATB|Cultivos|BACILOSCOPIA)\b|Cuenta:)/i;
var PARSED_CULTIVO_HEADER_RE = /^(SECRECION|LIQUIDO|ASPIRADO|ABSCESO|BRONCOALVEOLAR)\b/i;
var PARSED_CULTIVO_DATED_RE = /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ()\s/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i;
function firstLine(text) {
  return String(text || "").trim().split(/\r?\n/, 1)[0] || "";
}
function isCultivoStartLineLocal(first) {
  var t = String(first || "").trim();
  if (!t) return false;
  if (CULTIVO_START_RE.test(t)) return true;
  if (/^CULTIVO\s+DE\s+MICOBACTERIAS\b/i.test(t)) return true;
  if (PARSED_CULTIVO_HEADER_RE.test(t)) return true;
  if (PARSED_CULTIVO_DATED_RE.test(t)) return true;
  if (/^[•\u2022\u00B7]\s*/.test(t)) return true;
  return false;
}
function isSomeReportChromeLine(line) {
  var t = String(line == null ? "" : line).trim();
  if (!t) return false;
  if (/^USER\b/i.test(t)) return true;
  if (/\bLabo\s*-?\d+/i.test(t) && /\b(DJEG|UANL|Campo|Feme)\b/i.test(t)) return true;
  if (/Sistema\s+SOME|UNIVERSIDAD\s+AUT[OÓ]NOMA|MOP-HU-\d+|REPORTE\s+DE\s+RESULTADOS/i.test(t)) {
    return true;
  }
  if (/^(Expediente|Solicitud|Nombre|Sexo|Ubicaci[oó]n|Edad|Medico)\s*:/i.test(t)) return true;
  return false;
}
function looksLikeLabSectionChunk(text) {
  var first = firstLine(text);
  return !!first && LAB_SECTION_LEAD_RE.test(first);
}
function stripTrailingSomeReportChrome(text) {
  var t = String(text == null ? "" : text);
  if (!t) return "";
  t = t.replace(
    /\s*(?:Sistema\s+SOME|UNIVERSIDAD\s+AUT[OÓ]NOMA|MOP-HU-\d+|REPORTE\s+DE\s+RESULTADOS)[\s\S]*$/i,
    ""
  );
  t = t.replace(/\s*(?:Expediente|Solicitud)\s*:[\s\S]*$/i, "");
  t = t.replace(/\s*^USER\b[\s\S]*$/im, "");
  return t.trim();
}
function stripChromeLinesFromChunk(text) {
  var t = String(text == null ? "" : text);
  if (!t.trim()) return "";
  var kept = t.split(/\r?\n/).filter(function(ln) {
    return !isSomeReportChromeLine(ln);
  });
  return kept.join("\n").trim();
}
function sanitizeResLabsChunks(rows) {
  var out = [];
  (rows || []).forEach(function(row) {
    var s = String(row == null ? "" : row);
    if (!s.trim()) return;
    var first = firstLine(s);
    if (isSomeReportChromeLine(first)) return;
    if (looksLikeLabSectionChunk(s)) {
      var cleaned = stripChromeLinesFromChunk(stripTrailingSomeReportChrome(s));
      if (cleaned && looksLikeLabSectionChunk(cleaned)) out.push(cleaned);
      return;
    }
    if (isCultivoStartLineLocal(first)) {
      var cult = stripChromeLinesFromChunk(stripTrailingSomeReportChrome(s));
      if (cult && isCultivoStartLineLocal(firstLine(cult))) out.push(cult);
    }
  });
  return out;
}

// public/js/labs-procesar.mjs
function extractLabExpedienteFromReport(textoBruto) {
  var mExp = String(textoBruto || "").match(/Expediente:\s*([^\n\r]+)/i);
  if (!mExp) return "";
  return mExp[1].split(/\s+(?:Solicitud|Medico|Médico|Fecha|Sexo|Edad|Ubicaci)/i)[0].trim();
}
function parseLabSexoNorm_(mSexo) {
  if (!mSexo) return "";
  var sm = mSexo[1].match(/^(MASCULINO|FEMENINO|HOMBRE|MUJER|MALE|FEMALE|M\b|F\b)/i);
  if (!sm) return "";
  var sv = sm[1].toUpperCase();
  return sv === "MASCULINO" || sv === "HOMBRE" || sv === "MALE" || sv === "M" ? "M" : "F";
}
function parseLabEdadParts_(mEdad) {
  var edadRaw = mEdad ? (mEdad[1].match(/^\d+/) || [""])[0] : "";
  var edadUnidad = mEdad ? (mEdad[1].match(/\b(años|meses|dias|días|semanas)\b/i) || ["a\xF1os"])[0].toLowerCase() : "a\xF1os";
  if (edadUnidad === "dias" || edadUnidad === "d\xEDas") edadUnidad = "d\xEDas";
  return { edadRaw, edadUnidad };
}
function parseLabUbicacion_(textoBruto) {
  var mUbic = textoBruto.match(/Ubicaci[oó]n:\s*([^\n\r]+)/i);
  if (!mUbic) return "";
  var uRaw = mUbic[1].trim();
  var uTok = uRaw.split(/\t+/).map(function(x) {
    return x.trim();
  }).filter(Boolean);
  return (uTok[0] || uRaw.split(/\s+(?:Medico|Médico|Edad)\s*:/i)[0] || uRaw).trim();
}
function segmentLabReportBlocks_(deps, textoBruto, tNorm) {
  var mGaso = tNorm.match(
    /GASOMETRIA.*?(?=BIOMETRIA|CITOLOGIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CITOQUIMICO|$)/i
  );
  var bloqueGaso = mGaso ? mGaso[0] : "";
  var lcrNormChunks = lcrBlocksNormText_(textoBruto);
  var bloqueCitoLC = deps.bloqueCitoquimicoLiquidosFull(textoBruto);
  var mEGO = tNorm.match(
    /(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)/i
  );
  var bloqueEGO = mEGO ? mEGO[0] : "";
  var tSinLiqCorp = tNorm;
  if (bloqueCitoLC) {
    tSinLiqCorp = tNorm.replace(bloqueCitoLC.replace(/\r/g, "").replace(/\s+/g, " "), " ");
  }
  var textoQS = tSinLiqCorp.replace(bloqueGaso, " ").replace(bloqueEGO, " ");
  for (var li = 0; li < lcrNormChunks.length; li++) {
    textoQS = textoQS.replace(lcrNormChunks[li], " ");
  }
  var textoParaBh = tSinLiqCorp;
  if (bloqueEGO) textoParaBh = textoParaBh.replace(bloqueEGO, " ");
  var esSoloGaso = /GASOMETRIA/i.test(tNorm) && !/BIOMETRIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CULTIVO/i.test(tNorm);
  return { bloqueGaso, textoQS, textoParaBh, esSoloGaso };
}
function pushLabSection_(resLabs, value) {
  if (value) resLabs.push(value);
}
function sectionPrior_(priorBySec, key) {
  return priorBySec && priorBySec[key] ? priorBySec[key] : null;
}
function collectCoreLabSections_(deps, resLabs, blocks, demograf, textoBruto, tNorm, priorBySec) {
  var bhRes = deps.parseBH_(blocks.textoParaBh, sectionPrior_(priorBySec, "BH"));
  if (bhRes && bhRes.visible) resLabs.push(bhRes.visible);
  if (bhRes && bhRes.coagVisible) resLabs.push(bhRes.coagVisible);
  pushLabSection_(resLabs, deps.parseQS_(blocks.textoQS, demograf, sectionPrior_(priorBySec, "QS")));
  pushLabSection_(resLabs, deps.parseESC_(blocks.textoQS, sectionPrior_(priorBySec, "ESC")));
  pushLabSection_(resLabs, deps.parsePFH_(blocks.textoParaBh, sectionPrior_(priorBySec, "PFHs")));
  pushLabSection_(resLabs, deps.parseLipasa_(blocks.textoQS, sectionPrior_(priorBySec, "LIPASA")));
  pushLabSection_(
    resLabs,
    deps.parsePlaquetasCitrato_(textoBruto, tNorm, sectionPrior_(priorBySec, "PltCit"))
  );
  return bhRes && bhRes.extras ? bhRes.extras : {};
}
function appendFrotisLines_(deps, resLabs, textoBruto) {
  var fro = deps.parseFrotisSangre_(textoBruto);
  if (!fro) return;
  fro.split("\n").forEach(function(line) {
    if (line) resLabs.push(line);
  });
}
function collectLabSections_(deps, textoBruto, tNorm, blocks, demograf, priorBySec) {
  var resLabs = [];
  var bhExtras = blocks.esSoloGaso ? {} : collectCoreLabSections_(deps, resLabs, blocks, demograf, textoBruto, tNorm, priorBySec);
  pushLabSection_(
    resLabs,
    deps.parseGaso_(blocks.bloqueGaso, blocks.textoQS, sectionPrior_(priorBySec, "GASES"))
  );
  pushLabSection_(resLabs, deps.parsePIE_(tNorm));
  pushLabSection_(resLabs, deps.parsearLCR(textoBruto));
  pushLabSection_(resLabs, deps.parsearCitoquimicoLiquidos(textoBruto));
  pushLabSection_(
    resLabs,
    deps.formatCitoquimicoInterpretacionLine_(deps.buildCitoquimicoInterpretAlerts_(textoBruto))
  );
  pushLabSection_(resLabs, deps.parseFisicoquimicoHeces_(textoBruto));
  appendFrotisLines_(deps, resLabs, textoBruto);
  pushLabSection_(resLabs, deps.parseEGO_(textoBruto));
  pushLabSection_(resLabs, deps.parseCuantOrina_(textoBruto));
  pushLabSection_(resLabs, deps.parseCultivo_(textoBruto, tNorm));
  pushLabSection_(resLabs, deps.parseSerologiaBancoSangre_(textoBruto));
  pushLabSection_(resLabs, deps.parseGrupoSangreCoombs_(textoBruto));
  pushLabSection_(resLabs, deps.parseTroponina_(textoBruto, sectionPrior_(priorBySec, "TROP")));
  appendExtendedPanelLines_(deps, resLabs, textoBruto, priorBySec);
  return { resLabs, bhExtras };
}
function appendExtendedPanelLines_(deps, resLabs, textoBruto, priorBySec) {
  if (typeof deps.parseExtendedLabPanels_ !== "function") return;
  var lines = deps.parseExtendedLabPanels_(textoBruto, priorBySec) || [];
  for (var i = 0; i < lines.length; i++) {
    pushLabSection_(resLabs, lines[i]);
  }
}
function parseLabPatientHeader_(deps, textoBruto) {
  var mNombre = textoBruto.match(/Nombre:\s*([^\n\r]+)/i);
  var mExp = textoBruto.match(/Expediente:\s*([^\n\r]+)/i);
  var mSexo = textoBruto.match(/Sexo:\s*([^\n\r]+)/i);
  var mEdad = textoBruto.match(/Edad:\s*([^\n\r]+)/i);
  var expRaw = mExp ? mExp[1].split(/\s+(?:Solicitud|Medico|Médico|Fecha|Sexo|Edad|Ubicaci)/i)[0].trim() : "";
  var edadParts = parseLabEdadParts_(mEdad);
  var sexoRaw = parseLabSexoNorm_(mSexo);
  var patient = {
    name: mNombre ? mNombre[1].split(/Fecha|Sexo|Edad/i)[0].trim() : "",
    expediente: expRaw,
    sexo: sexoRaw,
    edad: edadParts.edadRaw ? edadParts.edadRaw + " " + edadParts.edadUnidad : "",
    fecha: deps.extractLabReportFechaDMY(textoBruto),
    hora: deps.extractLabReportHora(textoBruto),
    ubicacion: parseLabUbicacion_(textoBruto)
  };
  return {
    patient,
    edadRaw: edadParts.edadRaw,
    edadUnidad: edadParts.edadUnidad,
    sexoRaw
  };
}
function createProcesarLabs(deps) {
  return function procesarLabs2(textoBruto, options) {
    var tNorm = textoBruto.replace(/\s+/g, " ");
    var hdr2 = parseLabPatientHeader_(deps, textoBruto);
    var blocks = segmentLabReportBlocks_(deps, textoBruto, tNorm);
    var chartPatient = options && options.patient ? options.patient : null;
    var priorBySec = options && options.priorRefsBySection && typeof options.priorRefsBySection === "object" ? Object.assign(/* @__PURE__ */ Object.create(null), options.priorRefsBySection) : /* @__PURE__ */ Object.create(null);
    if (options && options.gasRefs) {
      priorBySec.GASES = Object.assign(
        /* @__PURE__ */ Object.create(null),
        priorBySec.GASES || /* @__PURE__ */ Object.create(null),
        options.gasRefs
      );
    }
    var egfrCtx = buildEgfrPatientCtx(hdr2.edadRaw, hdr2.edadUnidad, chartPatient);
    var sections = collectLabSections_(deps, textoBruto, tNorm, blocks, egfrCtx, priorBySec);
    var reportRefs = deps.buildRefsBySectionFromReport(textoBruto);
    return {
      patient: hdr2.patient,
      resLabs: sanitizeResLabsChunks(
        sortResLabsByClinicalOrder(deps.dedupeSingletonSections_(sections.resLabs))
      ),
      bhExtras: sections.bhExtras,
      // Reporte gana; prior rellena huecos (SOME sin Valor de Referencia).
      refsBySection: mergeRefsBySection_(reportRefs, priorBySec)
    };
  };
}

// public/js/labs-citoquimico-scan.mjs
function emptyCitoquimicoFields_() {
  return {
    fluid: "",
    dens: "",
    pH: "",
    glu: "",
    prot: "",
    ldh: "",
    alb: "",
    tgl: "",
    amil: "",
    aspecto: "",
    leu: "",
    rec: "",
    pmn: "",
    linf: "",
    eri: "",
    gram: "",
    com: ""
  };
}
function nextMeaningfulLine_(lineas, i0, maxJ) {
  for (var j = i0 + 1; j < Math.min(i0 + maxJ, lineas.length); j++) {
    var txt = lineas[j].replace(/\*/g, "").trim();
    if (!txt) continue;
    if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
    return txt;
  }
  return "";
}
function scanNumericAfter_2(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var m = lineas[j].match(/(\d+(\.\d+)?)/);
    if (m) return m[1];
  }
  return "";
}
function scanNumericSkipLetterFlag_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var c = lineas[j].replace(/\*/g, "").trim();
    if (/^[A-Z]$/i.test(c)) continue;
    var m = c.match(/(\d+(\.\d+)?)/);
    if (m) return m[1];
  }
  return "";
}
function scanCitoFluidType_(fields, lineas, i, lin) {
  if (/^CITOQUIMICO DE\s*$/i.test(lin) && !/CORPORALES/i.test(lin)) {
    var f = nextMeaningfulLine_(lineas, i, 6);
    if (f && !/^:$/.test(f)) fields.fluid = f.toUpperCase();
  }
  if (/^CITOQUIMICO DE\s+/i.test(lin) && !/CORPORALES/i.test(lin)) {
    var mTipo = lin.match(/^CITOQUIMICO DE\s+(.+)$/i);
    if (mTipo && mTipo[1].trim()) fields.fluid = mTipo[1].trim().toUpperCase();
  }
}
function scanCitoChemistry_(fields, lineas, i, lin, linUp) {
  if (linUp.indexOf("DENSIDAD") === 0) fields.dens = scanNumericAfter_2(lineas, i, 5);
  if (linUp === "PH" || linUp.indexOf("PH	") === 0) fields.pH = scanNumericAfter_2(lineas, i, 5);
  if (linUp.indexOf("GLUCOSA") === 0) fields.glu = scanNumericAfter_2(lineas, i, 5);
  if (linUp.indexOf("PROTEINAS") === 0) {
    var mL = lin.match(/PROTEINAS\s*([A-Z])\s*$/i);
    var letra = mL ? mL[1].toUpperCase() : "";
    var protVal = scanNumericAfter_2(lineas, i, 5);
    if (protVal) fields.prot = protVal + letra;
  }
  if (linUp.indexOf("LDH") === 0) fields.ldh = scanNumericSkipLetterFlag_(lineas, i, 8);
  if (linUp.indexOf("ALBUMINA") === 0) fields.alb = scanNumericSkipLetterFlag_(lineas, i, 8);
  if (linUp.indexOf("TRIGLICER") === 0) fields.tgl = scanNumericSkipLetterFlag_(lineas, i, 8);
  if (linUp.indexOf("AMILASA") === 0) fields.amil = scanNumericSkipLetterFlag_(lineas, i, 8);
}
function scanRecuentoField_(fields, lineas, i, linUp) {
  if (linUp.indexOf("RECUENTO") !== 0 || linUp.indexOf("LEUCOCITOS") !== -1) return;
  var bits = [];
  for (var j = i + 1; j < Math.min(i + 5, lineas.length); j++) {
    var c = lineas[j].replace(/\*/g, "").trim();
    if (!c) continue;
    if (/^LEUCOCITOS/i.test(c)) break;
    if (/^\d+[.,]?\d*$/.test(c) || /^[A-Z]$/i.test(c)) bits.push(c.toUpperCase());
    if (bits.length >= 2) break;
  }
  if (bits.length) fields.rec = bits.join(" ");
}
function scanLeucocitosField_(fields, lineas, i, linUp, normalizarRecuentoCelular) {
  if (!/^LEUCOCITOS/i.test(linUp)) return;
  for (var k = i - 1; k >= Math.max(0, i - 6); k--) {
    var prev = lineas[k].replace(/\*/g, "").trim();
    if (/^\d+[.,]?\d*$/.test(prev)) {
      fields.leu = normalizarRecuentoCelular(prev);
      return;
    }
  }
  for (var m = i + 1; m < Math.min(i + 8, lineas.length); m++) {
    var next = lineas[m].replace(/\*/g, "").trim();
    if (/^\d+[.,]?\d*$/.test(next)) {
      fields.leu = normalizarRecuentoCelular(next);
      return;
    }
  }
}
function scanRecuentoAndLeucocitos_(fields, lineas, i, linUp, normalizarRecuentoCelular) {
  scanRecuentoField_(fields, lineas, i, linUp);
  scanLeucocitosField_(fields, lineas, i, linUp, normalizarRecuentoCelular);
}
function scanCitoDiffCounts_(fields, lineas, i, linUp) {
  if (linUp.indexOf("POLIMORFONUCLEARES") === 0) {
    var ptxt = nextMeaningfulLine_(lineas, i, 5);
    if (ptxt) fields.pmn = ptxt.toUpperCase();
  }
  if (linUp.indexOf("LINFOCITOS") === 0) {
    var ltxt = nextMeaningfulLine_(lineas, i, 5);
    if (ltxt && ltxt !== "%" && ltxt !== "---") fields.linf = ltxt.replace(",", ".");
  }
  if (linUp.indexOf("ERITROCITOS") === 0) {
    var etxt = nextMeaningfulLine_(lineas, i, 5);
    if (etxt) fields.eri = etxt.toUpperCase();
  }
  if (linUp.indexOf("GRAM") === 0) {
    var g2 = nextMeaningfulLine_(lineas, i, 5);
    if (g2) fields.gram = g2.toUpperCase();
  }
  if (linUp.indexOf("COMENTARIO") === 0) {
    var cx = nextMeaningfulLine_(lineas, i, 4);
    if (cx && !/^\*+$/.test(cx)) fields.com = cx.toUpperCase();
  }
}
function scanCitoMicroscopy_(fields, lineas, i, linUp, normalizarRecuentoCelular) {
  if (linUp.indexOf("ASPECTO") === 0) {
    var a = nextMeaningfulLine_(lineas, i, 5);
    if (a && !/^:$/.test(a)) fields.aspecto = a.toUpperCase();
  }
  scanRecuentoAndLeucocitos_(fields, lineas, i, linUp, normalizarRecuentoCelular);
  scanCitoDiffCounts_(fields, lineas, i, linUp);
}
function scanCitoquimicoLine_(fields, lineas, i, lin, linUp, normalizarRecuentoCelular) {
  scanCitoFluidType_(fields, lineas, i, lin);
  scanCitoChemistry_(fields, lineas, i, lin, linUp);
  scanCitoMicroscopy_(fields, lineas, i, linUp, normalizarRecuentoCelular);
}
function citoquimicoFieldsEmpty_(fields) {
  return !Object.values(fields).some(Boolean);
}
function buildCitoquimicoParts_(fields, ctx) {
  var p = ["Liq:"];
  var pairs = [
    ["fluid", "Tipo", (v) => v],
    ["dens", "Dens", (v) => v],
    ["pH", "pH", (v) => v],
    ["glu", "Glu", (v) => v],
    ["prot", "Prot", (v) => ctx.fmtProteinaFluido(v)],
    ["alb", "Alb", (v) => v],
    ["tgl", "TGL", (v) => v],
    ["amil", "Amil", (v) => v],
    ["ldh", "LDH", (v) => v],
    ["aspecto", "Asp", (v) => v],
    ["rec", "Rec", (v) => v],
    ["leu", "Leu", (v) => v],
    ["pmn", "PMN", (v) => v],
    ["linf", "Linf", (v) => v + (/%/.test(v) ? "" : "%")],
    ["eri", "Eri", (v) => v],
    ["gram", "Gram", (v) => v],
    ["com", "Obs", (v) => v]
  ];
  for (var n = 0; n < pairs.length; n++) {
    var key = pairs[n][0];
    var label = pairs[n][1];
    var fmt2 = pairs[n][2];
    var raw = fields[key];
    if (!raw || key === "pmn" && raw === "---" || key === "com" && raw === fields.fluid) continue;
    p.push(label, fmt2(raw));
  }
  if (ctx.gasaVal != null) p.push("GASA", String(ctx.gasaVal));
  return p;
}

// public/js/labs-fluidos-misc.mjs
var HECES_ROW_DEFS = [
  { key: "ASPECTO", out: "Asp" },
  { key: "PH", out: "pH" },
  { key: "PROTEINAS", out: "Prot" },
  { key: "GLUCOSA", out: "Glu" },
  { key: "LEUCOCITOS", out: "Leu" },
  { key: "ERITROCITOS", out: "Eri" },
  { key: "GRASA", out: "Grasa" },
  { key: "FIBRAS MUSCULARES", out: "Fibra" },
  { key: "COPROPARASITOSCOPICO INMEDIATO", out: "Copro" },
  { key: "OBSERVACIONES", out: "Obs" }
];
function nextMeaningfulInBlock_(bloque, iStart, maxStep, skipNumericOnly) {
  for (var k = iStart + 1; k < Math.min(iStart + maxStep, bloque.length); k++) {
    var txt = (bloque[k] || "").replace(/\*/g, "").trim();
    if (!txt || txt === ":") continue;
    if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
    if (skipNumericOnly && /^\d+(\.\d+)?$/.test(txt)) continue;
    return txt;
  }
  return "";
}
function findHecesBlock_(lineas) {
  var i0 = -1;
  for (var i = 0; i < lineas.length; i++) {
    if (lineas[i].toUpperCase().indexOf("FISICOQUIMICO DE HECES") !== -1) {
      i0 = i;
      break;
    }
  }
  if (i0 === -1) return null;
  var i1 = lineas.length;
  for (var j = i0 + 1; j < lineas.length; j++) {
    if (/^(BACTERIOLOGIA|HEMATOLOGIA|QUIMICA CLINICA|INMUNOLOGIA|GASOMETRIA|COAGULACION|URIANALISIS|EXAMEN GENERAL DE ORINA|CULTIVO)\b/i.test(
      lineas[j]
    )) {
      i1 = j;
      break;
    }
  }
  return lineas.slice(i0, i1);
}
function readHecesRowValue_(bloque, row) {
  for (var bi = 0; bi < bloque.length; bi++) {
    if (bloque[bi].toUpperCase().indexOf(row.key) !== 0) continue;
    var v = nextMeaningfulInBlock_(bloque, bi, 7, false);
    if (row.key === "ASPECTO" && /^\d+(\.\d+)?$/.test(v)) {
      var v2 = nextMeaningfulInBlock_(bloque, bi, 10, true);
      if (v2) v = v + " " + v2;
    }
    return v ? v.toUpperCase() : "";
  }
  return "";
}
function parseFisicoquimicoHeces_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  if (textoBruto.toUpperCase().indexOf("FISICOQUIMICO DE HECES") === -1) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var bloque = findHecesBlock_(lineas);
  if (!bloque) return "";
  var p = ["HECES"];
  for (var r = 0; r < HECES_ROW_DEFS.length; r++) {
    var v = readHecesRowValue_(bloque, HECES_ROW_DEFS[r]);
    if (v) p.push(HECES_ROW_DEFS[r].out, v);
  }
  if (p.length <= 1) return "";
  return p[0] + "	" + p.slice(1).join(" ");
}
function parseFrotisSangre_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf("FROTIS DE SANGRE PERIFERICA") === -1) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var i0 = -1;
  for (var i = 0; i < lineas.length; i++) {
    if (lineas[i].toUpperCase().indexOf("FROTIS DE SANGRE PERIFERICA") !== -1) {
      i0 = i;
      break;
    }
  }
  if (i0 === -1) return "";
  function nextMeaningful(iStart, maxStep) {
    for (var j = iStart + 1; j < Math.min(iStart + maxStep, lineas.length); j++) {
      var txt = (lineas[j] || "").replace(/\*/g, "").trim();
      if (!txt || txt === ":") continue;
      if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(txt)) continue;
      if (/^FROTIS DE SANGRE PERIFERICA$/i.test(txt)) continue;
      return txt;
    }
    return "";
  }
  var desc = "";
  for (var k = i0; k < Math.min(i0 + 20, lineas.length); k++) {
    if (lineas[k].toUpperCase().indexOf("FROTIS DE SANGRE PERIFERICA") !== 0) continue;
    desc = nextMeaningful(k, 8);
    if (desc) break;
  }
  if (!desc) return "";
  var lines = formatFrotisSangreLines_(desc);
  var plaqObs = extraerObservacionPlaquetasHema_(textoBruto);
  if (plaqObs) {
    lines = lines ? lines + "\nFROTIS	PlaqObs " + plaqObs : "FROTIS	PlaqObs " + plaqObs;
  }
  return lines;
}
function extraerObservacionPlaquetasHema_(textoBruto) {
  if (!textoBruto || !/PLAQUETAS\s+DISMINUIDAS/i.test(textoBruto)) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").replace(/\*/g, "").trim();
  });
  for (var i = 0; i < lineas.length; i++) {
    if (!/^OBSERVACIONES$/i.test(lineas[i])) continue;
    for (var j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
      var t = lineas[j];
      if (!t || /^[ABHL]$/i.test(t)) continue;
      if (/^FROTIS|TIEMPO DE|FIBRINOGENO|DIMERO|HEMATOLOGIA/i.test(t)) break;
      if (/PLAQUETAS/i.test(t)) return t.toUpperCase();
    }
  }
  return "PLAQUETAS DISMINUIDAS";
}
function formatFrotisSangreLines_(desc) {
  var up = String(desc || "").toUpperCase().trim();
  if (!up) return "";
  var calTokens = [];
  var plaqTokens = [];
  var otros = [];
  up.split(/\s*,\s*/).forEach(function(chunk) {
    var c = chunk.trim();
    if (!c) return;
    if (/PLAQUET|MACROPLAQUET/i.test(c)) plaqTokens.push(c);
    else if (/HIPOCROM|ANISOCIT|POIKILOCIT|ESFEROCIT|ELIPT|DACRIOCIT|ESQUIZOCIT|BITE|ROD|HELIN|CABEZA|CUELLO|CABEZA DE FLECHA|POLICROM|NORMOCROM|NORMOCIT|MACROCIT|MICROCIT|\+/i.test(c)) {
      calTokens.push(c);
    } else otros.push(c);
  });
  var lines = [];
  if (calTokens.length) lines.push("FROTIS	Cal " + calTokens.join(", "));
  if (plaqTokens.length) lines.push("FROTIS	Plaq " + plaqTokens.join(", "));
  if (otros.length) lines.push("FROTIS	Obs " + otros.join(", "));
  if (!lines.length) lines.push("FROTIS	Obs " + up);
  return lines.join("\n");
}
function parsePlaquetasCitrato_(textoBruto, tNorm, priorRefs) {
  if (!tNorm || !/PLAQUETAS\s+CON\s+CITRATO/i.test(tNorm)) return "";
  var bloque = "";
  var m = textoBruto.match(
    /PLAQUETAS\s+CON\s+CITRATO[\s\S]*?(?=\n\s*(?:HEMATOLOGIA|QUIMICA\s+CLINICA|URIANALISIS|BACTERIOLOGIA|GASOMETRIA|BIOMETRIA|COAGULACION)\b|$)/i
  );
  bloque = m ? m[0].replace(/\s+/g, " ") : tNorm;
  var pltData = extraerConRango(["CUENTA DE PLAQUETAS", "PLT "], bloque);
  if (pltData.valor === "---") return "";
  var Plt = fmtLabRanged_(pltData, "Plt", priorRefs);
  return "PltCit	Plt " + Plt;
}
function formatSerolSco_(raw) {
  var n = parseFloat(String(raw || "").replace(",", "."));
  if (!isFinite(n)) return String(raw || "").trim();
  var s = n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return s;
}
function qualSerolShort_(qual) {
  var q = String(qual || "").toUpperCase();
  if (q === "NEGATIVO") return "neg";
  if (q === "POSITIVO") return "pos*";
  if (q === "INDETERMINADO") return "indet*";
  return "";
}
function lineMatchesSerolPatterns_(line, patterns) {
  for (var p = 0; p < patterns.length; p++) {
    if (patterns[p].test(line)) return true;
  }
  return false;
}
function readSerolQualFromFollowLines_(lineas, i) {
  var sco = null;
  var qual = "";
  for (var j = i + 1; j < Math.min(i + 12, lineas.length); j++) {
    var t = String(lineas[j] || "").replace(/\*/g, "").trim();
    if (!t || t === ":") continue;
    if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(t)) continue;
    if (/^S\/CO$/i.test(t)) continue;
    if (/^(Positivo|Indeterminado|Negativo)\s*[<>=]/i.test(t)) continue;
    if (/^(Anticuerpos|Ant[ií]geno)\b/i.test(t)) break;
    var mNum = t.match(/^(\d+\.\d+|\d+)$/);
    if (mNum && sco === null) {
      sco = mNum[1];
      continue;
    }
    var mQ = t.match(/^(NEGATIVO|POSITIVO|INDETERMINADO)$/i);
    if (mQ) {
      qual = mQ[1].toUpperCase();
      break;
    }
  }
  return qual ? { sco, qual } : null;
}
function extraerSerolEstudio_(lineas, iStart, patterns) {
  for (var i = iStart; i < lineas.length; i++) {
    var line = String(lineas[i] || "").replace(/\t.*$/, "").trim();
    if (!line || !lineMatchesSerolPatterns_(line, patterns)) continue;
    return readSerolQualFromFollowLines_(lineas, i);
  }
  return null;
}
function hasSerolReportMarkers_(textoBruto) {
  return /HIV\s*1\s*\/\s*HIV\s*2/i.test(textoBruto) || /ANTI\s+VIRUS\s+DE\s+LA\s+HEPATITIS\s+C/i.test(textoBruto) || /ANTIGENO\s+DE\s+SUPERFICIE.*HEPATITIS\s+B/i.test(textoBruto);
}
function findBancoSangreStart_(lineas) {
  for (var i = 0; i < lineas.length; i++) {
    if (/^BANCO\s+DE\s+SANGRE$/i.test(lineas[i])) return i;
  }
  return 0;
}
function buildSerolToken_(est, res) {
  var qShort = qualSerolShort_(res.qual);
  if (!qShort) return "";
  var token = est.key + " " + qShort;
  if (res.sco != null) token += " (" + formatSerolSco_(res.sco) + ")";
  return token;
}
function parseSerologiaBancoSangre_(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var tUp = textoBruto.toUpperCase();
  if (tUp.indexOf("BANCO DE SANGRE") === -1 && !hasSerolReportMarkers_(textoBruto)) return "";
  var lineas = textoBruto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var startSearch = findBancoSangreStart_(lineas);
  var estudios = [
    { key: "VIH", patterns: [/HIV\s*1\s*\/\s*HIV\s*2/i, /\bANTI\s+HIV/i] },
    { key: "VHC", patterns: [/ANTI\s+VIRUS\s+DE\s+LA\s+HEPATITIS\s+C/i, /HEPATITIS\s+C/i] },
    { key: "HBsAg", patterns: [/ANTIGENO\s+DE\s+SUPERFICIE.*HEPATITIS\s+B/i, /\bHBSAG\b/i] }
  ];
  var parts = [];
  for (var e = 0; e < estudios.length; e++) {
    var res = extraerSerolEstudio_(lineas, startSearch, estudios[e].patterns);
    if (!res || !res.qual) continue;
    var token = buildSerolToken_(estudios[e], res);
    if (token) parts.push(token);
  }
  if (!parts.length) return "";
  return "SEROL	" + parts.join(" ");
}
function readNumericFromLines_(lineas, i, maxLook) {
  for (var j = i + 1; j < Math.min(i + maxLook, lineas.length); j++) {
    var v = lineas[j];
    if (!v || /^[A-Z]$/.test(v)) continue;
    var m = v.match(/^(\d+\.?\d*)/);
    if (m) return m[1];
  }
  return "---";
}
function extractOrinaVolRes_(lineas) {
  var vol = "---";
  var res = "---";
  for (var i = 0; i < lineas.length; i++) {
    var lUp = lineas[i].toUpperCase();
    if (lUp.indexOf("VOLUMEN") !== -1) vol = readNumericFromLines_(lineas, i, 6);
    if (lUp === "RESULTADO") res = readNumericFromLines_(lineas, i, 6);
  }
  return { vol, res };
}
function parseCuantOrina_(textoBruto) {
  var tUp = textoBruto.toUpperCase();
  var startIdx = tUp.indexOf("CUANTIFICACION PROTEINAS");
  if (startIdx === -1) return "";
  var bloque = textoBruto.substring(startIdx);
  var nextSec = bloque.search(/\n(?:HEMATOLOGIA|BACTERIOLOGIA|CULTIVO|EXAMEN GENERAL|GASOMETRIA|BIOMETRIA)\b/i);
  if (nextSec > 0) bloque = bloque.substring(0, nextSec);
  var lineas = bloque.split(/\r?\n/).map(function(l) {
    return l.replace(/\*/g, "").replace(/\t.*/, "").trim();
  });
  var extracted = extractOrinaVolRes_(lineas);
  if (extracted.res === "---") return "";
  var tipo = /orina\s+de\s+12/i.test(bloque) ? "12h" : "24h";
  var parts = ["Prot" + tipo];
  if (extracted.vol !== "---") parts.push("Vol " + extracted.vol + "ml");
  parts.push(extracted.res + "*");
  parts.push("gr/vol");
  return parts[0] + "	" + parts.slice(1).join(" ");
}

// public/js/labs-fluidos.mjs
function bloqueCitoquimicoLiquidosFull(textoBruto) {
  var t = textoBruto.replace(/\r/g, "");
  var u = t.toUpperCase();
  var key = "CITOQUIMICO DE LIQUIDOS CORPORALES";
  var i0 = u.indexOf(key);
  if (i0 === -1) return "";
  var i2 = u.indexOf(key, i0 + key.length);
  if (i2 === -1) return t.substring(i0);
  var afterSecond = t.substring(i2 + key.length);
  var stop = afterSecond.search(/\n\n\s*(?:QUIMICA CLINICA|HEMATOLOGIA|INMUNOLOGIA|GASOMETRIA|BANDEJA)\b/i);
  var end = stop === -1 ? t.length : i2 + key.length + stop;
  return t.substring(i0, end);
}
function normalizarProteinasFluidoGdl_(valStr) {
  var n = toNum_(String(valStr || "").replace(/[A-Z*]$/i, ""));
  if (n == null) return null;
  if (n >= 1e3) return n / 1e3;
  if (n >= 100) return n / 100;
  return n;
}
function esLiquidoPleural_(fluid, com, bloque) {
  var s = ((fluid || "") + " " + (com || "") + " " + (bloque || "")).toUpperCase();
  return /\bPLEURAL\b/.test(s) || /\bL[IÍ]QUIDO\s+PLEURAL\b/.test(s);
}
function esLiquidoAscitico_(fluid, com, bloque) {
  if (esLiquidoPleural_(fluid, com, bloque)) return false;
  var s = ((fluid || "") + " " + (com || "") + " " + (bloque || "")).toUpperCase();
  return /\bASCIT/i.test(s) || /\bPERITONEAL\b/.test(s) || /\bL[IÍ]QUIDO\s+PERITONEAL\b/.test(s);
}
function computeGasaValue_(serumAlbGdl, asciticAlbGdl) {
  if (serumAlbGdl == null || asciticAlbGdl == null) return null;
  return Math.round((serumAlbGdl - asciticAlbGdl) * 100) / 100;
}
function extraerGlucosaSuero_(textoBruto) {
  var t = serumTextWithoutCitoBlock_(textoBruto);
  if (!t) return null;
  var gluData = extraerConRangoSuero(["GLUCOSA"], t);
  return toNum_(gluData.valor);
}
function extractSerumGlucoseMgdlFromResLabs_(resLabs) {
  var rows = resLabs || [];
  for (var i = 0; i < rows.length; i++) {
    var line = String(rows[i] || "");
    var key = labSectionKey_(line);
    if (key !== "QS" && key !== "PFHS") continue;
    var m = line.match(/\bGlu\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
    if (m) return toNum_(m[1]);
  }
  return null;
}
function resolveSerumGlucoseForInterpret_(textoBruto, serumOpts) {
  var glu = extraerGlucosaSuero_(textoBruto);
  if (glu != null) return glu;
  var opts = serumOpts || {};
  var extras = opts.extraSourceTexts || [];
  for (var i = 0; i < extras.length; i++) {
    var txt = String(extras[i] || "").trim();
    if (!txt) continue;
    glu = extraerGlucosaSuero_(txt);
    if (glu != null) return glu;
  }
  var labGroups = opts.extraResLabs || [];
  for (var j = 0; j < labGroups.length; j++) {
    glu = extractSerumGlucoseMgdlFromResLabs_(labGroups[j]);
    if (glu != null) return glu;
  }
  return null;
}
function serumTextWithoutCitoBlock_(textoBruto) {
  if (!textoBruto) return "";
  var bloqueCito = bloqueCitoquimicoLiquidosFull(textoBruto);
  if (!bloqueCito) return String(textoBruto);
  var tNorm = String(textoBruto).replace(/\s+/g, " ");
  var bloqueNorm = bloqueCito.replace(/\r/g, "").replace(/\s+/g, " ");
  return tNorm.replace(bloqueNorm, " ");
}
function extraerAlbuminaSueroParaGasa_(textoBruto, _bloqueCito) {
  var t = serumTextWithoutCitoBlock_(textoBruto);
  if (!t) return null;
  var albData = extraerConRangoSuero(["ALBUMINA"], t);
  return toNum_(albData.valor);
}
function extractSerumAlbuminGdlFromResLabs_(resLabs) {
  var rows = resLabs || [];
  for (var i = 0; i < rows.length; i++) {
    var line = String(rows[i] || "");
    if (labSectionKey_(line) !== "PFHS") continue;
    var m = line.match(/\bAlb\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
    if (m) return toNum_(m[1]);
  }
  return null;
}
function resolveSerumAlbuminForGasa_(textoBruto, bloqueCito, serumOpts) {
  var alb = extraerAlbuminaSueroParaGasa_(textoBruto, bloqueCito);
  if (alb != null) return alb;
  var opts = serumOpts || {};
  var extras = opts.extraSourceTexts || [];
  for (var i = 0; i < extras.length; i++) {
    var txt = String(extras[i] || "").trim();
    if (!txt) continue;
    alb = extraerAlbuminaSueroParaGasa_(txt, bloqueCitoquimicoLiquidosFull(txt));
    if (alb != null) return alb;
  }
  var labGroups = opts.extraResLabs || [];
  for (var j = 0; j < labGroups.length; j++) {
    alb = extractSerumAlbuminGdlFromResLabs_(labGroups[j]);
    if (alb != null) return alb;
  }
  return null;
}
function resLabsHasAsciticFluid_(resLabs) {
  return !!(resLabs || []).some(function(row) {
    var line = String(row || "");
    return labSectionKey_(line) === "LIQ:" && /\bASCIT|PERITONEAL/i.test(line);
  });
}
function resLabsHasPleuralFluid_(resLabs) {
  return !!(resLabs || []).some(function(row) {
    var line = String(row || "");
    return labSectionKey_(line) === "LIQ:" && /\bPLEURAL\b/i.test(line);
  });
}
function extraerCitologiaAscitica_(textoBruto) {
  var t = String(textoBruto || "").toUpperCase();
  var idx = t.search(/\bCITOLOG/i);
  if (idx === -1) return null;
  var chunk = t.substring(idx, idx + 1200);
  if (!/\b(ASCIT|PERITONEAL|LIQUIDO\s+ASCIT)\b/.test(chunk)) return null;
  if (/\b(POSITIVO|MALIGN|ADENOCARCINOMA|CARCINOMA|CARCINOMATOSIS|METÁSTASIS|METASTASIS)\b/.test(chunk)) {
    return "positive";
  }
  if (/\bNEGATIVO\b/.test(chunk)) return "negative";
  return null;
}
function applyLightProtCriterion_(pleuralProtGdl, serumProtGdl, hits, details) {
  if (pleuralProtGdl == null || serumProtGdl == null || serumProtGdl <= 0) return 0;
  var r1 = pleuralProtGdl / serumProtGdl;
  if (r1 > 0.5) hits.push("prot");
  details.push("Prot " + r1.toFixed(2) + (r1 > 0.5 ? "" : "\u2212"));
  return 1;
}
function applyLightLdhCriterion_(pleuralLdh, serumLdh, hits, details) {
  if (pleuralLdh == null || serumLdh == null || serumLdh <= 0) return 0;
  var r2 = pleuralLdh / serumLdh;
  if (r2 > 0.6) hits.push("ldh");
  details.push("LDH " + r2.toFixed(2) + (r2 > 0.6 ? "" : "\u2212"));
  return 1;
}
function applyLightLdhUlnCriterion_(pleuralLdh, serumLdhUln, hits, details) {
  if (pleuralLdh == null || serumLdhUln == null || serumLdhUln <= 0) return 0;
  var umbral = 2 / 3 * serumLdhUln;
  if (pleuralLdh > umbral) hits.push("ldhUln");
  details.push("LDH>2/3" + (pleuralLdh > umbral ? "" : "\u2212"));
  return 1;
}
function evaluarCriteriosLight_(pleuralProtGdl, pleuralLdh, serumProtGdl, serumLdh, serumLdhUln) {
  var hits = [];
  var details = [];
  var nEval = applyLightProtCriterion_(pleuralProtGdl, serumProtGdl, hits, details) + applyLightLdhCriterion_(pleuralLdh, serumLdh, hits, details) + applyLightLdhUlnCriterion_(pleuralLdh, serumLdhUln, hits, details);
  if (!nEval || !details.length) return "";
  if (hits.length > 0) return "Light EXUDADO (" + details.join(", ") + ")";
  if (nEval === 3) return "Light TRASUDADO (" + details.join(", ") + ")";
  return "Light TRASUDADO parcial (" + details.join(", ") + ")";
}
function extraerSueroParaLight_(textoBruto, bloqueCito) {
  var t = textoBruto || "";
  if (bloqueCito) t = t.replace(bloqueCito, " ");
  var protData = extraerConRangoSuero(
    ["PROTEINAS TOTALES EN SANGRE", "PROTEINAS TOTALES", "PROTEINA TOTAL EN SANGRE", "PROTEINAS EN SANGRE"],
    t
  );
  var ldhData = extraerConRangoSuero(["LDH DESHIDROGENASA LACTICA", "LDH "], t);
  return {
    protGdl: normalizarProteinasFluidoGdl_(protData.valor),
    ldh: toNum_(ldhData.valor),
    ldhUln: ldhData.max != null ? ldhData.max : null
  };
}
function normalizarRecuentoCelular_(valStr) {
  var c = String(valStr || "").replace(/\*/g, "").trim();
  if (/^\d{1,3},\d{3}$/.test(c)) return c.replace(",", "");
  return c.replace(",", ".");
}
function fmtProteinaFluido_(valStr) {
  var g2 = normalizarProteinasFluidoGdl_(valStr);
  if (g2 == null) return String(valStr || "").replace(/[A-Z*]$/i, "");
  var star = /[A-Z*]$/.test(String(valStr || ""));
  var s = g2 >= 10 ? String(Math.round(g2 * 10) / 10) : String(Math.round(g2 * 100) / 100);
  return s + (star ? "*" : "");
}
function buildLightPleural_(bloque, pleuralProtRaw, pleuralLdhRaw, textoBruto) {
  var pleuralProt = normalizarProteinasFluidoGdl_(pleuralProtRaw);
  var pleuralLdh = toNum_(pleuralLdhRaw);
  if (pleuralProt == null && pleuralLdh == null) return "";
  var suero = extraerSueroParaLight_(textoBruto, bloque);
  var ldhUln = suero.ldhUln;
  if (ldhUln == null && bloque) {
    var ldhRef = extraerConRango(["LDH DESHIDROGENASA LACTICA", "LDH "], bloque);
    if (ldhRef.max != null) ldhUln = ldhRef.max;
  }
  return evaluarCriteriosLight_(pleuralProt, pleuralLdh, suero.protGdl, suero.ldh, ldhUln);
}
function parseCitoquimicoLiquidosParsed(textoBruto, serumOpts) {
  var bloque = bloqueCitoquimicoLiquidosFull(textoBruto);
  if (!bloque) return { line: "", esAscitico: false };
  var lineas = bloque.split(/\r?\n/).map(function(l) {
    return l.trim();
  });
  var fields = emptyCitoquimicoFields_();
  for (var i = 0; i < lineas.length; i++) {
    var lin = lineas[i];
    scanCitoquimicoLine_(fields, lineas, i, lin, lin.toUpperCase(), normalizarRecuentoCelular_);
  }
  if (!fields.fluid && fields.com && /\bPLEURAL\b/i.test(fields.com)) fields.fluid = fields.com;
  if (!fields.fluid && esLiquidoPleural_(fields.fluid, fields.com, bloque)) fields.fluid = "LIQUIDO PLEURAL";
  if (citoquimicoFieldsEmpty_(fields)) {
    return { line: "", esAscitico: false };
  }
  var esPleural = esLiquidoPleural_(fields.fluid, fields.com, bloque);
  var esAscitico = esLiquidoAscitico_(fields.fluid, fields.com, bloque);
  var leuNum = parseFluidLeu_(fields.leu);
  var pmnInfo = parsePmnField_(fields.pmn, leuNum);
  var lightTxt = esPleural ? buildLightPleural_(bloque, fields.prot, fields.ldh, textoBruto) : "";
  var gasaVal = null;
  var serumAlb = null;
  var asciticAlb = null;
  if (esAscitico && fields.alb) {
    asciticAlb = toNum_(fields.alb);
    serumAlb = resolveSerumAlbuminForGasa_(textoBruto, bloque, serumOpts);
    gasaVal = computeGasaValue_(serumAlb, asciticAlb);
  }
  var p = buildCitoquimicoParts_(fields, { fmtProteinaFluido: fmtProteinaFluido_, gasaVal });
  return {
    line: p[0] + "	" + p.slice(1).join(" "),
    esAscitico,
    esPleural,
    alb: asciticAlb,
    serumAlb,
    gasaVal,
    protGdl: normalizarProteinasFluidoGdl_(fields.prot),
    tgl: toNum_(fields.tgl),
    amil: toNum_(fields.amil),
    citologia: extraerCitologiaAscitica_(textoBruto),
    lightTxt,
    leu: leuNum,
    pmnInfo,
    glu: toNum_(fields.glu),
    pH: toNum_(fields.pH),
    gram: fields.gram || ""
  };
}
function parsearCitoquimicoLiquidos(textoBruto, serumOpts) {
  return parseCitoquimicoLiquidosParsed(textoBruto, serumOpts).line;
}

// public/js/labs-citoquimico-interpret-rules.mjs
var PBE_PMN_CUTOFF = 250;
var PBE_LEU_CUTOFF = 250;
var PLEURAL_PH_EMPYEMA = 7.2;
var PLEURAL_GLU_EMPYEMA = 60;
var PLEURAL_LEU_EMPYEMA = 5e4;
var LCR_PH_MIN = 7.28;
var LCR_PH_MAX = 7.42;
function evaluarLcrPhSanity_(pH) {
  if (pH == null || !isFinite(pH)) return "";
  if (pH < LCR_PH_MIN || pH > LCR_PH_MAX) {
    return "pH LCR " + pH + " fuera de rango fisiol\xF3gico (" + LCR_PH_MIN + "\u2013" + LCR_PH_MAX + ") \u2014 verificar muestra/reporte";
  }
  return "";
}
function evaluarPbeAscitis_(leu, pmnInfo, gram) {
  var alerts = [];
  var pmn = pmnInfo && pmnInfo.pmnNum;
  if (pmn == null && leu != null && leu >= PBE_PMN_CUTOFF && pmnInfo && pmnInfo.predominant) {
    pmn = leu;
  }
  if (pmn != null && pmn >= PBE_PMN_CUTOFF) {
    alerts.push(
      "PMN " + pmn + " \u2265250/mm\xB3 \u2014 peritonitis bacteriana espont\xE1nea? (cultivo + ATB emp\xEDrico)"
    );
  } else if (leu != null && leu >= PBE_LEU_CUTOFF) {
    alerts.push("Leu " + leu + " \u2265250/mm\xB3 \u2014 descartar PBE (confirmar PMN absoluto)");
  }
  if (gramIsPositive_(gram)) {
    alerts.push("Gram " + gram + " \u2014 infecci\xF3n bacteriana en l\xEDquido asc\xEDtico?");
  }
  return alerts;
}
function evaluarPleuralInfeccion_(pH, glu, leu) {
  var alerts = [];
  if (pH != null && pH < PLEURAL_PH_EMPYEMA) {
    alerts.push("pH pleural " + pH + " <7.20 \u2014 derrame complicado / empiema?");
  }
  if (glu != null && glu < PLEURAL_GLU_EMPYEMA) {
    alerts.push("Glu pleural " + glu + " <60 mg/dL \u2014 derrame complicado / empiema?");
  }
  if (leu != null && leu >= PLEURAL_LEU_EMPYEMA) {
    alerts.push("Leu " + leu + " \u226550k/mm\xB3 \u2014 empiema?");
  }
  return alerts;
}
function lcrGluLow_(glu, serumGlu) {
  if (glu == null) return false;
  if (glu < 40) return true;
  if (serumGlu != null && serumGlu > 0 && glu / serumGlu < 0.4) return true;
  return false;
}
function pushLcrBacterialAlert_(alerts, leu, glu, gram) {
  if (gramIsPositive_(gram)) {
    alerts.push("Meningitis bacteriana? (Gram " + gram + ")");
    return;
  }
  var gluTxt = glu != null ? ", Glu LCR " + glu : "";
  alerts.push("Meningitis bacteriana? (Leu " + leu + gluTxt + " \u2014 cultivo/ATB emp\xEDrico)");
}
function pushLcrViralAlert_(alerts, leu) {
  alerts.push("Meningitis viral/as\xE9ptica? (Leu " + leu + " \u2014 correlacionar PCR/virolog\xEDa)");
}
function pushLcrTbAlert_(alerts, leu, glu, prot) {
  var bits = ["Leu " + leu];
  if (glu != null) bits.push("Glu " + glu);
  if (prot != null) bits.push("Prot " + prot);
  alerts.push("Meningitis tuberculosa? (" + bits.join(", ") + " \u2014 ADA/BAAR/genXpert)");
}
function lcrTintaSuggestive_(tinta) {
  return tinta && !isGramNegative_(tinta) && /POSITIV|LEVADUR|COC/i.test(tinta);
}
function isLcrNormocellular_(leu, glu, prot, serumGlu) {
  return leu != null && leu <= 5 && !lcrGluLow_(glu, serumGlu) && (prot == null || prot <= 45);
}
function evaluarLcrLeu100Plus_(alerts, leu, glu, prot, gram, serumGlu) {
  if (!lcrGluLow_(glu, serumGlu)) {
    alerts.push(
      "Meningitis bacteriana parcialmente tratada vs viral? (Leu " + leu + " \u2014 correlacionar cl\xEDnica)"
    );
    return;
  }
  if (prot != null && prot > 100) {
    pushLcrTbAlert_(alerts, leu, glu, prot);
    return;
  }
  pushLcrBacterialAlert_(alerts, leu, glu, gram);
}
function evaluarLcrEtiologia_(leu, glu, prot, gram, tinta, serumGlu) {
  var alerts = [];
  if (leu == null && glu == null && prot == null) return alerts;
  if (isLcrNormocellular_(leu, glu, prot, serumGlu)) return alerts;
  if (gramIsPositive_(gram) || lcrTintaSuggestive_(tinta)) {
    pushLcrBacterialAlert_(alerts, leu, glu, gram || tinta);
    return alerts;
  }
  if (leu == null) return alerts;
  if (leu >= 1e3) {
    pushLcrBacterialAlert_(alerts, leu, glu, gram);
    return alerts;
  }
  if (leu >= 100) {
    evaluarLcrLeu100Plus_(alerts, leu, glu, prot, gram, serumGlu);
    return alerts;
  }
  if (leu >= 10) {
    pushLcrViralAlert_(alerts, leu);
    return alerts;
  }
  if (leu > 5) {
    alerts.push("Pleocitosis leve LCR (Leu " + leu + ") \u2014 correlacionar cl\xEDnica");
  }
  return alerts;
}

// public/js/labs-citoquimico-interpret.mjs
var CITOQUIM_INTERPRETACION_HEADER = "INTERPRETACI\xD3N CITOQU\xCDMICO:";
var ASCITIS_INTERPRETACION_HEADER = "INTERPRETACI\xD3N ASCITIS:";
var CITOQUIM_INTERP_HEADERS = [
  CITOQUIM_INTERPRETACION_HEADER,
  ASCITIS_INTERPRETACION_HEADER,
  "INTERPRETACI\xD3N PLEURAL:"
];
function escapeRegExp_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function matchesInterpHeader_(head, header) {
  return new RegExp("^" + escapeRegExp_(header), "i").test(head);
}
function isCitoquimInterpretacionResLabChunk(text) {
  var head = String(text || "").split("\n")[0].trim();
  for (var i = 0; i < CITOQUIM_INTERP_HEADERS.length; i++) {
    if (matchesInterpHeader_(head, CITOQUIM_INTERP_HEADERS[i])) return true;
  }
  return false;
}
function formatCitoquimicoInterpretacionLine_(alerts) {
  var list = (alerts || []).filter(Boolean);
  if (!list.length) return "";
  return CITOQUIM_INTERPRETACION_HEADER + "	" + list.join(" \xB7 ");
}
function evaluarAscitisNoPortal_(gasa, protGdl, tglMgdl, amilUl, citologia) {
  if (gasa == null || gasa >= 1.1) return "";
  if (tglMgdl == null) {
    if (amilUl == null) return "Solicitar triglic\xE9ridos y amilasa en l\xEDquido asc\xEDtico";
    return "Solicitar triglic\xE9ridos en l\xEDquido asc\xEDtico";
  }
  if (tglMgdl > 200) return "Ascitis quilosa (TGL>200)";
  if (protGdl == null) return "Evaluar prote\xEDnas totales en l\xEDquido asc\xEDtico";
  if (protGdl < 2.5) return "S\xEDndrome nefr\xF3tico? (Prot<2.5; proteinuria 24h)";
  if (amilUl == null) {
    if (citologia === "positive") return "Carcinomatosis peritoneal? (citolog\xEDa +)";
    if (citologia === "negative") return "Peritonitis tuberculosa? (citolog\xEDa \u2212; BAAR, ADA, biopsia)";
    return "Solicitar amilasa y citolog\xEDa en l\xEDquido asc\xEDtico";
  }
  if (amilUl > 1e3) return "Ascitis pancre\xE1tica/perforaci\xF3n? (Amil>1000)";
  if (citologia == null) return "Solicitar citolog\xEDa de l\xEDquido asc\xEDtico";
  if (citologia === "positive") return "Carcinomatosis peritoneal? (citolog\xEDa +)";
  return "Peritonitis tuberculosa? (citolog\xEDa \u2212; BAAR, ADA, biopsia)";
}
function appendGasaAlerts_(alerts, parsed) {
  if (!parsed.alb) return;
  if (parsed.serumAlb == null) {
    alerts.push("Incluir alb\xFAmina s\xE9rica del mismo d\xEDa para calcular GASA");
    return;
  }
  if (parsed.gasaVal == null) return;
  if (parsed.gasaVal >= 1.1) {
    alerts.push("GASA " + parsed.gasaVal + " \u22651.1 \u2014 probable hipertensi\xF3n portal");
    return;
  }
  alerts.push("GASA " + parsed.gasaVal + " <1.1 \u2014 ascitis no portal");
  var dx = evaluarAscitisNoPortal_(
    parsed.gasaVal,
    parsed.protGdl,
    parsed.tgl,
    parsed.amil,
    parsed.citologia
  );
  if (dx) alerts.push(dx);
}
function buildAscitisLabAlerts_(textoBruto, serumOpts, parsedIn) {
  var parsed = parsedIn || parseCitoquimicoLiquidosParsed(textoBruto, serumOpts);
  if (!parsed || !parsed.esAscitico) return [];
  var alerts = evaluarPbeAscitis_(parsed.leu, parsed.pmnInfo, parsed.gram);
  appendGasaAlerts_(alerts, parsed);
  return alerts;
}
function buildPleuralLabAlerts_(textoBruto, serumOpts, parsedIn) {
  var parsed = parsedIn || parseCitoquimicoLiquidosParsed(textoBruto, serumOpts);
  if (!parsed || !parsed.esPleural) return [];
  var alerts = [];
  if (parsed.lightTxt) alerts.push(parsed.lightTxt);
  var inf = evaluarPleuralInfeccion_(parsed.pH, parsed.glu, parsed.leu);
  for (var i = 0; i < inf.length; i++) alerts.push(inf[i]);
  return alerts;
}
function buildLcrLabAlerts_(textoBruto, serumOpts) {
  var parsed = parseLcrParsed(textoBruto);
  if (!parsed) return [];
  var alerts = [];
  var phFlag = evaluarLcrPhSanity_(parsed.pH);
  if (phFlag) alerts.push(phFlag);
  var serumGlu = resolveSerumGlucoseForInterpret_(textoBruto, serumOpts);
  alerts = alerts.concat(
    evaluarLcrEtiologia_(
      parsed.leu,
      parsed.glu,
      parsed.protMgdl,
      parsed.gram,
      parsed.tinta,
      serumGlu
    )
  );
  return alerts;
}
function buildCitoquimicoInterpretAlerts_(textoBruto, serumOpts, parsedIn) {
  var parsed = parsedIn || parseCitoquimicoLiquidosParsed(textoBruto, serumOpts);
  var alerts = [];
  if (parsed && parsed.line) {
    alerts = alerts.concat(
      buildAscitisLabAlerts_(textoBruto, serumOpts, parsed),
      buildPleuralLabAlerts_(textoBruto, serumOpts, parsed)
    );
  }
  alerts = alerts.concat(buildLcrLabAlerts_(textoBruto, serumOpts));
  return alerts;
}
function parseLiqValuesFromResLabLine_(line) {
  var leuMatch = line.match(/\bLeu\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
  var pmnMatch = line.match(/\bPMN\s+([^\s]+)/i);
  var albMatch = line.match(/\bAlb\s+([0-9]+(?:[.,][0-9]+)?)\*?/i);
  var leuNum = leuMatch ? parseFluidLeu_(leuMatch[1]) : null;
  return {
    esAscitico: /\bASCIT|PERITONEAL|L[IÍ]QUIDO\s+ASCIT/i.test(line),
    esPleural: /\bPLEURAL\b/i.test(line),
    alb: albMatch ? parseFloat(String(albMatch[1]).replace(",", ".")) : null,
    leu: leuNum,
    pmnInfo: pmnMatch ? parsePmnField_(pmnMatch[1], leuNum) : { pmnNum: null, pmnPct: null, predominant: false },
    gram: (line.match(/\bGram\s+([^\s]+(?:\s+[^\s]+)*)/i) || [])[1] || "",
    serumAlb: null,
    gasaVal: null,
    protGdl: null,
    tgl: null,
    amil: null,
    citologia: null,
    lightTxt: "",
    pH: null,
    glu: null,
    line
  };
}
function ascitisParsedFromResLabsLiq_(resLabs) {
  var rows = resLabs || [];
  for (var i = 0; i < rows.length; i++) {
    var line = String(rows[i] || "");
    if (labSectionKey_(line) !== "LIQ:") continue;
    return parseLiqValuesFromResLabLine_(line);
  }
  return null;
}
function enrichAscitisGasa_(parsed, src, serumOpts) {
  if (parsed.alb == null || parsed.serumAlb != null) return;
  var serumAlb = resolveSerumAlbuminForGasa_(src, src ? bloqueCitoquimicoLiquidosFull(src) : "", serumOpts);
  if (serumAlb == null) return;
  parsed.serumAlb = serumAlb;
  parsed.gasaVal = computeGasaValue_(serumAlb, parsed.alb);
}
function replaceLiqLineFromSource_(out, src, serumOpts) {
  var newLiq = parsearCitoquimicoLiquidos(src, serumOpts);
  if (!newLiq) return out;
  return out.filter(function(r) {
    return labSectionKey_(r) !== "LIQ:";
  }).concat([newLiq]);
}
function updateLiqLineWithGasa_(out, parsed) {
  if (parsed.gasaVal == null || !parsed.line) return out;
  var liqLine = parsed.line;
  if (!/\bGASA\b/.test(liqLine)) {
    liqLine = liqLine + " GASA " + String(parsed.gasaVal);
  } else {
    liqLine = liqLine.replace(/\bGASA\s+[0-9]+(?:[.,][0-9]+)?/, "GASA " + String(parsed.gasaVal));
  }
  return out.filter(function(r) {
    return labSectionKey_(r) !== "LIQ:";
  }).concat([liqLine]);
}
function resLabsHasLcr_(resLabs) {
  return !!(resLabs || []).some(function(row) {
    return labSectionKey_(String(row || "")) === "LCR:";
  });
}
function resLabsHasCitoquimFluid_(resLabs) {
  return resLabsHasAsciticFluid_(resLabs) || resLabsHasPleuralFluid_(resLabs) || resLabsHasLcr_(resLabs);
}
function hasCitoquimRefreshTarget_(parsed, hasLcr) {
  if (hasLcr) return true;
  if (!parsed) return false;
  return parsed.esAscitico || parsed.esPleural || parsed.line;
}
function applyLiqLineRefresh_(out, src, serumOpts, parsed) {
  if (src) return replaceLiqLineFromSource_(out, src, serumOpts);
  if (parsed && parsed.esAscitico) return updateLiqLineWithGasa_(out, parsed);
  return out;
}
function refreshCitoquimicoInterpretacionInResLabs_(resLabs, textoBruto, serumOpts) {
  var rows = resLabs || [];
  var src = String(textoBruto || "").trim();
  var parsed = src ? parseCitoquimicoLiquidosParsed(src, serumOpts) : ascitisParsedFromResLabsLiq_(rows);
  var hasLcr = src ? !!parseLcrParsed(src) : resLabsHasLcr_(rows);
  if (!hasCitoquimRefreshTarget_(parsed, hasLcr)) return rows.slice();
  if (parsed && parsed.esAscitico) enrichAscitisGasa_(parsed, src, serumOpts);
  var out = rows.filter(function(r) {
    return !isCitoquimInterpretacionResLabChunk(r);
  });
  out = applyLiqLineRefresh_(out, src, serumOpts, parsed);
  var interpParsed = parsed && parsed.line ? parsed : null;
  var interp = formatCitoquimicoInterpretacionLine_(
    buildCitoquimicoInterpretAlerts_(src, serumOpts, interpParsed)
  );
  if (interp) out.push(interp);
  return dedupeSingletonSections_(out);
}

// public/js/labs-report-refs.mjs
var LAB_FECHA_MESES_ABBREV = { ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06", jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12", jan: "01", apr: "04", aug: "08", dec: "12" };
function padFechaDMY(d, m, yStr) {
  var y = String(yStr);
  if (y.length === 2) y = "20" + y;
  return String(d).padStart(2, "0") + "/" + String(m).padStart(2, "0") + "/" + y;
}
function extractLabReportFechaDMY(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var t = textoBruto;
  var m = t.match(/Fecha\s+Registro\s*:?\s*\r?\n?\s*([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/i);
  if (m) {
    var mon = LAB_FECHA_MESES_ABBREV[m[1].toLowerCase().slice(0, 3)];
    if (mon) return padFechaDMY(m[2], mon, m[3]);
  }
  var patronesNum = [
    /Fecha\s+(?:de\s+)?(?:Registro|resultado|Resultado|muestra|Muestra|emisi[oó]n|ingreso|extracci[oó]n)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
    /(?:Fecha|FECHA)\s+DEL\s+ESTUDIO\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
    /Recepci[oó]n\s*(?:de\s*)?(?:muestra)?\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i,
    /(?:Captura|Validaci[oó]n|Reporte)\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i
  ];
  for (var i = 0; i < patronesNum.length; i++) {
    m = t.match(patronesNum[i]);
    if (m) return padFechaDMY(m[1], m[2], m[3]);
  }
  var head = t.slice(0, 3200);
  m = head.match(/\bFecha\s*:\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/i);
  if (m) return padFechaDMY(m[1], m[2], m[3]);
  return "";
}
function looksLikeSomeLabReport(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return false;
  var t = textoBruto;
  if (!/Expediente\s*:/i.test(t)) return false;
  if (!/Nombre\s*:/i.test(t)) return false;
  return /Fecha\s+Registro/i.test(t) || /HEMATOLOG[IÍ]A|QU[IÍ]MICA|BIOMETR[IÍ]A|GASOMETR[IÍ]A|BANCO\s+DE\s+SANGRE|TROPONINA/i.test(t);
}
function applyMeridiemHour(hh, meridiemRaw) {
  if (!meridiemRaw) return hh;
  var t = String(meridiemRaw).toLowerCase().replace(/\./g, "").replace(/\s+/g, "");
  var isPm = t === "pm" || t === "p" || t.indexOf("pm") !== -1;
  var isAm = t === "am" || t === "a" || t.indexOf("am") !== -1;
  if (isPm && !isAm) {
    if (hh < 12) return hh + 12;
    return hh;
  }
  if (isAm && !isPm) {
    if (hh === 12) return 0;
    return hh;
  }
  return hh;
}
function horaFromFechaRegistroMatch(m) {
  if (!m) return "";
  var hh = parseInt(m[1], 10);
  var mm = parseInt(m[2], 10);
  if (!isFinite(hh) || !isFinite(mm)) return "";
  hh = applyMeridiemHour(hh, m[4]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}
function extractLabReportHora(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return "";
  var head = textoBruto.slice(0, 4e3);
  var m = head.match(
    /Fecha\s+Registro\s*:?[\s\t]*[A-Za-z]{3}\s+\d{1,2}\s+\d{4}\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i
  );
  if (m) return horaFromFechaRegistroMatch(m);
  m = head.match(
    /Fecha\s+Registro\s*:?[\s\t]*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*((?:a|p)\.?\s*m\.?|AM|PM)?/i
  );
  if (m) return horaFromFechaRegistroMatch(m);
  return "";
}
function putTrendRef_(refs, sectionKey, fieldKey, data) {
  if (!data || data.min == null || data.max == null) return;
  if (data.valor === "---" || data.valor == null) return;
  var min = Number(data.min);
  var max = Number(data.max);
  if (!isFinite(min) || !isFinite(max) || max <= min) return;
  if (!refs[sectionKey]) refs[sectionKey] = {};
  refs[sectionKey][fieldKey] = [min, max];
}
function someReportBlocks_(textoBruto) {
  var tNorm = textoBruto.replace(/\s+/g, " ");
  var mGaso = tNorm.match(
    /GASOMETRIA.*?(?=BIOMETRIA|CITOLOGIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CITOQUIMICO|$)/i
  );
  var bloqueGaso = mGaso ? mGaso[0] : "";
  var mLCR = textoBruto.match(/CITOQUIMICO\s+DE\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i) || textoBruto.match(/CITOQUIMICO\s+LIQ\.?\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i) || textoBruto.match(/CITOQUIMICO\s+LCR.*?(?=BACTERIOLOGIA|CUADERNILLO|$)/i);
  var bloqueLCR = mLCR ? mLCR[0] : "";
  var bloqueCitoLC = bloqueCitoquimicoLiquidosFull(textoBruto);
  var mEGO = tNorm.match(
    /(?:URIANALISIS|EXAMEN GENERAL DE ORINA|ANALISIS DE ORINA).*?(?=BACTERIOLOGIA|CULTIVO|COMENTARIO DE MUESTRA|$)/i
  );
  var bloqueEGO = mEGO ? mEGO[0] : "";
  var tSinLiqCorp = tNorm;
  if (bloqueCitoLC) {
    tSinLiqCorp = tNorm.replace(bloqueCitoLC.replace(/\r/g, "").replace(/\s+/g, " "), " ");
  }
  var textoQS = tSinLiqCorp.replace(bloqueGaso, " ").replace(bloqueEGO, " ").replace(bloqueLCR ? bloqueLCR.replace(/\s+/g, " ") : "", " ");
  var esSoloGaso = /GASOMETRIA/i.test(tNorm) && !/BIOMETRIA|QUIMICA|ELECTROLITOS|PFH|COAGULACION|CULTIVO/i.test(tNorm);
  return { tNorm, tSinLiqCorp, textoQS, bloqueGaso, esSoloGaso };
}
function putBhTrendRefs_(refs, tNorm) {
  putTrendRef_(refs, "BH", "Hb", extraerConRango(["HGB", "HEMOGLOBINA TOTAL", "HEMOGLOBINA"], tNorm));
  putTrendRef_(refs, "BH", "Hto", extraerConRango(["HCT ", "HEMATOCRITO"], tNorm));
  putTrendRef_(refs, "BH", "VCM", extraerConRango(["MCV ", "VCM "], tNorm));
  putTrendRef_(refs, "BH", "HCM", extraerConRango(["MCH ", "HCM "], tNorm));
  putTrendRef_(refs, "BH", "CHCM", extraerConRango(["MCHC", "CHCM"], tNorm));
  putTrendRef_(refs, "BH", "RDW", extraerConRango(["RDW "], tNorm));
  putTrendRef_(refs, "BH", "Leu", extraerConRango(["WBC "], tNorm));
  putTrendRef_(refs, "BH", "Neu", extraerConRango(["NEU "], tNorm));
  putTrendRef_(refs, "BH", "Eos", extraerConRango(["EOS "], tNorm));
  putTrendRef_(refs, "BH", "Lin", extraerConRango(["LYM ", "LINFOCITOS"], tNorm));
  putTrendRef_(refs, "BH", "Mono", extraerConRango(["MONO "], tNorm));
  putTrendRef_(refs, "BH", "Baso", extraerConRango(["BASO "], tNorm));
  putTrendRef_(refs, "BH", "Plt", extraerConRango(["PLT "], tNorm));
  putTrendRef_(refs, "BH", "MPV", extraerConRango(["MPV ", "VPM "], tNorm));
  putTrendRef_(refs, "BH", "RBC", extraerConRango(["RBC ", "ERITROCITOS", "HEMATIES"], tNorm));
  putTrendRef_(refs, "BH", "Ret", extraerConRango(["RETICULOCITOS"], tNorm));
  putTrendRef_(refs, "BH", "TP", extraerConRango(["TIEMPO DE PROTROMBINA"], tNorm));
  putTrendRef_(refs, "BH", "TTP", extraerConRango(["TIEMPO DE TROMBOPLASTINA"], tNorm));
  putTrendRef_(refs, "BH", "INR", extraerConRango(["INR ", "INR"], tNorm));
}
function putQsEscPfhTrendRefs_(refs, textoQS, tNorm) {
  putTrendRef_(refs, "QS", "Glu", extraerConRangoSuero(["GLUCOSA EN SANGRE", "GLUCOSA EN", "GLUCOSA"], textoQS));
  putTrendRef_(refs, "QS", "Cr", extraerConRangoSuero(["CREATININA EN SANGRE", "CREATININA"], textoQS));
  putTrendRef_(refs, "QS", "BUN", extraerConRangoSuero(["NITROGENO DE LA UREA EN SANGRE", "NITROGENO DE LA UREA", "UREA"], textoQS));
  putTrendRef_(refs, "QS", "PCR", extraerConRangoSuero(["PROTEINA C REACTIVA", "PROTE\xCDNA C REACTIVA"], textoQS));
  putTrendRef_(refs, "QS", "PCT", extraerProcalcitonina_(textoQS));
  putTrendRef_(refs, "QS", "AU", extraerConRangoSuero(["ACIDO URICO EN SANGRE", "ACIDO URICO", "\xC1CIDO \xDARICO"], textoQS));
  putTrendRef_(refs, "QS", "COL", extraerConRangoSuero(["COLESTEROL"], textoQS));
  putTrendRef_(refs, "QS", "HDL", extraerConRangoSuero(["COLESTEROL HDL", "HDL COLESTEROL"], textoQS));
  putTrendRef_(refs, "QS", "LDL", extraerConRangoSuero(["COLESTEROL LDL", "LDL COLESTEROL"], textoQS));
  putTrendRef_(refs, "QS", "VLDL", extraerConRangoSuero(["VLDL"], textoQS));
  putTrendRef_(refs, "QS", "TGL", extraerConRangoSuero(["TRIGLICERIDOS", "TRIGLIC\xC9RIDOS"], textoQS));
  putTrendRef_(refs, "QS", "IA", extraerIndiceAterogenico_(textoQS));
  putTrendRef_(
    refs,
    "QS",
    "CTHDL",
    extraerConRangoSuero(["COCIENTE COL.TOT/HDL", "COCIENTE COL.TOT / HDL", "COCIENTE COL TOT/HDL"], textoQS)
  );
  putTrendRef_(refs, "QS", "VSG", extraerConRangoSuero(["VSG ", "VELOCIDAD DE SEDIMENTACION"], textoQS));
  putTrendRef_(refs, "QS", "CPK", extraerConRangoSuero(["CPK CREATIN FOSFO QUINASA", "CPK "], textoQS));
  putTrendRef_(refs, "ESC", "Na", extraerConRangoSuero(["SODIO"], textoQS));
  putTrendRef_(refs, "ESC", "Cl", extraerConRangoSuero(["CLORO"], textoQS));
  putTrendRef_(refs, "ESC", "K", extraerConRangoSuero(["POTASIO"], textoQS));
  putTrendRef_(refs, "ESC", "Ca", extraerConRangoSuero(["CALCIO EN SUERO", "CALCIO"], textoQS));
  putTrendRef_(refs, "ESC", "F", extraerConRangoSuero(["FOSFORO EN SANGRE", "FOSFORO", "F\xD3SFORO"], textoQS));
  putTrendRef_(refs, "ESC", "Mg", extraerConRangoSuero(["MAGNESIO"], textoQS));
  putTrendRef_(refs, "PFHs", "Alb", extraerConRangoSuero(["ALBUMINA"], tNorm));
  putTrendRef_(refs, "PFHs", "AST", extraerConRango(["AST(ASPARTATO AMINOTRANSFERASA)", "AST "], tNorm));
  putTrendRef_(refs, "PFHs", "ALT", extraerConRango(["ALT ALANIN AMINO TRANSFERASA", "ALT "], tNorm));
  putTrendRef_(refs, "PFHs", "FA", extraerConRango(["ALP FOSFATASA ALCALINA", "FOSFATASA ALCALINA"], tNorm));
  putTrendRef_(refs, "PFHs", "BT", extraerConRango(["BILIRRUBINA TOTAL"], tNorm));
  putTrendRef_(refs, "PFHs", "BD", extraerConRango(["BILIRRUBINA DIRECTA"], tNorm));
  putTrendRef_(refs, "PFHs", "BI", extraerConRango(["BILIRRUBINA INDIRECTA"], tNorm));
  putTrendRef_(refs, "PFHs", "LDH", extraerConRango(["LDH DESHIDROGENASA LACTICA", "LDH DESHIDROGENASA LAC", "LDH "], tNorm));
  putTrendRef_(refs, "PFHs", "Amil", extraerConRango(["AMILASA SERICA", "AMILASA"], tNorm));
  putTrendRef_(refs, "LIPASA", "Lip", extraerConRango(["LIPASA SERICA", "LIPASA "], textoQS));
}
function putTropTrendRefs_(refs, textoBruto) {
  var tropHits = extractAllTroponinaFromText_(textoBruto);
  if (!tropHits.length) return;
  var tropMax = TROPONINA_HS_NORMAL_MAX_NG_L;
  var tropMin = 0;
  var first = tropHits[0];
  if (first.max != null && first.min != null && first.max > first.min) {
    tropMin = first.min;
    tropMax = first.max;
  }
  putTrendRef_(refs, "TROP", "TnI1", { valor: first.valor, min: tropMin, max: tropMax });
  if (tropHits.length > 1) {
    var last = tropHits[tropHits.length - 1];
    putTrendRef_(refs, "TROP", "TnI2", { valor: last.valor, min: tropMin, max: tropMax });
  }
}
function putGasoTrendRefs_(refs, bloqueGaso) {
  if (!bloqueGaso) return;
  putTrendRef_(refs, "GASES", "pH", extraerConRango(["PH "], bloqueGaso));
  putTrendRef_(refs, "GASES", "pCO2", extraerConRango(["PCO2"], bloqueGaso));
  putTrendRef_(refs, "GASES", "pO2", extraerConRango(["PO2 "], bloqueGaso));
  putTrendRef_(refs, "GASES", "Na", extraerConRango(["SODIO"], bloqueGaso));
  putTrendRef_(refs, "GASES", "K", extraerConRango(["POTASIO"], bloqueGaso));
  putTrendRef_(refs, "GASES", "GLU", extraerConRango(["GLUCOSA"], bloqueGaso));
  putTrendRef_(refs, "GASES", "Lactato", extraerConRango(["LACTATO"], bloqueGaso));
  putTrendRef_(refs, "GASES", "Bica", extraerConRango(["HCO3"], bloqueGaso));
  putTrendRef_(refs, "GASES", "Hto", extraerConRango(["HCT ", "HEMATOCRITO"], bloqueGaso));
  var iCaData = extraerConRango(["CA++ IONIZADO", "CALCIO IONIZADO", "CA IONIZADO"], bloqueGaso);
  putTrendRef_(refs, "GASES", "iCa", {
    valor: iCaData.valor,
    min: iCaData.min != null ? iCaData.min : 1.12,
    max: iCaData.max != null ? iCaData.max : 1.32
  });
}
function buildRefsBySectionFromReport(textoBruto) {
  if (!textoBruto || typeof textoBruto !== "string") return {};
  var blocks = someReportBlocks_(textoBruto);
  var refs = {};
  if (!blocks.esSoloGaso) {
    putBhTrendRefs_(refs, blocks.tSinLiqCorp);
    putQsEscPfhTrendRefs_(refs, blocks.textoQS, blocks.tSinLiqCorp);
  }
  putTropTrendRefs_(refs, textoBruto);
  putGasoTrendRefs_(refs, blocks.bloqueGaso);
  return refs;
}

// public/js/labs-panel-defs.mjs
var LAB_EXTENDED_PANEL_DEFS = [
  {
    sectionKey: "TIR",
    mode: "num",
    gates: [/\bTSH\b/i, /T4\s*LIBRE/i, /TIROXINA\s+LIBRE/i, /TIROIDES/i],
    fields: [
      { key: "TSH", labels: ["TSH", "HORMONA ESTIMULANTE DE LA TIROIDES", "HORMONA ESTIMULANTE DE TIROIDES"] },
      { key: "T4L", labels: ["T4 LIBRE", "TIROXINA LIBRE", "FT4"] },
      { key: "T3L", labels: ["T3 LIBRE", "TRIYODOTIRONINA LIBRE", "FT3"] },
      { key: "T4T", labels: ["T4 TOTAL", "TIROXINA TOTAL"] },
      { key: "T3T", labels: ["T3 TOTAL", "TRIYODOTIRONINA TOTAL"] },
      { key: "AntiTPO", labels: ["ANTI TPO", "ANTICUERPOS ANTI TPO", "ANTI-TPO"] },
      { key: "AntiTg", labels: ["ANTI TIROGLOBULINA", "ANTICUERPOS ANTI TIROGLOBULINA", "ANTI-TG"] }
    ]
  },
  {
    sectionKey: "ENDO",
    mode: "num",
    gates: [
      /HEMOGLOBINA\s+GLICOSILADA/i,
      /\bHBA1C\b/i,
      /\bCORTISOL\b/i,
      /\bPTH\b/i,
      /VITAMINA\s+D/i,
      /\bINSULINA\b/i,
      /PEPTIDO\s+C/i,
      /PROLACTINA/i
    ],
    fields: [
      { key: "HbA1c", labels: ["HEMOGLOBINA GLICOSILADA", "HBA1C", "HB A1C"] },
      { key: "Cortisol", labels: ["CORTISOL"] },
      { key: "PTH", labels: ["PTH", "HORMONA PARATIROIDEA", "PARATHORMONA"] },
      { key: "VitD", labels: ["VITAMINA D 25 OH", "VITAMINA D 25-OH", "25-OH VITAMINA D", "VITAMINA D"] },
      { key: "Insulina", labels: ["INSULINA"] },
      { key: "PepC", labels: ["PEPTIDO C", "P\xC9PTIDO C"] },
      { key: "PRL", labels: ["PROLACTINA"] },
      { key: "LH", labels: ["HORMONA LUTEINIZANTE", "LH "] },
      { key: "FSH", labels: ["HORMONA FOLICULO ESTIMULANTE", "FSH "] },
      { key: "E2", labels: ["ESTRADIOL"] },
      { key: "Testo", labels: ["TESTOSTERONA"] },
      { key: "bHCG", labels: ["BETA HCG", "BHCG", "GONADOTROFINA CORIONICA"] }
    ]
  },
  {
    sectionKey: "CARD",
    mode: "num",
    gates: [/NT-?PROBNP/i, /\bBNP\b/i, /CK-?MB/i, /MIOGLOBINA/i],
    fields: [
      { key: "NTproBNP", labels: ["NT-PROBNP", "NT PROBNP", "NTproBNP"] },
      { key: "BNP", labels: ["BNP ", "PEPTIDO NATRIURETICO"] },
      { key: "CKMB", labels: ["CK-MB", "CK MB", "CKMB"] },
      { key: "Mio", labels: ["MIOGLOBINA"] }
    ]
  },
  {
    sectionKey: "FE",
    mode: "num",
    gates: [/HIERRO\s+SERICO/i, /\bFERRITINA\b/i, /SATURACION\s+DE\s+TRANSFERRINA/i, /FIJACION\s+DE\s+HIERRO/i],
    fields: [
      { key: "Fe", labels: ["HIERRO SERICO", "HIERRO S\xC9RICO", "HIERRO "] },
      { key: "TIBC", labels: ["CAPACIDAD DE FIJACION DE HIERRO", "TIBC", "CTFH"] },
      { key: "Sat", labels: ["% DE SATURACION DE TRANSFERRINA", "SATURACION DE TRANSFERRINA", "% SATURACION"] },
      { key: "Ferr", labels: ["FERRITINA"] },
      { key: "Transf", labels: ["TRANSFERRINA"] }
    ]
  },
  {
    sectionKey: "INFL",
    mode: "num",
    gates: [/FACTOR\s+REUMATOIDE/i, /IGE\s+TOTAL/i, /INMUNOGLOBULINA\s+E/i],
    fields: [
      { key: "FR", labels: ["FACTOR REUMATOIDE"] },
      { key: "IgE", labels: ["IGE TOTAL", "INMUNOGLOBULINA E"] }
    ]
  },
  {
    sectionKey: "INM",
    mode: "num",
    gates: [/COMPLEMENTO\s+C3/i, /COMPLEMENTO\s+C4/i, /\bC3\b/i, /\bC4\b/i],
    fields: [
      { key: "C3", labels: ["COMPLEMENTO C3"] },
      { key: "C4", labels: ["COMPLEMENTO C4"] },
      { key: "IgG", labels: ["INMUNOGLOBULINA G"] },
      { key: "IgA", labels: ["INMUNOGLOBULINA A"] },
      { key: "IgM", labels: ["INMUNOGLOBULINA M"] }
    ]
  },
  {
    sectionKey: "META",
    mode: "num",
    gates: [/\bAMONIO\b/i, /OSMOLARIDAD\s+SERICA/i, /OSMOLALIDAD\s+SERICA/i, /LACTATO\s+SERICO/i],
    fields: [
      { key: "NH3", labels: ["AMONIO"] },
      { key: "Osm", labels: ["OSMOLARIDAD SERICA", "OSMOLALIDAD SERICA", "OSMOLARIDAD"] },
      { key: "LacS", labels: ["LACTATO SERICO", "LACTATO S\xC9RICO"] }
    ]
  },
  {
    sectionKey: "NEF",
    mode: "num",
    gates: [/CISTATINA\s+C/i, /MICROALBUMINURIA/i, /ALBUMINA\s*\/\s*CREATININA/i, /PROTEINA\s*\/\s*CREATININA/i],
    fields: [
      { key: "CysC", labels: ["CISTATINA C"] },
      { key: "AlbCr", labels: ["MICROALBUMINURIA", "ALBUMINA/CREATININA", "ALBUMINA / CREATININA", "RELACION ALBUMINA CREATININA"] },
      { key: "ProtCr", labels: ["PROTEINA/CREATININA", "PROTEINA / CREATININA", "RELACION PROTEINA CREATININA"] }
    ]
  },
  {
    sectionKey: "NIVEL",
    mode: "num",
    gates: [
      /VANCOMICINA/i,
      /DIGOXINA/i,
      /\bLITIO\b/i,
      /ACIDO\s+VALPROICO/i,
      /CARBAMAZEPINA/i,
      /FENITOINA/i,
      /TACROLIMUS/i,
      /CICLOSPORINA/i
    ],
    fields: [
      { key: "Vanco", labels: ["VANCOMICINA"] },
      { key: "Dig", labels: ["DIGOXINA"] },
      { key: "Li", labels: ["LITIO"] },
      { key: "VPA", labels: ["ACIDO VALPROICO", "\xC1CIDO VALPROICO", "VALPROATO"] },
      { key: "Carb", labels: ["CARBAMAZEPINA"] },
      { key: "Fenit", labels: ["FENITOINA", "FENITO\xCDNA"] },
      { key: "Tacro", labels: ["TACROLIMUS"] },
      { key: "Ciclo", labels: ["CICLOSPORINA"] }
    ]
  },
  {
    sectionKey: "TM",
    mode: "num",
    gates: [/\bAFP\b/i, /\bCEA\b/i, /CA\s*125/i, /CA\s*19-?9/i, /CA\s*15-?3/i, /\bPSA\b/i],
    fields: [
      { key: "AFP", labels: ["AFP", "ALFA FETOPROTEINA", "ALFAFETOPROTEINA"] },
      { key: "CEA", labels: ["CEA", "ANTIGENO CARCINOEMBRIONARIO"] },
      { key: "CA125", labels: ["CA 125", "CA125"] },
      { key: "CA199", labels: ["CA 19-9", "CA 199", "CA19-9"] },
      { key: "CA153", labels: ["CA 15-3", "CA 153", "CA15-3"] },
      { key: "PSA", labels: ["PSA", "ANTIGENO PROSTATICO"] }
    ]
  },
  {
    sectionKey: "NUT",
    mode: "num",
    gates: [/VITAMINA\s+B12/i, /ACIDO\s+FOLICO/i, /ÁCIDO\s+FÓLICO/i, /\bFOLATO\b/i],
    fields: [
      { key: "B12", labels: ["VITAMINA B12", "COBALAMINA"] },
      { key: "Fol", labels: ["ACIDO FOLICO", "\xC1CIDO F\xD3LICO", "FOLATO"] }
    ]
  },
  {
    sectionKey: "GI",
    mode: "num",
    gates: [/CALPROTECTINA/i, /ELASTASA\s+FECAL/i],
    fields: [
      { key: "Calpro", labels: ["CALPROTECTINA FECAL", "CALPROTECTINA"] },
      { key: "Elast", labels: ["ELASTASA FECAL", "ELASTASA PANCREATICA"] }
    ]
  },
  {
    sectionKey: "GI",
    mode: "qual",
    gates: [/SANGRE\s+OCULTA/i],
    fields: [
      { key: "SOH", patterns: [/SANGRE\s+OCULTA\s+EN\s+HECES/i, /SANGRE\s+OCULTA/i] }
    ]
  },
  {
    sectionKey: "TOX",
    mode: "num",
    gates: [/\bETANOL\b/i, /PARACETAMOL/i, /ACETAMINOFEN/i, /SALICILATO/i, /CARBOXIHEMOGLOBINA/i, /METAHEMOGLOBINA/i],
    fields: [
      { key: "EtOH", labels: ["ETANOL"] },
      { key: "APAP", labels: ["PARACETAMOL", "ACETAMINOFEN", "ACETAMINOF\xC9N"] },
      { key: "ASA", labels: ["SALICILATOS", "SALICILATO"] },
      { key: "COHb", labels: ["CARBOXIHEMOGLOBINA", "COHB"] },
      { key: "MetHb", labels: ["METAHEMOGLOBINA", "METHB"] }
    ]
  },
  {
    sectionKey: "HEPB",
    mode: "qual",
    gates: [/ANTI-?HBS/i, /ANTI-?HBC/i, /HBEAG/i, /ANTI-?HBE/i, /ANTICUERPOS\s+ANTI-?HBS/i],
    fields: [
      { key: "AntiHBs", patterns: [/ANTICUERPOS\s+ANTI-?HBS/i, /ANTI-?HBS/i, /ANTI\s+HBS/i] },
      { key: "AntiHBc", patterns: [/ANTICUERPOS\s+ANTI-?HBC/i, /ANTI-?HBC\s+IG\s*M/i, /ANTI-?HBC/i] },
      { key: "HBeAg", patterns: [/ANTIGENO\s+E.*HEPATITIS\s+B/i, /\bHBEAG\b/i] },
      { key: "AntiHBe", patterns: [/ANTICUERPOS\s+ANTI-?HBE/i, /ANTI-?HBE/i] }
    ]
  },
  {
    sectionKey: "VIRAL",
    mode: "qual",
    gates: [/\bVDRL\b/i, /RPR\b/i, /TOXOPLASMA/i, /\bCMV\b/i, /\bEBV\b/i, /RUBEOLA/i, /HERPES/i],
    fields: [
      { key: "VDRL", patterns: [/\bVDRL\b/i, /\bRPR\b/i] },
      { key: "ToxoIgM", patterns: [/IGM\s+TOXOPLASMA/i, /TOXOPLASMA\s+IGM/i, /ANTICUERPOS\s+IGM\s+TOXOPLASMA/i] },
      { key: "ToxoIgG", patterns: [/IGG\s+TOXOPLASMA/i, /TOXOPLASMA\s+IGG/i] },
      { key: "CMVIgM", patterns: [/CMV\s+IGM/i, /IGM\s+CITOMEGALOVIRUS/i] },
      { key: "EBVIgM", patterns: [/EBV\s+IGM/i, /VCA\s+IGM/i] },
      { key: "RubIgM", patterns: [/RUBEOLA\s+IGM/i, /IGM\s+RUBEOLA/i] }
    ]
  },
  {
    sectionKey: "MICRO",
    mode: "qual",
    gates: [
      /LEGIONELLA\s+EN\s+ORINA/i,
      /NEUMOCOCO\s+EN\s+ORINA/i,
      /ESTREPTOCOCO\s+A/i,
      /INFLUENZA/i,
      /CLOSTRIDIUM\s+DIFFICILE/i,
      /C\.\s*DIFF/i
    ],
    fields: [
      { key: "LegAg", patterns: [/ANTIGENO\s+LEGIONELLA\s+EN\s+ORINA/i, /LEGIONELLA\s+EN\s+ORINA/i] },
      { key: "PneuAg", patterns: [/ANTIGENO\s+NEUMOCOCO\s+EN\s+ORINA/i, /NEUMOCOCO\s+EN\s+ORINA/i] },
      { key: "StrepA", patterns: [/ESTREPTOCOCO\s+DEL\s+GRUPO\s+A/i, /ESTREPTOCOCO\s+A/i] },
      { key: "FluAg", patterns: [/ANTIGENO\s+INFLUENZA/i, /INFLUENZA\s+A\s*\/\s*B/i] },
      { key: "Cdiff", patterns: [/CLOSTRIDIUM\s+DIFFICILE/i, /C\.\s*DIFFICILE/i, /TOXINA\s+C\.\s*DIFF/i] }
    ]
  }
];
var LAB_EXTENDED_SECTION_KEYS = (function() {
  var seen = /* @__PURE__ */ Object.create(null);
  var keys = [];
  for (var i = 0; i < LAB_EXTENDED_PANEL_DEFS.length; i++) {
    var k = LAB_EXTENDED_PANEL_DEFS[i].sectionKey;
    if (seen[k]) continue;
    seen[k] = 1;
    keys.push(k);
  }
  return keys;
})();

// public/js/labs-panel-overlay.mjs
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function hydrateGate(g2) {
  if (typeof g2 !== "string") return g2;
  if (/[\\^$*+?()|[\]{}]/.test(g2)) return new RegExp(g2, "i");
  return new RegExp(escapeRe(g2), "i");
}
function hydrateField(f) {
  if (!f) return f;
  if (f.patterns) {
    return {
      key: f.key,
      patterns: (f.patterns || []).map(hydrateGate)
    };
  }
  return { key: f.key, labels: (f.labels || []).slice() };
}
function cloneDef(def) {
  return {
    sectionKey: def.sectionKey,
    mode: def.mode,
    gates: (def.gates || []).slice(),
    fields: (def.fields || []).map(function(f) {
      if (f.patterns) {
        return { key: f.key, patterns: f.patterns.slice() };
      }
      return { key: f.key, labels: (f.labels || []).slice() };
    })
  };
}
function findBuiltinIndex(list, rec) {
  var baseKey = rec.baseSectionKey || rec.sectionKey;
  var mode = rec.mode || "num";
  for (var i = 0; i < list.length; i++) {
    if (list[i].sectionKey === baseKey && list[i].mode === mode) return i;
  }
  return -1;
}
function overlayRecordToPanelDef(rec) {
  var gates = (rec.gates || []).map(hydrateGate);
  var fields = (rec.fields || []).map(hydrateField);
  return { sectionKey: rec.sectionKey, mode: rec.mode || "num", gates, fields };
}
function applyOverlayToBuiltins(builtins, overlayArr) {
  var list = (builtins || []).map(cloneDef);
  (overlayArr || []).forEach(function(rec) {
    if (String(rec.panelId || "").indexOf("builtin:") === 0) {
      var idx = findBuiltinIndex(list, rec);
      if (idx >= 0) list[idx] = overlayRecordToPanelDef(rec);
      else list.push(overlayRecordToPanelDef(rec));
    } else {
      list.push(overlayRecordToPanelDef(rec));
    }
  });
  return list;
}

// public/js/labs-panel-overlay-store.mjs
var LS_KEY = "rpc-lab-panel-overlay";
var memory = null;
function loadLabPanelOverlays() {
  if (memory !== null) return memory.slice();
  memory = [];
  try {
    if (typeof localStorage !== "undefined") {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.overlays)) {
          memory = parsed.overlays.slice();
        }
      }
    }
  } catch {
  }
  return memory.slice();
}
function getEffectivePanelDefs() {
  return applyOverlayToBuiltins(LAB_EXTENDED_PANEL_DEFS, loadLabPanelOverlays());
}

// public/js/labs-panel-parse.mjs
function panelGatesMatch_(def, texto) {
  var gates = def.gates || [];
  if (!gates.length) return true;
  for (var i = 0; i < gates.length; i++) {
    if (gates[i].test(texto)) return true;
  }
  return false;
}
function fmtNumField_(labels, texto, fieldKey, priorRefs) {
  var data = extraerConRangoPanel(labels, texto);
  return fmtLabRanged_(data, fieldKey, priorRefs);
}
function parseNumericPanel_(def, texto, priorRefs) {
  if (!texto || !panelGatesMatch_(def, texto)) return "";
  var parts = [];
  for (var i = 0; i < def.fields.length; i++) {
    var f = def.fields[i];
    var val = fmtNumField_(f.labels, texto, f.key, priorRefs);
    if (val !== "---") parts.push(f.key, val);
  }
  if (!parts.length) return "";
  return def.sectionKey + "	" + parts.join(" ");
}
function formatQualSco_(raw) {
  var n = parseFloat(String(raw || "").replace(",", "."));
  if (!isFinite(n)) return String(raw || "").trim();
  return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
function qualShort_(qual) {
  var q = String(qual || "").toUpperCase();
  if (q === "NEGATIVO") return "neg";
  if (q === "POSITIVO") return "pos*";
  if (q === "INDETERMINADO") return "indet*";
  return "";
}
function lineMatchesPatterns_(line, patterns) {
  for (var p = 0; p < patterns.length; p++) {
    if (patterns[p].test(line)) return true;
  }
  return false;
}
function isQualFollowNoiseLine_(t) {
  if (!t || t === ":") return true;
  if (/^ESTUDIO|RESULTADO|UNIDADES|VALOR DE REFERENCIA$/i.test(t)) return true;
  if (/^S\/CO$/i.test(t)) return true;
  if (/^(Positivo|Indeterminado|Negativo)\s*[<>=]/i.test(t)) return true;
  return false;
}
function qualDupTitleDecision_(t, j, i, sco, qual) {
  if (!/^(Anticuerpos|Ant[ií]geno|Antigeno)\b/i.test(t) || j <= i + 1) return "none";
  if (sco == null && !qual) return "skip";
  return "break";
}
function readQualFromFollowLines_(lineas, i) {
  var sco = null;
  var qual = "";
  for (var j = i + 1; j < Math.min(i + 12, lineas.length); j++) {
    var t = String(lineas[j] || "").replace(/\*/g, "").trim();
    if (isQualFollowNoiseLine_(t)) continue;
    var dup = qualDupTitleDecision_(t, j, i, sco, qual);
    if (dup === "skip") continue;
    if (dup === "break") break;
    var mNum = t.match(/^(\d+\.\d+|\d+)$/);
    if (mNum && sco === null) {
      sco = mNum[1];
      continue;
    }
    var mQ = t.match(/^(NEGATIVO|POSITIVO|INDETERMINADO)$/i);
    if (mQ) {
      qual = mQ[1].toUpperCase();
      break;
    }
  }
  return qual ? { sco, qual } : null;
}
function extractQualField_(lineas, patterns) {
  for (var i = 0; i < lineas.length; i++) {
    var line = String(lineas[i] || "").replace(/\t.*$/, "").trim();
    if (!line || !lineMatchesPatterns_(line, patterns)) continue;
    return readQualFromFollowLines_(lineas, i);
  }
  return null;
}
function parseQualPanel_(def, texto) {
  if (!texto || !panelGatesMatch_(def, texto)) return "";
  var lineas = texto.split(/\r?\n/).map(function(l) {
    return String(l || "").trim();
  });
  var parts = [];
  for (var e = 0; e < def.fields.length; e++) {
    var f = def.fields[e];
    var res = extractQualField_(lineas, f.patterns);
    if (!res || !res.qual) continue;
    var q = qualShort_(res.qual);
    if (!q) continue;
    var token = f.key + " " + q;
    if (res.sco != null) token += " (" + formatQualSco_(res.sco) + ")";
    parts.push(token);
  }
  if (!parts.length) return "";
  return def.sectionKey + "	" + parts.join(" ");
}
function parsePanelDef_(def, texto, priorRefs) {
  if (!def) return "";
  if (def.mode === "qual") return parseQualPanel_(def, texto);
  return parseNumericPanel_(def, texto, priorRefs);
}
function mergeSectionLines_(lines) {
  var bodies = /* @__PURE__ */ Object.create(null);
  var order = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var tab = line.indexOf("	");
    if (tab < 0) continue;
    var key = line.slice(0, tab);
    var body = line.slice(tab + 1).trim();
    if (!body) continue;
    if (!bodies[key]) {
      bodies[key] = [];
      order.push(key);
    }
    bodies[key].push(body);
  }
  return order.map(function(k) {
    return k + "	" + bodies[k].join(" ");
  });
}
function parseExtendedLabPanels_(textoBruto, priorRefsBySection) {
  if (!textoBruto || typeof textoBruto !== "string") return [];
  var out = [];
  var defs = getEffectivePanelDefs();
  var priorMap = priorRefsBySection && typeof priorRefsBySection === "object" ? priorRefsBySection : null;
  for (var i = 0; i < defs.length; i++) {
    var def = defs[i];
    var prior = priorMap && def ? priorMap[def.sectionKey] : null;
    var line = parsePanelDef_(def, textoBruto, prior);
    if (line) out.push(line);
  }
  return mergeSectionLines_(out);
}

// public/js/labs.js
var procesarLabs = createProcesarLabs({
  bloqueCitoquimicoLiquidosFull,
  dedupeSingletonSections_,
  buildRefsBySectionFromReport,
  extractLabReportFechaDMY,
  extractLabReportHora,
  parseBH_,
  parseQS_,
  parseESC_,
  parsePFH_,
  parseLipasa_,
  parseTroponina_,
  parseGrupoSangreCoombs_,
  parsePlaquetasCitrato_,
  parseGaso_,
  parsePIE_,
  parsearLCR,
  parsearCitoquimicoLiquidos,
  formatCitoquimicoInterpretacionLine_,
  buildCitoquimicoInterpretAlerts_,
  parseFisicoquimicoHeces_,
  parseFrotisSangre_,
  parseEGO_,
  parseCuantOrina_,
  parseCultivo_,
  parseSerologiaBancoSangre_,
  parseExtendedLabPanels_
});

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
  escTxt,
  isLabSectionHeaderHtml,
  renderEntry,
  collectPriorRefsFromHistory,
  mergeGasRefs_,
  computeAnionGapValue_,
  computeAlbuminCorrectedAnionGapValue_,
  computeUrinaryAnionGapValue_,
  reprocessLabResultLines_,
  sortTrendSpecsBySomeOrder,
  bhTrendDisplayTitle,
  formatBhExtrasDisplayLine,
  mergeCoagResLabRows_,
  mergeBhResLabRows_,
  parseCuentaFromCultivoChunkLines,
  formatCultivoCondensedForCopy,
  buildAtbRisSummaryHtml,
  extractSensCrudasForGermFromSource,
  isParsedCultivoHeaderLine,
  mergeQsResLabRows_,
  mergeEscResLabRows_,
  mergePfhResLabRows_,
  mergeLipasaResLabRows_,
  mergeTroponinaResLabRows_,
  sortResLabsByClinicalOrder,
  looksLikeLabSectionChunk,
  sanitizeResLabsChunks,
  extractLabExpedienteFromReport,
  isCitoquimInterpretacionResLabChunk,
  resLabsHasCitoquimFluid_,
  refreshCitoquimicoInterpretacionInResLabs_,
  looksLikeSomeLabReport,
  extractLabReportHora,
  buildRefsBySectionFromReport,
  LAB_EXTENDED_PANEL_DEFS,
  procesarLabs,
  parsearSecciones,
  extractParsedValues,
  buildParsedBySectionFromResLabs,
  seedPitchDemo,
  clearPitchDemo
};
//# sourceMappingURL=/js/chunks/chunk-WKKCGK2F.js.map
