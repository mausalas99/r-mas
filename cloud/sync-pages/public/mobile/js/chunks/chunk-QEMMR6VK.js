import {
  storage
} from "/mobile/js/chunks/chunk-EZ7GA6IL.js";

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
  const { patients, setPatients, persistClinicalState } = state;
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
  persistClinicalState({ immediate: true });
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

// public/js/clinical-read-model-demo.mjs
var demoPatients = [];
function isPitchTourActive() {
  try {
    if (isPitchPatientIsolationActive()) return true;
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(PITCH_TOUR_ACTIVE_SS_KEY) === "1";
  } catch {
    return false;
  }
}
function getPatientsForDisplay(baseGetPatients) {
  const base = typeof baseGetPatients === "function" ? baseGetPatients() : [];
  const list = Array.isArray(base) ? base : [];
  if (!isPitchTourActive()) return list;
  if (isPitchPatientIsolationActive() && demoPatients.length) {
    return demoPatients.slice();
  }
  return [...demoPatients, ...list.filter((p) => p && !p.isDemo)];
}
function setDemoPatients(list) {
  demoPatients = Array.isArray(list) ? list.slice() : [];
}
function getDemoPatients() {
  return demoPatients.slice();
}

export {
  PITCH_DEMO_PATIENT_ID,
  PITCH_DEMO_PATIENT_ID_LEGACY,
  readPitchSandboxBackup,
  clearPitchSandboxBackup,
  markPitchTourSessionActive,
  capturePitchSandbox,
  restorePitchPatientsBackup,
  clearPitchPatientsBackup,
  resolvePitchPersistPatients,
  tryRecoverPatientsFromPitchSandboxIfNeeded,
  setPitchPatientIsolation,
  isPitchPatientIsolationActive,
  getPatientsForDisplay,
  setDemoPatients,
  getDemoPatients
};
//# sourceMappingURL=/js/chunks/chunk-QEMMR6VK.js.map
