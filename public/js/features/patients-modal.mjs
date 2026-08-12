import { getPatients, getNotes, persistClinicalState } from '../app-state.mjs';
import { storage } from '../storage.js';
import { validatePatientForSave, buildExpedienteAdvice } from '../patient-validation.mjs';
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
import { esc } from './patients-html.mjs';
import { escTxtSafe } from './patients-html.mjs';
import { commitPatientFromModal, clearPendingAddPatientCallbacks, setPendingAddPatientFromBulkPreview, setPendingAddPatientSavedCallback, getPendingAddPatientFromBulkPreview } from './patients-modal-commit.mjs';
import { resumeLabBulkPreviewModalIfSuspended, suspendLabBulkPreviewModal } from './lab-bulk-preview-modal.mjs';
import { admitPatientsViaRegistroTunnel, admitPatientViaRegistroTunnel } from '../patient-registro-tunnel.mjs';
import {
  initRegistroModalRows,
  setRegistroModalMultiMode,
  collectRegistroModalRegistros,
  readRegistroModalPrimary,
  focusRegistroModalFirst,
  focusRegistroModalAny,
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

function setModalRegistroTunnelMode(on) {
  modalRegistroTunnelMode = !!on;
  if (on) modalCompleteAdmissionPatientId = null;
  var prefilled = document.getElementById('modal-prefilled');
  var manualFull = document.getElementById('modal-manual-full');
  var saveBtn = document.querySelector('#modal .btn-save');
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
  if (saveBtn) {
    saveBtn.textContent = on
      ? 'Buscar registros'
      : modalCompleteAdmissionPatientId
        ? 'Guardar'
        : 'Agregar Paciente';
  }
  var regLabel = document.getElementById('m-registro-manual-label');
  var regHint = document.getElementById('m-registro-manual-hint');
  setRegistroModalMultiMode(on);
  if (regLabel) regLabel.textContent = on ? 'Registro(s)' : 'Registro';
  setElementDisplay(regHint, on);
  if (!on && !modalCompleteAdmissionPatientId) _syncPatientModalModeFields();
}

var modalCompleteAdmissionPatientId = null;

function setModalCompleteAdmissionMode(on, patient) {
  if (!on) {
    modalCompleteAdmissionPatientId = null;
    return;
  }
  modalCompleteAdmissionPatientId = patient && patient.id ? String(patient.id) : null;
  modalRegistroTunnelMode = false;
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
  ['m-area-group', 'm-servicio-group', 'm-sala-group'].forEach(function (id) {
    setElementDisplay(document.getElementById(id), on);
  });
  setElementDisplay(bedLocationGridEl(), on);
  var saveBtn = document.querySelector('#modal .btn-save');
  if (saveBtn) saveBtn.textContent = on ? 'Guardar ubicación' : 'Agregar Paciente';
  if (on) _syncPatientModalModeFields();
  if (on && patient) {
    var areaEl = document.getElementById('m-area');
    var servicioEl = document.getElementById('m-servicio');
    var cuartoEl = document.getElementById('m-cuarto');
    var camaEl = document.getElementById('m-cama');
    if (areaEl) areaEl.value = String(patient.area || '');
    if (servicioEl) servicioEl.value = String(patient.servicio || '');
    if (cuartoEl) cuartoEl.value = String(patient.cuarto || '');
    if (camaEl) camaEl.value = String(patient.cama || '');
    if (!String(patient.servicio || '').trim()) _prefillServicioForSala();
    if (!String(patient.cuarto || '').trim() || !String(patient.cama || '').trim()) {
      _prefillCuartoCamaForSala(patient.registro || '');
    }
  }
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

function openAddModalFullManual() {
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

function normalizeName(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function findDuplicatePatient(nombre, registro) {
  var nombreNorm = normalizeName(nombre);
  return getPatients().find(function (p) {
    if (p.isDemo) return false;
    if (registro && p.registro && registro === p.registro) return true;
    return normalizeName(p.nombre) === nombreNorm;
  });
}

function showDuplicateWarning(existing, onConfirm) {
  var fecha = getNotes()[existing.id] ? getNotes()[existing.id].fecha : '';
  var body = '<strong>' + esc(existing.nombre) + '</strong>';
  body += '<br>Cto. ' + esc(existing.cuarto || '—') + ' Cama ' + esc(existing.cama || '—');
  if (existing.registro) body += '<br>Registro: ' + esc(existing.registro);
  if (fecha) body += '<br>Ingreso: ' + esc(fecha);
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'dup-confirm-backdrop';
  backdrop.innerHTML =
    '<div class="lab-conflict-modal">' +
    '<h3>Paciente similar encontrado</h3>' +
    '<p>' +
    body +
    '</p>' +
    '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">' +
    '<button onclick="document.getElementById(\'dup-confirm-backdrop\').remove()" style="background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:#1f2937;">Cancelar</button>' +
    '<button id="dup-confirm-btn" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Agregar de todas formas</button>' +
    '</div></div>';
  document.body.appendChild(backdrop);
  document.getElementById('dup-confirm-btn').onclick = function () {
    document.getElementById('dup-confirm-backdrop').remove();
    onConfirm();
  };
}

function readPatientModalFields(isFromLab) {
  if (isFromLab) {
    return {
      nombre: (document.getElementById('m-nombre').value || '').trim().toUpperCase(),
      registro: (document.getElementById('m-registro').value || '').trim(),
      edadNum: (document.getElementById('m-edad-num').value || '').trim(),
      edadUnit: document.getElementById('m-edad-unit').value || 'años',
      sexo: document.getElementById('m-sexo-ro').value || 'F',
    };
  }
  return {
    nombre: (document.getElementById('m-nombre-manual').value || '').trim().toUpperCase(),
    registro: readRegistroModalPrimary(),
    edadNum: (document.getElementById('m-edad-num-manual').value || '').trim(),
    edadUnit: document.getElementById('m-edad-unit-manual').value || 'años',
    sexo: document.getElementById('m-sexo').value,
  };
}

function validatePatientAge(edadNum, isFromLab) {
  if (!edadNum) {
    rt.showToast('Ingresa la edad', 'error');
    shakePatientFieldsForError('Ingresa la edad', isFromLab);
    return null;
  }
  var ageInt = parseInt(edadNum, 10);
  if (isNaN(ageInt) || ageInt < 0 || ageInt > 120) {
    rt.showToast('Edad inválida', 'error');
    shakePatientFieldsForError('Edad inválida', isFromLab);
    return null;
  }
  return String(ageInt);
}

function readPatientLocationFields(settings) {
  var salaMode = isModeSala(settings);
  var servicio = (document.getElementById('m-servicio').value || '').trim().toUpperCase();
  var area = salaMode ? servicio : (document.getElementById('m-area').value || '').trim().toUpperCase();
  var cuarto = (document.getElementById('m-cuarto').value || '').trim();
  var cama = (document.getElementById('m-cama').value || '').trim();
  return { salaMode: salaMode, servicio: servicio, area: area, cuarto: cuarto, cama: cama };
}

function validatePatientLocationFields(loc, isFromLab) {
  if (!loc.servicio) {
    var servicioMsg = loc.salaMode ? 'Ingresa Área / Servicio' : 'Ingresa servicio';
    rt.showToast(servicioMsg, 'error');
    shakePatientFieldsForError(servicioMsg, isFromLab);
    return false;
  }
  if (!loc.salaMode && !loc.area) {
    rt.showToast('Ingresa área / departamento', 'error');
    shakePatientFieldsForError('Ingresa área / departamento', isFromLab);
    return false;
  }
  if (!loc.cuarto || !loc.cama) {
    rt.showToast('Ingresa cuarto y cama', 'error');
    shakePatientFieldsForError('Ingresa cuarto y cama', isFromLab);
    return false;
  }
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

function showExpedienteAdvice(onConfirm) {
  var prev = document.getElementById('exp-advice-backdrop');
  if (prev) prev.remove();
  var advice = buildExpedienteAdvice();
  var b = document.createElement('div');
  b.className = 'lab-conflict-backdrop';
  b.id = 'exp-advice-backdrop';
  b.innerHTML =
    '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="exp-advice-title">' +
    '<h3 id="exp-advice-title">' +
    escTxtSafe(advice.title) +
    '</h3>' +
    '<p>' +
    escTxtSafe(advice.body) +
    '</p>' +
    '<div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;">' +
    '<button type="button" class="btn-cancel" id="exp-advice-cancel">' +
    escTxtSafe(advice.cancelLabel) +
    '</button>' +
    '<button type="button" class="btn-conflict-primary" id="exp-advice-confirm">' +
    escTxtSafe(advice.confirmLabel) +
    '</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(b);
  var close = function () {
    var x = document.getElementById('exp-advice-backdrop');
    if (x) x.remove();
  };
  document.getElementById('exp-advice-cancel').onclick = function () {
    close();
    focusRegistroModalAny();
  };
  document.getElementById('exp-advice-confirm').onclick = function () {
    close();
    onConfirm();
  };
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
