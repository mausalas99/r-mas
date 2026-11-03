import { resolvePatientFieldIds } from '../ui-motion.mjs';
import { markFieldInvalid } from '../ui-field-invalid.mjs';
import { isModeSala } from '../mode-features.mjs';
import { readRegistroModalPrimary } from '../patient-registro-modal-ui.mjs';

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

// Inline error under the field that caused it; focus moves there.
export function flagPatientFieldError(message, isFromLab) {
  var el = resolvePatientFieldIds(message, isFromLab)
    .map(function (id) { return document.getElementById(id); })
    .find(Boolean);
  markFieldInvalid(el, message);
}

export function validatePatientAge(edadNum, isFromLab) {
  if (!edadNum) {
    flagPatientFieldError('Ingresa la edad', isFromLab);
    return null;
  }
  var ageInt = parseInt(edadNum, 10);
  if (isNaN(ageInt) || ageInt < 0 || ageInt > 120) {
    flagPatientFieldError('Edad inválida', isFromLab);
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
    flagPatientFieldError(servicioMsg, isFromLab);
    return false;
  }
  if (!loc.salaMode && !loc.area) {
    flagPatientFieldError('Ingresa área / departamento', isFromLab);
    return false;
  }
  if (!loc.cuarto || !loc.cama) {
    flagPatientFieldError('Ingresa cuarto y cama', isFromLab);
    return false;
  }
  return true;
}
