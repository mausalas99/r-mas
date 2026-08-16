import { getPatients, persistClinicalState } from '../app-state.mjs';
import { storage } from '../storage.js';
import { validatePatientForSave } from '../patient-validation.mjs';
import {
  shakePatientFieldsForError,
  closeModalAnimated,
  prepareModalBackdropOpen,
} from '../ui-motion.mjs';
import {
  isModeSala,
  getDefaultServicio,
  getDefaultCuarto,
  getDefaultCama,
} from '../mode-features.mjs';
import { getTourDemoAdmitDefaults } from '../tour-demo-patient.mjs';
import {
  assignPatientToTeamClinical,
  readPatientRegistrationTeamId,
  syncPatientRegistrationTeamSelect,
} from '../patient-team-assign-ui.mjs';
import {
  syncPatientRegistrationSalaSelect,
  wirePatientRegistrationSalaControls,
} from '../patient-sala-ui.mjs';
import { rt } from './patients-runtime-state.mjs';
import { patientsBridge } from './patients-bridge.mjs';
import { commitPatientFromModal, clearPendingAddPatientCallbacks, setPendingAddPatientFromBulkPreview, setPendingAddPatientSavedCallback, getPendingAddPatientFromBulkPreview } from './patients-modal-commit.mjs';
import { findDuplicatePatient, showDuplicateWarning, showExpedienteAdvice } from './patients-modal-dialogs.mjs';
import {
  readPatientModalFields,
  validatePatientAge,
  readPatientLocationFields,
  validatePatientLocationFields,
} from './patients-modal-fields.mjs';
import { resumeLabBulkPreviewModalIfSuspended, suspendLabBulkPreviewModal } from './lab-bulk-preview-modal.mjs';
import { admitPatientsViaRegistroTunnel, admitPatientViaRegistroTunnel } from '../patient-registro-tunnel.mjs';
import {
  initRegistroModalRows,
  setRegistroModalMultiMode,
  collectRegistroModalRegistros,
  focusRegistroModalFirst,
} from '../patient-registro-modal-ui.mjs';

function _prefillServicioForSala() {
  var srv = document.getElementById('m-servicio');
  if (srv && isModeSala(rt.getSettings()) && !srv.value) srv.value = getDefaultServicio(rt.getSettings());
}

function _lastAdmissionLocationFromPatients() {
  for (var i = getPatients().length - 1; i >= 0; i--) {
    var p = getPatients()[i];
    if (!p || p.isDemo) continue;
    var cuarto = String(p.cuarto || '').trim();
    var cama = String(p.cama || '').trim();
    if (cuarto && cama) return { cuarto: cuarto, cama: cama };
  }
  return { cuarto: '', cama: '' };
}

function _resolveAdmissionLocationDefaults(registro) {
  var tour = getTourDemoAdmitDefaults(registro);
  if (tour && tour.cuarto && tour.cama) return tour;
  var st = rt.getSettings();
  var cuarto = getDefaultCuarto(st);
  var cama = getDefaultCama(st);
  if (cuarto && cama) return { cuarto: cuarto, cama: cama };
  return _lastAdmissionLocationFromPatients();
}

function _prefillCuartoCamaForSala(registro) {
  if (!isModeSala(rt.getSettings())) return;
  var loc = _resolveAdmissionLocationDefaults(registro);
  var cuartoEl = document.getElementById('m-cuarto');
  var camaEl = document.getElementById('m-cama');
  if (cuartoEl && !String(cuartoEl.value || '').trim() && loc.cuarto) cuartoEl.value = loc.cuarto;
  if (camaEl && !String(camaEl.value || '').trim() && loc.cama) camaEl.value = loc.cama;
}

function _rememberAdmissionLocation(cuarto, cama) {
  if (!isModeSala(rt.getSettings())) return;
  var st = rt.getSettings();
  if (!st) return;
  st.defaultCuarto = cuarto;
  st.defaultCama = cama;
  try {
    storage.saveSettings(st);
  } catch (e) {
    console.error('_rememberAdmissionLocation:', e && e.message);
  }
}

function _focusPatientAdmissionField(isFromLab) {
  if (!isFromLab && modalRegistroTunnelMode) {
    focusRegistroModalFirst();
    return;
  }
  var fieldIds = isFromLab
    ? ['m-servicio', 'm-cuarto', 'm-cama']
    : ['m-nombre-manual', 'm-servicio', 'm-cuarto', 'm-cama'];
  for (var i = 0; i < fieldIds.length; i++) {
    var el = document.getElementById(fieldIds[i]);
    if (!el) continue;
    if (el.closest && el.closest('[style*="display: none"]')) continue;
    if (!String(el.value || '').trim()) {
      try {
        el.focus();
      } catch (_e) { void _e; }
      return;
    }
  }
  var cama = document.getElementById('m-cama');
  if (cama) {
    try {
      cama.focus();
    } catch (_e) { void _e; }
  }
}

function _syncPatientModalModeFields() {
  var sala = isModeSala(rt.getSettings());
  var areaGroup = document.getElementById('m-area-group');
  var servicioLabel = document.getElementById('m-servicio-label');
  var servicioInput = document.getElementById('m-servicio');
  if (areaGroup) areaGroup.style.display = sala ? 'none' : '';
  if (servicioLabel) servicioLabel.textContent = sala ? 'Área / Servicio *' : 'Servicio *';
  if (servicioInput) servicioInput.placeholder = 'ej. CIRUGÍA GENERAL';
}

function setElementDisplay(el, visible) {
  if (!el) return;
  el.style.display = visible ? '' : 'none';
}

function bedLocationGridEl() {
  var cuarto = document.getElementById('m-cuarto');
  if (!cuarto || !cuarto.parentElement) return null;
  return cuarto.parentElement.parentElement || null;
}

function applyRegistroTunnelFieldVisibility(on) {
  var prefilled = document.getElementById('modal-prefilled');
  var manualFull = document.getElementById('modal-manual-full');
  var nombreGroup = document.getElementById('m-nombre-manual');
  if (nombreGroup && nombreGroup.parentElement) {
    setElementDisplay(nombreGroup.parentElement, !on);
  }
  var edadGrid = document.getElementById('m-edad-num-manual');
  if (edadGrid && edadGrid.parentElement && edadGrid.parentElement.parentElement) {
    setElementDisplay(edadGrid.parentElement.parentElement, !on);
  }
  var registroWrap = document.getElementById('m-registro-manual-wrap');
  setElementDisplay(registroWrap, on || !modalCompleteAdmissionPatientId);
  if (prefilled) prefilled.style.display = 'none';
  if (manualFull) manualFull.style.display = on || modalCompleteAdmissionPatientId ? 'block' : 'none';
  ['m-area-group', 'm-servicio-group', 'm-sala-group'].forEach(function (id) {
    setElementDisplay(document.getElementById(id), !on && !modalCompleteAdmissionPatientId);
  });
  setElementDisplay(bedLocationGridEl(), !on && modalCompleteAdmissionPatientId);
}

function applyRegistroTunnelSaveButtonText(on) {
  var saveBtn = document.querySelector('#modal .btn-save');
  if (!saveBtn) return;
  saveBtn.textContent = on
    ? 'Buscar registros'
    : modalCompleteAdmissionPatientId
      ? 'Guardar'
      : 'Agregar Paciente';
}

function applyRegistroTunnelLabels(on) {
  var regLabel = document.getElementById('m-registro-manual-label');
  var regHint = document.getElementById('m-registro-manual-hint');
  setRegistroModalMultiMode(on);
  if (regLabel) regLabel.textContent = on ? 'Registro(s)' : 'Registro';
  setElementDisplay(regHint, on);
}

function setModalRegistroTunnelMode(on) {
  modalRegistroTunnelMode = !!on;
  if (on) modalCompleteAdmissionPatientId = null;
  applyRegistroTunnelFieldVisibility(on);
  applyRegistroTunnelSaveButtonText(on);
  applyRegistroTunnelLabels(on);
  if (!on && !modalCompleteAdmissionPatientId) _syncPatientModalModeFields();
}

var modalCompleteAdmissionPatientId = null;

function hideCompleteAdmissionManualFields() {
  var prefilled = document.getElementById('modal-prefilled');
  var manualFull = document.getElementById('modal-manual-full');
  if (prefilled) prefilled.style.display = 'none';
  if (manualFull) manualFull.style.display = 'none';
  var nombreGroup = document.getElementById('m-nombre-manual');
  if (nombreGroup && nombreGroup.parentElement) setElementDisplay(nombreGroup.parentElement, false);
  var edadGrid = document.getElementById('m-edad-num-manual');
  if (edadGrid && edadGrid.parentElement && edadGrid.parentElement.parentElement) {
    setElementDisplay(edadGrid.parentElement.parentElement, false);
  }
  var registroWrap = document.getElementById('m-registro-manual-wrap');
  setElementDisplay(registroWrap, false);
}

function applyCompleteAdmissionFieldVisibility(on) {
  ['m-area-group', 'm-servicio-group', 'm-sala-group'].forEach(function (id) {
    setElementDisplay(document.getElementById(id), on);
  });
  setElementDisplay(bedLocationGridEl(), on);
  var saveBtn = document.querySelector('#modal .btn-save');
  if (saveBtn) saveBtn.textContent = on ? 'Guardar ubicación' : 'Agregar Paciente';
}

function fillCompleteAdmissionLocationInputs(patient) {
  var areaEl = document.getElementById('m-area');
  var servicioEl = document.getElementById('m-servicio');
  var cuartoEl = document.getElementById('m-cuarto');
  var camaEl = document.getElementById('m-cama');
  if (areaEl) areaEl.value = String(patient.area || '');
  if (servicioEl) servicioEl.value = String(patient.servicio || '');
  if (cuartoEl) cuartoEl.value = String(patient.cuarto || '');
  if (camaEl) camaEl.value = String(patient.cama || '');
}

function prefillCompleteAdmissionPatientFields(patient) {
  fillCompleteAdmissionLocationInputs(patient);
  if (!String(patient.servicio || '').trim()) _prefillServicioForSala();
  if (!String(patient.cuarto || '').trim() || !String(patient.cama || '').trim()) {
    _prefillCuartoCamaForSala(patient.registro || '');
  }
}

function setModalCompleteAdmissionMode(on, patient) {
  if (!on) {
    modalCompleteAdmissionPatientId = null;
    return;
  }
  modalCompleteAdmissionPatientId = patient && patient.id ? String(patient.id) : null;
  modalRegistroTunnelMode = false;
  hideCompleteAdmissionManualFields();
  applyCompleteAdmissionFieldVisibility(on);
  if (on) _syncPatientModalModeFields();
  if (on && patient) prefillCompleteAdmissionPatientFields(patient);
}

export function openCompleteAdmissionModal(patientId) {
  var patient = getPatients().find(function (p) {
    return p && String(p.id) === String(patientId);
  });
  if (!patient) return;
  document.getElementById('modal-title').textContent = 'Completar ingreso';
  setModalCompleteAdmissionMode(true, patient);
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationSalaSelect();
  wirePatientRegistrationSalaControls();
  setElementDisplay(document.getElementById('m-sala-group'), false);
  prepareModalBackdropOpen(document.getElementById('modal'));
  setTimeout(function () {
    _focusPatientAdmissionField(true);
  }, 120);
}

export function openAddModal() {
  document.getElementById('modal-title').textContent = 'Agregar por registro';
  ['nombre-manual', 'area', 'servicio', 'cuarto', 'cama'].forEach(function (f) {
    var el = document.getElementById('m-' + f);
    if (el) el.value = '';
  });
  initRegistroModalRows(['']);
  var edadNumManual = document.getElementById('m-edad-num-manual');
  var edadUnitManual = document.getElementById('m-edad-unit-manual');
  if (edadNumManual) edadNumManual.value = '';
  if (edadUnitManual) edadUnitManual.value = 'años';
  document.getElementById('m-sexo').value = 'F';
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationSalaSelect();
  wirePatientRegistrationSalaControls();
  setModalRegistroTunnelMode(true);
  prepareModalBackdropOpen(document.getElementById('modal'));
  setTimeout(function () {
    focusRegistroModalFirst();
  }, 120);
}

export function openAddModalFullManual() {
  document.getElementById('modal-title').textContent = 'Nuevo Paciente';
  modalCompleteAdmissionPatientId = null;
  setModalRegistroTunnelMode(false);
  setModalCompleteAdmissionMode(false, null);
  document.getElementById('modal-prefilled').style.display = 'none';
  document.getElementById('modal-manual-full').style.display = 'block';
  ['nombre-manual', 'area', 'servicio', 'cuarto', 'cama'].forEach(function (f) {
    var el = document.getElementById('m-' + f);
    if (el) el.value = '';
  });
  initRegistroModalRows(['']);
  var edadNumManual = document.getElementById('m-edad-num-manual');
  var edadUnitManual = document.getElementById('m-edad-unit-manual');
  if (edadNumManual) edadNumManual.value = '';
  if (edadUnitManual) edadUnitManual.value = 'años';
  document.getElementById('m-sexo').value = 'F';
  _syncPatientModalModeFields();
  _prefillServicioForSala();
  _prefillCuartoCamaForSala();
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationSalaSelect();
  wirePatientRegistrationSalaControls();
  prepareModalBackdropOpen(document.getElementById('modal'));
  setTimeout(function () {
    _focusPatientAdmissionField(false);
  }, 120);
}

var pendingAddPatientSavedCallback = null;
var pendingAddPatientFromBulkPreview = false;
var modalRegistroTunnelMode = false;

function syncPendingToCommit() {
  setPendingAddPatientSavedCallback(pendingAddPatientSavedCallback);
  setPendingAddPatientFromBulkPreview(pendingAddPatientFromBulkPreview);
}

function isAddPatientModalOpenForRegistro(registro) {
  var modal = document.getElementById('modal');
  if (!modal || !modal.classList.contains('open')) return false;
  var prefilled = document.getElementById('modal-prefilled');
  if (!prefilled || prefilled.style.display === 'none') return false;
  var regEl = document.getElementById('m-registro');
  return String(regEl && regEl.value ? regEl.value : '').trim() === String(registro || '').trim();
}

function syncPendingCallbacksFromModal(opts) {
  pendingAddPatientSavedCallback =
    opts && typeof opts.onSaved === 'function' ? opts.onSaved : null;
  pendingAddPatientFromBulkPreview = !!(opts && opts.fromBulkPreview);
  syncPendingToCommit();
}

function fillLabPatientModalFields(p) {
  document.getElementById('modal-title').textContent = 'Agregar Paciente del Lab';
  document.getElementById('modal-prefilled').style.display = 'block';
  document.getElementById('modal-manual-full').style.display = 'none';
  document.getElementById('m-nombre').value = p.name || '';
  document.getElementById('m-registro').value = p.expediente || '';
  var edadNum = document.getElementById('m-edad-num');
  var edadUnit = document.getElementById('m-edad-unit');
  if (edadNum) {
    var ageNum = parseInt(p.edad, 10);
    edadNum.value = isNaN(ageNum) ? '' : String(ageNum);
  }
  if (edadUnit) edadUnit.value = 'años';
  document.getElementById('m-sexo-ro').value = p.sexo === 'M' ? 'M' : 'F';
  ['area', 'servicio', 'cuarto', 'cama'].forEach(function (f) {
    document.getElementById('m-' + f).value = '';
  });
  _syncPatientModalModeFields();
  var tourAdmit = getTourDemoAdmitDefaults(p.expediente || p.registro || '');
  if (tourAdmit && tourAdmit.servicio) {
    var srvEl = document.getElementById('m-servicio');
    if (srvEl) srvEl.value = tourAdmit.servicio;
  } else {
    _prefillServicioForSala();
  }
  _prefillCuartoCamaForSala(p.expediente || p.registro || '');
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationSalaSelect();
  wirePatientRegistrationSalaControls();
  prepareModalBackdropOpen(document.getElementById('modal'));
  setTimeout(function () {
    _focusPatientAdmissionField(true);
  }, 120);
}

function openAddModalFromLabPatientData(p, opts) {
  if (!p) {
    openAddModal();
    return;
  }
  var registro = String(p.expediente || p.registro || '').trim();
  syncPendingCallbacksFromModal(opts);
  suspendLabBulkPreviewModalIfNeeded(opts);
  void admitPatientViaRegistroTunnel(registro, {
    onAdmitted: function (patient) {
      var onSaved = pendingAddPatientSavedCallback;
      pendingAddPatientSavedCallback = null;
      pendingAddPatientFromBulkPreview = false;
      clearPendingAddPatientCallbacks();
      if (onSaved) {
        try {
          onSaved(patient);
        } catch (e) {
          console.error(e);
        }
      }
    },
    onCancel: function () {
      if (getPendingAddPatientFromBulkPreview()) resumeLabBulkPreviewModalIfSuspended();
    },
  });
}

function suspendLabBulkPreviewModalIfNeeded(opts) {
  if (opts && opts.fromBulkPreview) suspendLabBulkPreviewModal();
}

export function openAddModalFromLab() {
  var lab = rt.getActiveLab && rt.getActiveLab();
  if (!lab) {
    openAddModal();
    return;
  }
  openAddModalFromLabPatientData(lab.patient);
}

/** Alta desde datos SOME explícitos (p. ej. fila de vista previa masiva). */
export function openAddModalFromLabPatient(patient, opts) {
  openAddModalFromLabPatientData(patient, opts);
}

export function closeModal() {
  var wasBulkPreview = getPendingAddPatientFromBulkPreview();
  pendingAddPatientSavedCallback = null;
  pendingAddPatientFromBulkPreview = false;
  modalRegistroTunnelMode = false;
  modalCompleteAdmissionPatientId = null;
  clearPendingAddPatientCallbacks();
  closeModalAnimated(document.getElementById('modal'), function () {
    if (wasBulkPreview) resumeLabBulkPreviewModalIfSuspended();
  });
}

export function confirmCloseAddPatientModal() {
  var hasData = ['m-area', 'm-servicio', 'm-cuarto', 'm-cama'].some(function (id) {
    var el = document.getElementById(id);
    return el && el.value.trim();
  });
  if (hasData && !confirm('¿Cerrar sin guardar?')) return false;
  return true;
}

function saveCompleteAdmissionModal() {
  var patientId = modalCompleteAdmissionPatientId;
  if (!patientId) return false;
  var patient = getPatients().find(function (p) {
    return p && String(p.id) === String(patientId);
  });
  if (!patient) return false;
  var loc = readPatientLocationFields(rt.getSettings());
  if (!validatePatientLocationFields(loc, true)) return false;
  _rememberAdmissionLocation(loc.cuarto, loc.cama);
  patient.area = loc.area;
  patient.servicio = loc.servicio;
  patient.cuarto = loc.cuarto;
  patient.cama = loc.cama;
  patient.lanUpdatedAt = new Date().toISOString();
  persistClinicalState();
  void assignPatientToTeamClinical(patient.id, readPatientRegistrationTeamId()).then(function () {
    patientsBridge.renderPatientList();
    rt.showToast('Ubicación guardada', 'success');
  });
  modalCompleteAdmissionPatientId = null;
  closeModalAnimated(document.getElementById('modal'));
  return true;
}

export function savePatient() {
  if (modalCompleteAdmissionPatientId) {
    saveCompleteAdmissionModal();
    return;
  }
  if (modalRegistroTunnelMode) {
    var registros = collectRegistroModalRegistros();
    if (!registros.length) {
      rt.showToast('Indica el registro', 'error');
      return;
    }
    var registrationTeamId = readPatientRegistrationTeamId();
    closeModalAnimated(document.getElementById('modal'));
    modalRegistroTunnelMode = false;
    void admitPatientsViaRegistroTunnel(registros, { teamId: registrationTeamId });
    return;
  }
  var isFromLab = document.getElementById('modal-prefilled').style.display !== 'none';
  var fields = readPatientModalFields(isFromLab);
  var v = validatePatientForSave(fields);
  if (!v.ok) {
    rt.showToast(v.error, 'error');
    shakePatientFieldsForError(v.error, isFromLab);
    return;
  }
  var ageStr = validatePatientAge(fields.edadNum, isFromLab);
  if (!ageStr) return;
  var edad = ageStr + (fields.edadUnit && fields.edadUnit !== 'años' ? ' ' + fields.edadUnit : '');
  var loc = readPatientLocationFields(rt.getSettings());
  if (!validatePatientLocationFields(loc, isFromLab)) return;
  _rememberAdmissionLocation(loc.cuarto, loc.cama);

  var commit = function () {
    var dup = findDuplicatePatient(fields.nombre, fields.registro);
    if (dup) {
      showDuplicateWarning(dup, function () {
        commitPatientFromModal(
          fields.nombre,
          fields.registro,
          edad,
          fields.sexo,
          loc.area,
          loc.servicio,
          loc.cuarto,
          loc.cama,
          isFromLab
        );
      });
      return;
    }
    commitPatientFromModal(
      fields.nombre,
      fields.registro,
      edad,
      fields.sexo,
      loc.area,
      loc.servicio,
      loc.cuarto,
      loc.cama,
      isFromLab
    );
  };

  if (v.warning === 'missing_expediente' && !isFromLab) {
    showExpedienteAdvice(commit);
    return;
  }
  commit();
}

export function initPatientModalEnterSave() {
  var modal = document.getElementById('modal');
  if (!modal) return;
  modal.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') savePatient();
  });
}

export function focusPatientSearchInput() {
  var el = document.getElementById('patient-search');
  if (!el) return;
  try {
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch {
    try {
      el.focus();
    } catch (_e) { void _e; }
  }
}
