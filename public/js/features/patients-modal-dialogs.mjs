import { getPatients, getNotes } from '../app-state.mjs';
import { buildExpedienteAdvice } from '../patient-validation.mjs';
import { esc } from './patients-html.mjs';
import { escTxtSafe } from './patients-html.mjs';
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

export function showDuplicateWarning(existing, onConfirm) {
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

export function showExpedienteAdvice(onConfirm) {
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
