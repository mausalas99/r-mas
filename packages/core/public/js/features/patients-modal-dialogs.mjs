import { getPatients, getNotes } from '../app-state.mjs';
import { buildExpedienteAdvice } from '../patient-validation.mjs';
import { focusRegistroModalAny } from '../patient-registro-modal-ui.mjs';

function normalizeName(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function findDuplicatePatient(nombre, registro) {
  var nombreNorm = normalizeName(nombre);
  return getPatients().find(function (p) {
    if (p.isDemo) return false;
    if (registro && p.registro && registro === p.registro) return true;
    return normalizeName(p.nombre) === nombreNorm;
  });
}

// The Preact dialogs load on first use: a static import would join the boot graph.
function withView(fn, backdrop) {
  import('./patients-modal-dialogs-view.jsx').then(fn, function () {
    backdrop.remove();
  });
}

export function showDuplicateWarning(existing, onConfirm) {
  var fecha = getNotes()[existing.id] ? getNotes()[existing.id].fecha : '';
  var backdrop = document.createElement('div');
  backdrop.className = 'lab-conflict-backdrop';
  backdrop.id = 'dup-confirm-backdrop';
  document.body.appendChild(backdrop);
  withView(function (view) {
    view.drawDuplicateWarning(backdrop, {
      existing: existing,
      fecha: fecha,
      onCancel: function () { backdrop.remove(); },
      onConfirm: function () { backdrop.remove(); onConfirm(); },
    });
  }, backdrop);
}

export function showExpedienteAdvice(onConfirm) {
  var prev = document.getElementById('exp-advice-backdrop');
  if (prev) prev.remove();
  var advice = buildExpedienteAdvice();
  var b = document.createElement('div');
  b.className = 'lab-conflict-backdrop';
  b.id = 'exp-advice-backdrop';
  document.body.appendChild(b);
  withView(function (view) {
    view.drawExpedienteAdvice(b, {
      advice: advice,
      onCancel: function () { b.remove(); focusRegistroModalAny(); },
      onConfirm: function () { b.remove(); onConfirm(); },
    });
  }, b);
}
