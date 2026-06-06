/** Pendientes (todo list) — formulario y borde pase */
import { storage } from '../storage.js';
import { emitLiveSyncTodoDelete, emitLiveSyncTodoUpsert } from './lan-sync.mjs';
import { isPaseMode } from './chrome.mjs';
import {
  nextTodoPriority,
  normalizeTodoPriority,
  todoPriorityLabel,
} from '../todos-priority.mjs';

var rt = {
  getActiveId() {
    return null;
  },
  getActiveAppTab() {
    return 'lab';
  },
  getRoundOverviewMode() {
    return false;
  },
  renderPaseBoard() {},
};

export function registerTodosRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

function aid() {
  return rt.getActiveId();
}

function pulseTodoPrioChip(chip) {
  if (!chip) return;
  chip.classList.remove('todo-prio-chip--pulse');
  void chip.offsetWidth;
  chip.classList.add('todo-prio-chip--pulse');
  chip.addEventListener(
    'animationend',
    function onEnd(ev) {
      if (ev.animationName !== 'todo-prio-pulse') return;
      chip.removeEventListener('animationend', onEnd);
      chip.classList.remove('todo-prio-chip--pulse');
    }
  );
}

function applyTodoPrioChip(chip, prio, pulse) {
  var valid = normalizeTodoPriority(prio);
  chip.classList.remove('prio-alta', 'prio-media', 'prio-baja');
  chip.classList.add('prio-' + valid);
  chip.dataset.priority = valid;
  var label = chip.querySelector('.todo-prio-label');
  if (label) label.textContent = todoPriorityLabel(valid);
  chip.setAttribute('aria-label', 'Prioridad ' + todoPriorityLabel(valid) + '. Clic para cambiar.');
  chip.title = 'Clic: cambiar prioridad (' + todoPriorityLabel(valid) + ')';
  if (pulse) pulseTodoPrioChip(chip);
  return valid;
}

function createTodoPrioChip(prio, onCycle) {
  var chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'todo-prio-chip';
  var dot = document.createElement('span');
  dot.className = 'todo-prio-dot';
  dot.setAttribute('aria-hidden', 'true');
  var label = document.createElement('span');
  label.className = 'todo-prio-label';
  chip.appendChild(dot);
  chip.appendChild(label);
  applyTodoPrioChip(chip, prio, false);
  chip.addEventListener('click', function () {
    var next = nextTodoPriority(chip.dataset.priority || 'media');
    applyTodoPrioChip(chip, next, true);
    if (onCycle) onCycle(next);
  });
  return chip;
}

function syncTodoRowPriorityVisual(row, prio) {
  if (!row) return;
  var valid = normalizeTodoPriority(prio);
  row.classList.remove('prio-alta', 'prio-media', 'prio-baja');
  row.classList.add('prio-' + valid);
}

function getTodoFormDraftState(container, idPrefix) {
  if (!container) return null;
  var active = document.activeElement;
  if (!active || !container.contains(active)) return null;

  if (active.id === idPrefix + 'todo-input') {
    return { kind: 'new' };
  }

  if (active.classList && active.classList.contains('todo-text-input')) {
    var row = active.closest('.todo-row');
    var todoId = row && row.dataset ? row.dataset.todoId : '';
    if (todoId) return { kind: 'edit', todoId: todoId };
  }

  return null;
}

function clearTodoListSection(container) {
  Array.from(container.children).forEach(function (child) {
    if (!child.classList.contains('todo-add-row')) container.removeChild(child);
  });
}

function findPreservedTodoRow(container, todoId) {
  if (!todoId) return null;
  var rows = container.querySelectorAll('.todo-row[data-todo-id]');
  for (var i = 0; i < rows.length; i += 1) {
    if (rows[i].dataset.todoId === todoId) return rows[i];
  }
  return null;
}

function buildTodoRow(t) {
  var prio = t.priority === 'alta' || t.priority === 'baja' ? t.priority : 'media';
  var row = document.createElement('div');
  row.className = 'todo-row prio-' + prio + (t.completed ? ' completed' : '');
  row.dataset.todoId = t.id;

  var prioChip = createTodoPrioChip(prio, function (next) {
    syncTodoRowPriorityVisual(row, next);
    setTodoPriority(t.id, next, { deferResortMs: 180 });
  });
  row.appendChild(prioChip);

  var chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.className = 'todo-check';
  chk.setAttribute('aria-label', 'Completado');
  chk.checked = !!t.completed;
  chk.addEventListener('change', function () { toggleTodo(t.id); });
  row.appendChild(chk);

  var txtInput = document.createElement('input');
  txtInput.type = 'text';
  txtInput.className = 'todo-text-input';
  txtInput.value = t.text;
  txtInput.placeholder = 'Descripción del pendiente';
  txtInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      txtInput.blur();
    }
  });
  txtInput.addEventListener('blur', function () {
    var v = String(txtInput.value || '').trim();
    if (!v) {
      txtInput.value = t.text;
      return;
    }
    if (v !== String(t.text || '')) updateTodoText(t.id, v);
  });
  row.appendChild(txtInput);

  var del = document.createElement('button');
  del.type = 'button';
  del.className = 'todo-del';
  del.textContent = '×';
  del.title = 'Eliminar';
  del.addEventListener('click', function () { deleteTodo(t.id); });
  row.appendChild(del);

  return row;
}

function appendTodoAddRow(container, idPrefix) {
  var addRow = document.createElement('div');
  addRow.className = 'todo-add-row';
  var input = document.createElement('input');
  input.type = 'text';
  input.id = idPrefix + 'todo-input';
  input.placeholder = 'Nuevo pendiente...';
  var addPrio = 'media';
  var prioChip = createTodoPrioChip(addPrio, function (next) {
    addPrio = next;
  });
  prioChip.id = idPrefix + 'todo-priority-chip';
  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = 'Agregar';
  addBtn.addEventListener('click', function () { addTodo(idPrefix, addPrio); });
  input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') addTodo(idPrefix, addPrio);
  });
  var chkSpacer = document.createElement('span');
  chkSpacer.className = 'todo-check-spacer';
  chkSpacer.setAttribute('aria-hidden', 'true');
  addRow.appendChild(prioChip);
  addRow.appendChild(chkSpacer);
  addRow.appendChild(input);
  addRow.appendChild(addBtn);
  container.appendChild(addRow);
}

function renderTodoListSection(container, preserveTodoId) {
  var preservedRow = preserveTodoId ? findPreservedTodoRow(container, preserveTodoId) : null;
  clearTodoListSection(container);

  var todos = storage.getTodos(aid()).slice().sort(todoCompareForSort);
  if (preservedRow) {
    var stillExists = todos.some(function (t) {
      return t.id === preserveTodoId;
    });
    if (!stillExists) preservedRow = null;
  }

  if (!todos.length && !preservedRow) {
    var none = document.createElement('p');
    none.className = 'todo-empty';
    none.textContent = 'Sin pendientes. Agrega el primero arriba.';
    container.appendChild(none);
    return;
  }

  var list = document.createElement('div');
  list.className = 'todo-list';
  todos.forEach(function (t) {
    if (preservedRow && t.id === preserveTodoId) {
      list.appendChild(preservedRow);
      return;
    }
    list.appendChild(buildTodoRow(t));
  });
  container.appendChild(list);
}

export function todoCompareForSort(a, b) {
  if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
  var prioOrder = { alta: 0, media: 1, baja: 2 };
  var pa = prioOrder[a.priority] != null ? prioOrder[a.priority] : 1;
  var pb = prioOrder[b.priority] != null ? prioOrder[b.priority] : 1;
  if (pa !== pb) return pa - pb;
  if (a.createdAt && b.createdAt) return String(b.createdAt).localeCompare(String(a.createdAt));
  return 0;
}

export function refreshAllTodoUIs() {
  var todoForm = document.getElementById('todo-form');
  if (todoForm) renderTodoFormIn(todoForm, '');
  var overview = document.getElementById('patient-ronda-overview');
  var ronda = document.getElementById('patient-ronda-todos-mount');
  if (!ronda) return;
  var showRonda =
    isPaseMode() &&
    overview &&
    overview.style.display !== 'none' &&
    aid() &&
    rt.getActiveAppTab() === 'nota' &&
    rt.getRoundOverviewMode();
  if (showRonda) {
    renderTodoFormIn(ronda, 'ronda-');
  } else {
    while (ronda.firstChild) ronda.removeChild(ronda.firstChild);
  }
  if (isPaseMode()) rt.renderPaseBoard();
}

export function renderTodoForm() {
  refreshAllTodoUIs();
}

export function renderTodoFormIn(container, idPrefix) {
  if (!container) return;
  idPrefix = idPrefix == null ? '' : String(idPrefix);

  if (!aid()) {
    while (container.firstChild) container.removeChild(container.firstChild);
    var empty = document.createElement('p');
    empty.className = 'todo-empty';
    empty.textContent = 'Selecciona un paciente para ver sus pendientes.';
    container.appendChild(empty);
    return;
  }

  var draft = getTodoFormDraftState(container, idPrefix);
  var hasAddRow = !!container.querySelector('.todo-add-row');
  if (draft && hasAddRow) {
    if (draft.kind === 'new') {
      renderTodoListSection(container, null);
      return;
    }
    if (draft.kind === 'edit') {
      renderTodoListSection(container, draft.todoId);
      return;
    }
  }

  while (container.firstChild) container.removeChild(container.firstChild);
  appendTodoAddRow(container, idPrefix);
  renderTodoListSection(container, null);
}

export function addTodo(idPrefix, priorityOverride) {
  if (idPrefix === undefined || idPrefix === null) idPrefix = '';
  if (typeof idPrefix !== 'string') idPrefix = '';
  if (!aid()) return;
  var input = document.getElementById(idPrefix + 'todo-input');
  if (!input) return;
  var text = String(input.value || '').trim();
  if (!text) return;
  var chip = document.getElementById(idPrefix + 'todo-priority-chip');
  var priority = normalizeTodoPriority(
    priorityOverride || (chip && chip.dataset.priority) || 'media'
  );
  var nowIso = new Date().toISOString();
  var todos = storage.getTodos(aid());
  var row = {
    id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 6),
    text: text,
    completed: false,
    priority: priority,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  todos.push(row);
  storage.saveTodos(aid(), todos);
  emitLiveSyncTodoUpsert(aid(), row);
  input.value = '';
  refreshAllTodoUIs();
}

export function toggleTodo(id) {
  if (!aid()) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  found.completed = !found.completed;
  found.updatedAt = new Date().toISOString();
  storage.saveTodos(aid(), todos);
  emitLiveSyncTodoUpsert(aid(), found);
  refreshAllTodoUIs();
}

export function deleteTodo(id) {
  if (!aid()) return;
  var delAt = new Date().toISOString();
  var todos = storage.getTodos(aid());
  var victim = todos.find(function (t) {
    return t.id === id;
  });
  todos = todos.filter(function (t) {
    return t.id !== id;
  });
  storage.saveTodos(aid(), todos);
  if (victim) emitLiveSyncTodoDelete(aid(), victim);
  else emitLiveSyncTodoDelete(aid(), { id: id, updatedAt: delAt });
  refreshAllTodoUIs();
}

export function setTodoPriority(id, priority, opts) {
  if (!aid()) return;
  opts = opts || {};
  var valid = normalizeTodoPriority(priority);
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  found.priority = valid;
  found.updatedAt = new Date().toISOString();
  storage.saveTodos(aid(), todos);
  emitLiveSyncTodoUpsert(aid(), found);
  if (opts.deferResortMs) {
    setTimeout(refreshAllTodoUIs, opts.deferResortMs);
    return;
  }
  refreshAllTodoUIs();
}

export function updateTodoText(id, text) {
  if (!aid()) return;
  var trimmed = String(text || '').trim();
  if (!trimmed) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) { return t.id === id; });
  if (!found || String(found.text || '') === trimmed) return;
  found.text = trimmed;
  found.updatedAt = new Date().toISOString();
  storage.saveTodos(aid(), todos);
  emitLiveSyncTodoUpsert(aid(), found);
  refreshAllTodoUIs();
}

/**
 * Marca como completados pendientes legacy de reposición electrolítica (Manejo automático).
 * @param {string} patientId
 */
export function archiveLegacyRepoTodos(patientId) {
  if (!patientId) return;
  var todos = storage.getTodos(patientId).map(function (t) {
    if (!t || t.completed) return t;
    var rid = String(t.labRuleId || '');
    var txt = String(t.text || '');
    if (rid.indexOf('manejo:') === 0 || /^Repo /i.test(txt)) {
      return { ...t, completed: true, updatedAt: new Date().toISOString() };
    }
    return t;
  });
  storage.saveTodos(patientId, todos);
}

export const todosWindowHandlers = {
  renderTodoForm,
  addTodo,
  toggleTodo,
  deleteTodo,
  setTodoPriority,
};
