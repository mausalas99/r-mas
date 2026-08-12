import { getPatients, getNotes, getIndicaciones, getLabHistory, getMedRecetaByPatient, getMedPharmProfileByPatient, getListadoProblemas, getVpoByPatient, persistClinicalState } from '../app-state.mjs';
import { storage } from '../storage.js';
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';
import { stampPatientClinicalSala } from '../clinico-access.mjs';
import { stampPatientRegistrationMeta } from '../patient-registration-meta.mjs';
import { clearPatientDeleteTombstoneForAdmit } from './sync-apply/entity-versions-stub.mjs';
import { enqueueCloudPatientAdmit } from './cloud-sync/mutate-bridge.mjs';
import { isMobileWeb } from '../mobile-web.mjs';
import {
  adoptTourPatientOnCommit,
  DEMO_PATIENT_ID,
  DEMO_REGISTRO,
  findTourDemoPatientByRegistro,
  shouldSelectTourPrimaryAfterLabCommit,
  shouldTourStayOnLabAfterLabCommit,
} from '../tour-demo-patient.mjs';
import {
  assignPatientToTeamClinical,
  defaultPatientRegistrationTeamId,
  readPatientRegistrationTeamId,
} from '../patient-team-assign-ui.mjs';
import { readPatientRegistrationSala } from '../patient-sala-ui.mjs';
import { closePatientDatosModal } from '../patient-datos-modal.mjs';
import { ensureMonitoreo } from './estado-actual-data.mjs';
import { closeModalAnimated } from '../ui-motion.mjs';
import { rt } from './patients-runtime-state.mjs';
import { patientsBridge } from './patients-bridge.mjs';


var pendingAddPatientSavedCallback = null;
var pendingAddPatientFromBulkPreview = false;

export function setPendingAddPatientSavedCallback(cb) {
  pendingAddPatientSavedCallback = cb;
}

export function setPendingAddPatientFromBulkPreview(v) {
  pendingAddPatientFromBulkPreview = !!v;
}

export function clearPendingAddPatientCallbacks() {
  pendingAddPatientSavedCallback = null;
  pendingAddPatientFromBulkPreview = false;
}

export function getPendingAddPatientFromBulkPreview() {
  return pendingAddPatientFromBulkPreview;
}

function dismissAddPatientModal() {
  clearPendingAddPatientCallbacks();
  closeModalAnimated(document.getElementById('modal'));
}

async function assignTeamFromRegistrationModal(patientId) {
  var teamId = readPatientRegistrationTeamId();
  if (!teamId) return { ok: false, error: 'no_team' };
  var res = await assignPatientToTeamClinical(patientId, teamId);
  if (!res.ok) {
    rt.showToast('Paciente guardado, pero no se pudo asignar al equipo', 'warn');
  }
  return res;
}

/** Tras alta desde vista previa: no reabrir el modal (onSaved confirma solo). */
function completeBulkPreviewPatientRegistration(patientId) {
  patientsBridge.selectPatient(patientId, { bypassIncomingBlock: true });
  closePatientDatosModal();
  if (rt.getActiveAppTab() !== 'lab') {
    rt.switchAppTab('lab');
  }
}

function patientAdmissionTimestamp() {
  var today = new Date();
  return {
    fecha:
      String(today.getDate()).padStart(2, '0') +
      '/' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '/' +
      today.getFullYear(),
    hora:
      String(today.getHours()).padStart(2, '0') + ':' + String(today.getMinutes()).padStart(2, '0'),
  };
}

function buildPatientDraft(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    nombre: nombre,
    registro: registro,
    edad: edad,
    sexo: sexo,
    area: area,
    servicio: servicio,
    cuarto: cuarto,
    cama: cama,
    fromLab: !!isFromLab,
    lanUpdatedAt: new Date().toISOString(),
  };
}

function initPatientNotesAndIndicaciones(patientId, fecha, hora) {
  getNotes()[patientId] = {
    fecha: fecha,
    hora: hora,
    interrogatorio: '',
    evolucion: '',
    estudios: '',
    diagnosticos: [''],
    tratamiento: [''],
    ta: '',
    fr: '',
    fc: '',
    temp: '',
    peso: '',
    medico: '',
    profesor: '',
  };
  getIndicaciones()[patientId] = {
    fecha: fecha,
    hora: hora,
    medicos: '',
    dieta: '',
    cuidados: '',
    estudios: '',
    medicamentos: '',
    interconsultas: '',
    otros: [],
  };
}

function handleDuplicateDemoPatient(patient) {
  if (!patient.isDemo) return false;
  var existingDemo = getPatients().find(function (x) {
    return x && x.id === patient.id;
  });
  if (!existingDemo) return false;
  var onSavedDup = pendingAddPatientSavedCallback;
  pendingAddPatientSavedCallback = null;
  dismissAddPatientModal();
  rt.showToast(existingDemo.nombre + ' ya está en el censo', 'info');
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
    var dropIdx = getPatients().findIndex(function (p) {
      return p && String(p.id) === String(patient.id);
    });
    if (dropIdx >= 0) getPatients().splice(dropIdx, 1);
    persistClinicalState();
    rt.showToast(
      'En R+ Móvil solo ves pacientes asignados a tu equipo (p. ej. Dra. Melissa). Regístralos en la Mac o asígnalos allí.',
      'warn'
    );
    return false;
  }
  rt.showToast('Paciente agregado', 'success');
  try {
    var access = await import('../clinical-access-runtime.mjs');
    if (typeof access.finalizeMobileLanPatientCensus === 'function') {
      await access.finalizeMobileLanPatientCensus();
    }
  } catch (_e) { void _e; }
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
    rt.showToast('Paciente agregado', 'success');
  }
  return true;
}

function resolvePendingLabAfterCommit(isFromLab, fromBulkPreview) {
  var stayOnLabForTour = isFromLab && shouldTourStayOnLabAfterLabCommit();
  if (isFromLab && !stayOnLabForTour && !fromBulkPreview) {
    var pendingLab = rt.consumeActiveLab ? rt.consumeActiveLab() : null;
    if (rt.clearLabOutputUi) rt.clearLabOutputUi();
    rt.switchAppTab('nota');
    return pendingLab;
  }
  if (isFromLab && stayOnLabForTour) return null;
  return null;
}

export function commitPatientFromModal(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab) {
  var ts = patientAdmissionTimestamp();
  var patient = buildPatientDraft(nombre, registro, edad, sexo, area, servicio, cuarto, cama, isFromLab);
  var adoptResult = adoptTourPatientOnCommit(patient, registro);
  patient = adoptResult.patient;
  if (handleDuplicateDemoPatient(patient)) return;
  var registrationTeamId = readPatientRegistrationTeamId();
  stampPatientClinicalSala(patient, clinicalSessionContext.user, {
    teamId: registrationTeamId,
    teams: clinicalSessionContext.teams || [],
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

  void (async function () {
    var committed = false;
    try {
      if (isMobileWeb()) {
        committed = await finalizeMobilePatientCommit(patient, fromBulkPreview);
      } else {
        committed = await finalizeDesktopPatientCommit(patient, fromBulkPreview);
      }
    } catch (e) {
      console.error(e);
      rt.showToast('No se pudo completar el alta', 'error');
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

/**
 * Alta mínima desde SOME / vista previa: demografía del reporte, sin ubicación.
 * @param {{ name?: string, expediente?: string, registro?: string, edad?: string, sexo?: string }} labPatient
 * @param {{ teamId?: string }} [opts]
 * @returns {object | null}
 */
function resolveStubPatientTeamId(opts) {
  var teamId = opts && opts.teamId ? String(opts.teamId).trim() : '';
  if (teamId) return teamId;
  teamId = readPatientRegistrationTeamId();
  if (teamId) return teamId;
  return defaultPatientRegistrationTeamId(clinicalSessionContext.user);
}

function finalizeStubPatientSidebar(patient, teamId) {
  var tid = resolveStubPatientTeamId({ teamId: teamId });
  if (!tid) {
    patientsBridge.selectPatient(patient.id, { bypassIncomingBlock: true });
    return;
  }
  void assignPatientToTeamClinical(patient.id, tid).then(function (res) {
    if (!res || !res.ok) {
      rt.showToast('Paciente en censo, pero no se pudo asignar al equipo', 'warn');
    }
    patientsBridge.renderPatientList();
    patientsBridge.selectPatient(patient.id, { bypassIncomingBlock: true });
  });
}

export function commitStubPatientFromLab(labPatient, opts) {
  if (!labPatient) return null;
  var registro = String(labPatient.expediente || labPatient.registro || '').trim();
  if (!registro) return null;
  var existing = findPatientByRegistro(registro);
  if (existing) return existing;

  var nombreRaw = String(labPatient.name || '').trim().toUpperCase();
  var nombre = nombreRaw || ensureUniquePatientName('PACIENTE SIN NOMBRE');
  var edadNum = parseInt(String(labPatient.edad || '').trim(), 10);
  var edad =
    Number.isFinite(edadNum) && edadNum >= 0
      ? String(edadNum)
      : String(labPatient.edad || '').trim();
  var sexo = labPatient.sexo === 'M' ? 'M' : 'F';
  var ts = patientAdmissionTimestamp();

  var patient = buildPatientDraft(nombre, registro, edad, sexo, '', '', '', '', true);
  var adoptResult = adoptTourPatientOnCommit(patient, registro);
  patient = adoptResult.patient;
  if (handleDuplicateDemoPatient(patient)) {
    return getPatients().find(function (x) {
      return x && x.id === patient.id;
    }) || null;
  }

  stampPatientClinicalSala(patient, clinicalSessionContext.user, {
    teamId: readPatientRegistrationTeamId(),
    teams: clinicalSessionContext.teams || [],
  });
  var stubTeamId = readPatientRegistrationTeamId();
  if (!stubTeamId) {
    var registrationSala = readPatientRegistrationSala();
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
  patientsBridge.renderPatientList();
  finalizeStubPatientSidebar(patient, opts && opts.teamId);
  return patient;
}

export function generatePatientId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function buildPatientEntry(patientId) {
  var patient = getPatients().find(function (p) {
    return p.id === patientId;
  });
  if (!patient || patient.id === DEMO_PATIENT_ID) return null;
  var patientSnap = { ...patient };
  ensureMonitoreo(patientSnap);
  if (patient.monitoreo != null && typeof patient.monitoreo === 'object') {
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
    todos: storage.getTodos(patientId),
  };
}

function registroBase_(reg) {
  var s = String(reg || '').trim();
  if (!s) return '';
  var base = s.split('-')[0];
  return base.length >= 5 ? base : s;
}

/** Exact match, then same hospital base (1087426 ↔ 1087426-2). */
export function findPatientByRegistro(registro) {
  var r = String(registro || '').trim();
  if (!r) return null;
  var exact =
    getPatients().find(function (p) {
      return String(p.registro || '').trim() === r;
    }) || null;
  if (exact) return exact;
  var base = registroBase_(r);
  if (!base || base === r) return null;
  var fuzzy = getPatients().filter(function (p) {
    return registroBase_(p.registro) === base;
  });
  return fuzzy.length === 1 ? fuzzy[0] : null;
}

export function ensureUniquePatientName(base) {
  var desired = String(base || '').trim() || 'PACIENTE SIN NOMBRE';
  var normalized = desired.toUpperCase();
  var has = getPatients().some(function (p) {
    return String(p.nombre || '').trim().toUpperCase() === normalized;
  });
  if (!has) return desired;
  var i = 2;
  while (i < 9999) {
    var candidate = desired + ' (' + i + ')';
    var exists = getPatients().some(function (p) {
      return String(p.nombre || '').trim().toUpperCase() === candidate.toUpperCase();
    });
    if (!exists) return candidate;
    i += 1;
  }
  return desired + ' (COPIA)';
}
