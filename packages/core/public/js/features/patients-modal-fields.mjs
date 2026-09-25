import { shakePatientFieldsForError } from '../ui-motion.mjs';
import { isModeSala } from '../mode-features.mjs';
import { readRegistroModalPrimary } from '../patient-registro-modal-ui.mjs';
import { rt } from './patients-runtime-state.mjs';

export function readPatientModalFields(isFromLab) {
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

export function validatePatientAge(edadNum, isFromLab) {
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

export function readPatientLocationFields(settings) {
  var salaMode = isModeSala(settings);
  var servicio = (document.getElementById('m-servicio').value || '').trim().toUpperCase();
  var area = salaMode ? servicio : (document.getElementById('m-area').value || '').trim().toUpperCase();
  var cuarto = (document.getElementById('m-cuarto').value || '').trim();
  var cama = (document.getElementById('m-cama').value || '').trim();
  return { salaMode: salaMode, servicio: servicio, area: area, cuarto: cuarto, cama: cama };
}

export function validatePatientLocationFields(loc, isFromLab) {
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
