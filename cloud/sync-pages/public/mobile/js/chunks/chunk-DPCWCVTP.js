import {
  assignPatientToTeamClinical,
  clearPatientDeleteTombstoneForAdmit,
  patientsBridge,
  readPatientRegistrationTeamId
} from "/mobile/js/chunks/chunk-OJH7L2CJ.js";
import {
  closePatientDatosModal
} from "/mobile/js/chunks/chunk-C6TP3H7V.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-WOP35WT6.js";
import {
  ensureMonitoreo,
  indicaciones,
  labHistory,
  listadoProblemas,
  medPharmProfileByPatient,
  medRecetaByPatient,
  notes,
  patients,
  saveState,
  stampPatientRegistrationMeta,
  vpoByPatient
} from "/mobile/js/chunks/chunk-JZ2SPQIK.js";
import {
  esc
} from "/mobile/js/chunks/chunk-NIMNG7BY.js";
import {
  storage
} from "/mobile/js/chunks/chunk-76D6GOCM.js";
import {
  closeModalAnimated
} from "/mobile/js/chunks/chunk-VTSC3E5H.js";
import {
  rt
} from "/mobile/js/chunks/chunk-LSPMPOB5.js";
import {
  stampPatientClinicalSala
} from "/mobile/js/chunks/chunk-HMTHREEE.js";
import {
  CLINICAL_SALA_VALUES
} from "/mobile/js/chunks/chunk-CRJYUJ23.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-LMOJUVZ4.js";

// public/js/tour-demo-patient.mjs
var DEMO_PATIENT_ID = "demo-onboarding";
var DEMO_PATIENT_ID_2 = "demo-onboarding-2";
var DEMO_REGISTRO = "0008421-7";
var DEMO_REGISTRO_2 = "0007755-3";
var REGISTRO_TO_DEMO_ID = {
  [DEMO_REGISTRO]: DEMO_PATIENT_ID,
  [DEMO_REGISTRO_2]: DEMO_PATIENT_ID_2
};
var hooks = {};
function registerTourDemoPatientHooks(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(hooks, ctx);
}
function getDemoPatientIdForRegistro(registro) {
  return REGISTRO_TO_DEMO_ID[String(registro || "").trim()] || null;
}
function getTourDemoAdmitDefaults(registro) {
  if (!hooks.isTourActive || !hooks.isTourActive()) return null;
  var r = String(registro || "").trim();
  if (r === DEMO_REGISTRO) return { servicio: "MEDICINA INTERNA", cuarto: "214", cama: "2" };
  if (r === DEMO_REGISTRO_2) return { servicio: "MEDICINA INTERNA", cuarto: "214", cama: "4" };
  return null;
}
function isTourDemoPatientId(id, patientsList) {
  if (!id) return false;
  if (id === DEMO_PATIENT_ID || id === DEMO_PATIENT_ID_2) return true;
  if (!patientsList) return false;
  var p = patientsList.find(function(x) {
    return x && x.id === id;
  });
  return !!(p && p.isDemo);
}
function shouldTourStayOnLabAfterLabCommit() {
  return !!(hooks.isTourActive && hooks.isTourActive() && hooks.getTourStep && hooks.getTourStep() === "lab_parse");
}
function findTourDemoPatientByRegistro(patientsList, registro) {
  var r = String(registro || "").trim();
  if (!r || !patientsList) return null;
  return patientsList.find(function(p) {
    return p && String(p.registro || "").trim() === r;
  }) || null;
}
function tourDemoPatientsBothInCensus(patientsList) {
  return !!(findTourDemoPatientByRegistro(patientsList, DEMO_REGISTRO) && findTourDemoPatientByRegistro(patientsList, DEMO_REGISTRO_2));
}
function hasLabHistory(hist) {
  return !!(hist && (Array.isArray(hist) ? hist.length : Object.keys(hist).length));
}
function shouldSelectTourPrimaryAfterLabCommit(committedPatientId, patientsList) {
  if (!hooks.isTourActive || !hooks.isTourActive()) return false;
  if (committedPatientId === DEMO_PATIENT_ID) return false;
  if (committedPatientId !== DEMO_PATIENT_ID_2) return false;
  return !!findTourDemoPatientByRegistro(patientsList, DEMO_REGISTRO);
}
function tourDemoLabCompleteForTour(patientsList, labHistoryMap) {
  var p1 = findTourDemoPatientByRegistro(patientsList, DEMO_REGISTRO);
  var p2 = findTourDemoPatientByRegistro(patientsList, DEMO_REGISTRO_2);
  if (!p1 || !p2) return false;
  return hasLabHistory(labHistoryMap && labHistoryMap[p1.id]) && hasLabHistory(labHistoryMap && labHistoryMap[p2.id]);
}
function adoptTourPatientOnCommit(patient, registro) {
  if (!hooks.isTourActive || !hooks.isTourActive()) {
    return { patient };
  }
  var demoId = getDemoPatientIdForRegistro(registro);
  if (!demoId) {
    return { patient };
  }
  patient.id = demoId;
  patient.isDemo = true;
  var stayOnLab = shouldTourStayOnLabAfterLabCommit();
  return {
    patient,
    afterCommit: function() {
      if (hooks.applyBundle) hooks.applyBundle(demoId, registro);
      if (stayOnLab) {
        if (hooks.switchAppTab) hooks.switchAppTab("lab");
        if (hooks.showToast) {
          hooks.showToast(
            "Paciente registrado. Registra al otro paciente demo si falta y pulsa Procesar otra vez.",
            "info"
          );
        }
      }
    }
  };
}

// public/js/patient-sala-ui.mjs
function findTeamById(teams, teamId) {
  const id = String(teamId || "").trim();
  if (!id) return null;
  return (teams || []).find((t) => String(t?.team_id || "") === id) || null;
}
function resolveRegistrationSalaDefault(user, teamId, teams) {
  const team = findTeamById(teams, teamId);
  const teamSala = String(team?.sala || "").trim();
  if (teamSala) return teamSala;
  return String(user?.sala || "").trim();
}
function buildSalaOptionsHtml(selected) {
  const sel = String(selected || "").trim();
  return '<option value="">\u2014 Seleccionar \u2014</option>' + CLINICAL_SALA_VALUES.map(
    (s) => `<option value="${esc(s)}"${s === sel ? " selected" : ""}>${esc(s)}</option>`
  ).join("");
}
function buildPatientSalaFieldHtml(patient) {
  const sala = String(patient?.sala || "").trim();
  return `<div class="field-group patient-sala-field"><label for="patient-sala-select">Sala</label><select id="patient-sala-select" class="profile-input" onchange="updatePatient('sala',this.value)">` + buildSalaOptionsHtml(sala) + '</select><p class="profile-hint profile-hint--field">Ubicaci\xF3n cl\xEDnica para censo y \u21C4. Al asignar equipo, la sala del equipo puede actualizarla.</p></div>';
}
function syncPatientRegistrationSalaSelect(teamId) {
  if (typeof document === "undefined") return;
  const select = document.getElementById("m-sala");
  if (!(select instanceof HTMLSelectElement)) return;
  const user = clinicalSessionContext.user;
  const teams = clinicalSessionContext.teams || [];
  let tid = teamId;
  if (tid == null) {
    const teamSel = document.getElementById("m-team");
    tid = teamSel instanceof HTMLSelectElement ? teamSel.value : "";
  }
  const defaultSala = resolveRegistrationSalaDefault(user, tid, teams);
  select.innerHTML = buildSalaOptionsHtml(defaultSala);
  select.value = defaultSala;
}
function readPatientRegistrationSala() {
  if (typeof document === "undefined") return "";
  const select = document.getElementById("m-sala");
  if (!(select instanceof HTMLSelectElement)) return "";
  return String(select.value || "").trim();
}
function wirePatientRegistrationSalaControls() {
  if (typeof document === "undefined" || document._patientRegistrationSalaWired) return;
  document._patientRegistrationSalaWired = true;
  const teamSel = document.getElementById("m-team");
  if (teamSel && !teamSel._patientRegistrationSalaWired) {
    teamSel._patientRegistrationSalaWired = true;
    teamSel.addEventListener("change", () => {
      syncPatientRegistrationSalaSelect(teamSel.value);
    });
  }
}

// public/js/features/patients-modal-commit.mjs
var pendingAddPatientSavedCallback = null;
var pendingAddPatientFromBulkPreview = false;
function setPendingAddPatientSavedCallback(cb) {
  pendingAddPatientSavedCallback = cb;
}
function setPendingAddPatientFromBulkPreview(v) {
  pendingAddPatientFromBulkPreview = !!v;
}
function clearPendingAddPatientCallbacks() {
  pendingAddPatientSavedCallback = null;
  pendingAddPatientFromBulkPreview = false;
}
function getPendingAddPatientFromBulkPreview() {
  return pendingAddPatientFromBulkPreview;
}
function dismissAddPatientModal() {
  clearPendingAddPatientCallbacks();
  closeModalAnimated(document.getElementById("modal"));
}
async function assignTeamFromRegistrationModal(patientId) {
  var teamId = readPatientRegistrationTeamId();
  if (!teamId) return { ok: false, error: "no_team" };
  var res = await assignPatientToTeamClinical(patientId, teamId);
  if (!res.ok) {
    rt.showToast("Paciente guardado, pero no se pudo asignar al equipo", "warn");
  }
  return res;
}
function completeBulkPreviewPatientRegistration(patientId) {
  patientsBridge.selectPatient(patientId, { bypassIncomingBlock: true });
  closePatientDatosModal();
  if (rt.getActiveAppTab() !== "lab") {
    rt.switchAppTab("lab");
  }
}
function patientAdmissionTimestamp() {
  var today = /* @__PURE__ */ new Date();
  return {
    fecha: String(today.getDate()).padStart(2, "0") + "/" + String(today.getMonth() + 1).padStart(2, "0") + "/" + today.getFullYear(),
    hora: String(today.getHours()).padStart(2, "0") + ":" + String(today.getMinutes()).padStart(2, "0")
  };
}
function buildPatientDraft(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    nombre,
    registro,
    edad,
    sexo,
    area,
    servicio,
    cuarto,
    cama,
    fromLab: !!isFromLab,
    lanUpdatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function initPatientNotesAndIndicaciones(patientId, fecha, hora) {
  notes[patientId] = {
    fecha,
    hora,
    interrogatorio: "",
    evolucion: "",
    estudios: "",
    diagnosticos: [""],
    tratamiento: [""],
    ta: "",
    fr: "",
    fc: "",
    temp: "",
    peso: "",
    medico: "",
    profesor: ""
  };
  indicaciones[patientId] = {
    fecha,
    hora,
    medicos: "",
    dieta: "",
    cuidados: "",
    estudios: "",
    medicamentos: "",
    interconsultas: "",
    otros: []
  };
}
function handleDuplicateDemoPatient(patient) {
  if (!patient.isDemo) return false;
  var existingDemo = patients.find(function(x) {
    return x && x.id === patient.id;
  });
  if (!existingDemo) return false;
  var onSavedDup = pendingAddPatientSavedCallback;
  pendingAddPatientSavedCallback = null;
  dismissAddPatientModal();
  rt.showToast(existingDemo.nombre + " ya est\xE1 en el censo", "info");
  if (onSavedDup) {
    try {
      onSavedDup(existingDemo);
    } catch (e) {
      console.error(e);
    }
  }
  return true;
}
function resolveTourActivePatientId(patientId) {
  if (!shouldSelectTourPrimaryAfterLabCommit(patientId, patients)) return patientId;
  var perez = findTourDemoPatientByRegistro(patients, DEMO_REGISTRO);
  return perez ? perez.id : patientId;
}
async function finalizeMobilePatientCommit(patient, fromBulkPreview) {
  var assignRes = await assignTeamFromRegistrationModal(patient.id);
  if (!assignRes?.ok) {
    var dropIdx = patients.findIndex(function(p) {
      return p && String(p.id) === String(patient.id);
    });
    if (dropIdx >= 0) patients.splice(dropIdx, 1);
    rt.showToast(
      "En R+ M\xF3vil solo ves pacientes asignados a tu equipo (p. ej. Dra. Melissa). Reg\xEDstralos en la Mac o as\xEDgnalos all\xED.",
      "warn"
    );
    return;
  }
  rt.showToast("Paciente agregado", "success");
  try {
    var access = await import("/mobile/js/chunks/clinical-access-runtime-D353YS2C.js");
    if (typeof access.finalizeMobileLanPatientCensus === "function") {
      await access.finalizeMobileLanPatientCensus();
    }
  } catch (_e) {
    void _e;
  }
  var activeId = resolveTourActivePatientId(patient.id);
  if (fromBulkPreview) completeBulkPreviewPatientRegistration(activeId);
  else patientsBridge.selectPatient(activeId, { bypassIncomingBlock: true });
}
async function finalizeDesktopPatientCommit(patient, fromBulkPreview) {
  await assignTeamFromRegistrationModal(patient.id);
  patientsBridge.renderPatientList();
  var activeId = resolveTourActivePatientId(patient.id);
  if (fromBulkPreview) completeBulkPreviewPatientRegistration(activeId);
  else {
    patientsBridge.selectPatient(activeId, { bypassIncomingBlock: true });
    rt.showToast("Paciente agregado", "success");
  }
}
function resolvePendingLabAfterCommit(isFromLab, fromBulkPreview) {
  var stayOnLabForTour = isFromLab && shouldTourStayOnLabAfterLabCommit();
  if (isFromLab && !stayOnLabForTour && !fromBulkPreview) {
    var pendingLab = rt.consumeActiveLab ? rt.consumeActiveLab() : null;
    if (rt.clearLabOutputUi) rt.clearLabOutputUi();
    rt.switchAppTab("nota");
    return pendingLab;
  }
  if (isFromLab && stayOnLabForTour) return null;
  return null;
}
function commitPatientFromModal(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab) {
  var ts = patientAdmissionTimestamp();
  var patient = buildPatientDraft(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab);
  var adoptResult = adoptTourPatientOnCommit(patient, registro);
  patient = adoptResult.patient;
  if (handleDuplicateDemoPatient(patient)) return;
  var registrationTeamId = readPatientRegistrationTeamId();
  stampPatientClinicalSala(patient, clinicalSessionContext.user, {
    teamId: registrationTeamId,
    teams: clinicalSessionContext.teams || []
  });
  const registrationSala = readPatientRegistrationSala();
  if (registrationSala) patient.sala = registrationSala;
  stampPatientRegistrationMeta(patient, clinicalSessionContext.user);
  clearPatientDeleteTombstoneForAdmit(patient.id, patient.registro);
  initPatientNotesAndIndicaciones(patient.id, ts.fecha, ts.hora);
  rt.applyDefaultsToNewPatient(patient.id);
  rt.applyDefaultsToNewIndicaciones(patient.id);
  patients.push(patient);
  saveState();
  var onSaved = pendingAddPatientSavedCallback;
  pendingAddPatientSavedCallback = null;
  var fromBulkPreview = pendingAddPatientFromBulkPreview;
  pendingAddPatientFromBulkPreview = false;
  dismissAddPatientModal();
  var pendingLab = resolvePendingLabAfterCommit(isFromLab, fromBulkPreview);
  if (isMobileWeb()) void finalizeMobilePatientCommit(patient, fromBulkPreview);
  else void finalizeDesktopPatientCommit(patient, fromBulkPreview);
  if (adoptResult.afterCommit) {
    try {
      adoptResult.afterCommit(patient);
    } catch (e) {
      console.error(e);
    }
  }
  if (onSaved) {
    try {
      onSaved(patient);
    } catch (e) {
      console.error(e);
    }
  }
  if (pendingLab) {
    rt.restoreActiveLab(pendingLab);
    rt.enviarLabsANota();
    rt.consumeActiveLab();
  }
}
function generatePatientId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function buildPatientEntry(patientId) {
  var patient = patients.find(function(p) {
    return p.id === patientId;
  });
  if (!patient || patient.id === DEMO_PATIENT_ID) return null;
  var patientSnap = { ...patient };
  ensureMonitoreo(patientSnap);
  if (patient.monitoreo != null && typeof patient.monitoreo === "object") {
    patientSnap.monitoreo = structuredClone(patient.monitoreo);
  }
  if (patientSnap.historiaClinica != null && typeof patientSnap.historiaClinica === "object") {
    const hc = structuredClone(patientSnap.historiaClinica);
    delete hc.pendingLanSync;
    delete hc.lanSyncPending;
    patientSnap.historiaClinica = hc;
  }
  return {
    patient: patientSnap,
    note: notes[patientId] || {},
    indicaciones: indicaciones[patientId] || {},
    labHistory: Array.isArray(labHistory[patientId]) ? labHistory[patientId] : [],
    medReceta: medRecetaByPatient[patientId] || null,
    medPharmProfile: medPharmProfileByPatient[patientId] || null,
    vpo: vpoByPatient[patientId] || null,
    listadoProblemas: listadoProblemas[patientId] || null,
    todos: storage.getTodos(patientId)
  };
}
function registroBase_(reg) {
  var s = String(reg || "").trim();
  if (!s) return "";
  var base = s.split("-")[0];
  return base.length >= 5 ? base : s;
}
function findPatientByRegistro(registro) {
  var r = String(registro || "").trim();
  if (!r) return null;
  var exact = patients.find(function(p) {
    return String(p.registro || "").trim() === r;
  }) || null;
  if (exact) return exact;
  var base = registroBase_(r);
  if (!base || base === r) return null;
  var fuzzy = patients.filter(function(p) {
    return registroBase_(p.registro) === base;
  });
  return fuzzy.length === 1 ? fuzzy[0] : null;
}
function ensureUniquePatientName(base) {
  var desired = String(base || "").trim() || "PACIENTE SIN NOMBRE";
  var normalized = desired.toUpperCase();
  var has = patients.some(function(p) {
    return String(p.nombre || "").trim().toUpperCase() === normalized;
  });
  if (!has) return desired;
  var i = 2;
  while (i < 9999) {
    var candidate = desired + " (" + i + ")";
    var exists = patients.some(function(p) {
      return String(p.nombre || "").trim().toUpperCase() === candidate.toUpperCase();
    });
    if (!exists) return candidate;
    i += 1;
  }
  return desired + " (COPIA)";
}

export {
  DEMO_PATIENT_ID,
  DEMO_PATIENT_ID_2,
  DEMO_REGISTRO,
  DEMO_REGISTRO_2,
  registerTourDemoPatientHooks,
  getTourDemoAdmitDefaults,
  isTourDemoPatientId,
  findTourDemoPatientByRegistro,
  tourDemoPatientsBothInCensus,
  tourDemoLabCompleteForTour,
  buildPatientSalaFieldHtml,
  syncPatientRegistrationSalaSelect,
  wirePatientRegistrationSalaControls,
  setPendingAddPatientSavedCallback,
  setPendingAddPatientFromBulkPreview,
  clearPendingAddPatientCallbacks,
  getPendingAddPatientFromBulkPreview,
  commitPatientFromModal,
  generatePatientId,
  buildPatientEntry,
  findPatientByRegistro,
  ensureUniquePatientName
};
//# sourceMappingURL=/js/chunks/chunk-DPCWCVTP.js.map
