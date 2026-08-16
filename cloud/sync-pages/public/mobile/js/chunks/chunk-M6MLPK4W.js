import {
  closePatientDatosModal
} from "/mobile/js/chunks/chunk-4QI24DFU.js";
import {
  rt
} from "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import {
  assignPatientToTeamClinical,
  defaultPatientRegistrationTeamId,
  readPatientRegistrationTeamId
} from "/mobile/js/chunks/chunk-AVZ5WV63.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-JBHSWL2Z.js";
import {
  enqueueCloudPatientAdmit
} from "/mobile/js/chunks/chunk-P7EHNYUF.js";
import {
  getIndicaciones,
  getLabHistory,
  getListadoProblemas,
  getMedPharmProfileByPatient,
  getMedRecetaByPatient,
  getNotes,
  getPatients,
  getVpoByPatient,
  persistClinicalState
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  storage
} from "/mobile/js/chunks/chunk-5RUR3UQW.js";
import {
  ensureMonitoreo,
  stampPatientRegistrationMeta
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  closeModalAnimated
} from "/mobile/js/chunks/chunk-KZT7D6I2.js";
import {
  CLINICAL_SALA_VALUES,
  stampPatientClinicalSala
} from "/mobile/js/chunks/chunk-WTVHUFEL.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

// public/js/features/sync-apply/entity-versions-stub.mjs
function rememberPatientDeleteTombstone() {
}
function clearPatientDeleteTombstoneForAdmit() {
}

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

// public/js/features/patients-bridge.mjs
var patientsBridge = {
  renderPatientList(_opts) {
  },
  selectPatient(_id, _opts) {
  }
};

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
  getNotes()[patientId] = {
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
  getIndicaciones()[patientId] = {
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
  var existingDemo = getPatients().find(function(x) {
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
  if (!shouldSelectTourPrimaryAfterLabCommit(patientId, getPatients())) return patientId;
  var perez = findTourDemoPatientByRegistro(getPatients(), DEMO_REGISTRO);
  return perez ? perez.id : patientId;
}
async function finalizeMobilePatientCommit(patient, fromBulkPreview) {
  var assignRes = await assignTeamFromRegistrationModal(patient.id);
  if (!assignRes?.ok) {
    var dropIdx = getPatients().findIndex(function(p) {
      return p && String(p.id) === String(patient.id);
    });
    if (dropIdx >= 0) getPatients().splice(dropIdx, 1);
    persistClinicalState();
    rt.showToast(
      "En R+ M\xF3vil solo ves pacientes asignados a tu equipo (p. ej. Dra. Melissa). Reg\xEDstralos en la Mac o as\xEDgnalos all\xED.",
      "warn"
    );
    return false;
  }
  rt.showToast("Paciente agregado", "success");
  try {
    var access = await import("/mobile/js/chunks/clinical-access-runtime-AIZQAPAG.js");
    if (typeof access.finalizeMobileLanPatientCensus === "function") {
      await access.finalizeMobileLanPatientCensus();
    }
  } catch (_e) {
    void _e;
  }
  var activeId = resolveTourActivePatientId(patient.id);
  if (fromBulkPreview) completeBulkPreviewPatientRegistration(activeId);
  else patientsBridge.selectPatient(activeId, { bypassIncomingBlock: true });
  return true;
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
  return true;
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
  if (!registrationTeamId) {
    const registrationSala = readPatientRegistrationSala();
    if (registrationSala) patient.sala = registrationSala;
  }
  stampPatientRegistrationMeta(patient, clinicalSessionContext.user);
  clearPatientDeleteTombstoneForAdmit(patient.id, patient.registro);
  enqueueCloudPatientAdmit(patient);
  initPatientNotesAndIndicaciones(patient.id, ts.fecha, ts.hora);
  rt.applyDefaultsToNewPatient(patient.id);
  rt.applyDefaultsToNewIndicaciones(patient.id);
  getPatients().push(patient);
  persistClinicalState();
  var onSaved = pendingAddPatientSavedCallback;
  var fromBulkPreview = pendingAddPatientFromBulkPreview;
  clearPendingAddPatientCallbacks();
  void (async function() {
    var committed = false;
    try {
      if (isMobileWeb()) {
        committed = await finalizeMobilePatientCommit(patient, fromBulkPreview);
      } else {
        committed = await finalizeDesktopPatientCommit(patient, fromBulkPreview);
      }
    } catch (e) {
      console.error(e);
      rt.showToast("No se pudo completar el alta", "error");
      committed = false;
    }
    if (!committed) return;
    dismissAddPatientModal();
    var pendingLab = resolvePendingLabAfterCommit(isFromLab, fromBulkPreview);
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
  })();
}
function resolveStubPatientTeamId(opts) {
  var teamId = opts && opts.teamId ? String(opts.teamId).trim() : "";
  if (teamId) return teamId;
  teamId = readPatientRegistrationTeamId();
  if (teamId) return teamId;
  return defaultPatientRegistrationTeamId(clinicalSessionContext.user);
}
function finalizeStubPatientSidebar(patient, teamId) {
  var tid = resolveStubPatientTeamId({ teamId });
  if (!tid) {
    patientsBridge.selectPatient(patient.id, { bypassIncomingBlock: true });
    return;
  }
  void assignPatientToTeamClinical(patient.id, tid).then(function(res) {
    if (!res || !res.ok) {
      rt.showToast("Paciente en censo, pero no se pudo asignar al equipo", "warn");
    }
    patientsBridge.renderPatientList();
    patientsBridge.selectPatient(patient.id, { bypassIncomingBlock: true });
  });
}
function buildStubPatientDraft(labPatient, registro) {
  var nombreRaw = String(labPatient.name || "").trim().toUpperCase();
  var nombre = nombreRaw || ensureUniquePatientName("PACIENTE SIN NOMBRE");
  var edadNum = parseInt(String(labPatient.edad || "").trim(), 10);
  var edad = Number.isFinite(edadNum) && edadNum >= 0 ? String(edadNum) : String(labPatient.edad || "").trim();
  var sexo = labPatient.sexo === "M" ? "M" : "F";
  return buildPatientDraft(nombre, registro, edad, sexo, "", "", "", "", true);
}
function stampStubPatientTeamAndSala(patient) {
  stampPatientClinicalSala(patient, clinicalSessionContext.user, {
    teamId: readPatientRegistrationTeamId(),
    teams: clinicalSessionContext.teams || []
  });
  var stubTeamId = readPatientRegistrationTeamId();
  if (!stubTeamId) {
    var registrationSala = readPatientRegistrationSala();
    if (registrationSala) patient.sala = registrationSala;
  }
}
function commitStubPatientFromLab(labPatient, opts) {
  if (!labPatient) return null;
  var registro = String(labPatient.expediente || labPatient.registro || "").trim();
  if (!registro) return null;
  var existing = findPatientByRegistro(registro);
  if (existing) return existing;
  var ts = patientAdmissionTimestamp();
  var patient = buildStubPatientDraft(labPatient, registro);
  var adoptResult = adoptTourPatientOnCommit(patient, registro);
  patient = adoptResult.patient;
  if (handleDuplicateDemoPatient(patient)) {
    return getPatients().find(function(x) {
      return x && x.id === patient.id;
    }) || null;
  }
  stampStubPatientTeamAndSala(patient);
  stampPatientRegistrationMeta(patient, clinicalSessionContext.user);
  clearPatientDeleteTombstoneForAdmit(patient.id, patient.registro);
  enqueueCloudPatientAdmit(patient);
  initPatientNotesAndIndicaciones(patient.id, ts.fecha, ts.hora);
  rt.applyDefaultsToNewPatient(patient.id);
  rt.applyDefaultsToNewIndicaciones(patient.id);
  getPatients().push(patient);
  persistClinicalState();
  patientsBridge.renderPatientList();
  finalizeStubPatientSidebar(patient, opts && opts.teamId);
  return patient;
}
function generatePatientId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function buildPatientEntry(patientId) {
  var patient = getPatients().find(function(p) {
    return p.id === patientId;
  });
  if (!patient || patient.id === DEMO_PATIENT_ID) return null;
  var patientSnap = { ...patient };
  ensureMonitoreo(patientSnap);
  if (patient.monitoreo != null && typeof patient.monitoreo === "object") {
    patientSnap.monitoreo = structuredClone(patient.monitoreo);
  }
  return {
    patient: patientSnap,
    note: getNotes()[patientId] || {},
    indicaciones: getIndicaciones()[patientId] || {},
    labHistory: Array.isArray(getLabHistory()[patientId]) ? getLabHistory()[patientId] : [],
    medReceta: getMedRecetaByPatient()[patientId] || null,
    medPharmProfile: getMedPharmProfileByPatient()[patientId] || null,
    vpo: getVpoByPatient()[patientId] || null,
    listadoProblemas: getListadoProblemas()[patientId] || null,
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
  var exact = getPatients().find(function(p) {
    return String(p.registro || "").trim() === r;
  }) || null;
  if (exact) return exact;
  var base = registroBase_(r);
  if (!base || base === r) return null;
  var fuzzy = getPatients().filter(function(p) {
    return registroBase_(p.registro) === base;
  });
  return fuzzy.length === 1 ? fuzzy[0] : null;
}
function ensureUniquePatientName(base) {
  var desired = String(base || "").trim() || "PACIENTE SIN NOMBRE";
  var normalized = desired.toUpperCase();
  var has = getPatients().some(function(p) {
    return String(p.nombre || "").trim().toUpperCase() === normalized;
  });
  if (!has) return desired;
  var i = 2;
  while (i < 9999) {
    var candidate = desired + " (" + i + ")";
    var exists = getPatients().some(function(p) {
      return String(p.nombre || "").trim().toUpperCase() === candidate.toUpperCase();
    });
    if (!exists) return candidate;
    i += 1;
  }
  return desired + " (COPIA)";
}

export {
  patientsBridge,
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
  rememberPatientDeleteTombstone,
  buildPatientSalaFieldHtml,
  syncPatientRegistrationSalaSelect,
  wirePatientRegistrationSalaControls,
  setPendingAddPatientSavedCallback,
  setPendingAddPatientFromBulkPreview,
  clearPendingAddPatientCallbacks,
  getPendingAddPatientFromBulkPreview,
  commitPatientFromModal,
  commitStubPatientFromLab,
  generatePatientId,
  buildPatientEntry,
  findPatientByRegistro,
  ensureUniquePatientName
};
//# sourceMappingURL=/js/chunks/chunk-M6MLPK4W.js.map
