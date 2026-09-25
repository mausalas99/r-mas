/** Pendientes — UI refresh after storage/LAN changes. */
import { aid } from './todos-runtime.mjs';
import { renderTodoFormIn } from './todos-list-render.mjs';

/** LAN-scoped repaint: active patient todo form when sync touched one patient. */
export function refreshTodoUIsForPatient(patientId) {
  var pid = String(patientId || '').trim();
  if (!pid) return;

  if (aid() === pid) {
    var todoForm = document.getElementById('todo-form');
    if (todoForm) renderTodoFormIn(todoForm, '');
  }
}

/** Batch LAN refresh for many touched patients. */
export function refreshTodoUIsForPatients(patientIds) {
  var seen = Object.create(null);
  var unique = [];
  (patientIds || []).forEach(function (pid) {
    var id = String(pid || '').trim();
    if (!id || seen[id]) return;
    seen[id] = true;
    unique.push(id);
  });
  unique.forEach(function (pid) {
    refreshTodoUIsForPatient(pid);
  });
}

export function refreshAllTodoUIs() {
  var todoForm = document.getElementById('todo-form');
  if (todoForm) renderTodoFormIn(todoForm, '');
}

export function renderTodoForm() {
  refreshAllTodoUIs();
}
