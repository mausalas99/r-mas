/** Pendientes — UI refresh after storage/LAN changes. */
import { isPaseMode } from './chrome.mjs';
import { aid, getTodosRuntime } from './todos-runtime.mjs';
import { renderTodoFormIn } from './todos-list-render.mjs';

/** LAN-scoped repaint: active patient todo form + pase board when sync touched one patient. */
export function refreshTodoUIsForPatient(patientId, opts) {
  opts = opts || {};
  var pid = String(patientId || '').trim();
  if (!pid) return;

  if (aid() === pid) {
    var todoForm = document.getElementById('todo-form');
    if (todoForm) renderTodoFormIn(todoForm, '');
  }

  if (isPaseMode() && !opts.skipPaseBoard) {
    getTodosRuntime().renderPaseBoard();
  }
}

/** Batch LAN refresh — one pase-board repaint for many touched patients. */
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
    refreshTodoUIsForPatient(pid, { skipPaseBoard: true });
  });
  if (unique.length && isPaseMode()) {
    getTodosRuntime().renderPaseBoard();
  }
}

export function refreshAllTodoUIs() {
  var todoForm = document.getElementById('todo-form');
  if (todoForm) renderTodoFormIn(todoForm, '');
  if (isPaseMode()) getTodosRuntime().renderPaseBoard();
}

export function renderTodoForm() {
  refreshAllTodoUIs();
}
