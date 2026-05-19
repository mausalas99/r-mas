/** Pendientes (todo list) — formulario y borde pase */
import { storage } from '../storage.js';
import { emitLiveSyncTodoDelete, emitLiveSyncTodoUpsert } from './lan-sync.mjs';
import { isPaseMode } from './chrome.mjs';

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

export function registerTodosRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

function aid() {
  return rt.getActiveId();
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
  var elClassic = document.getElementById('todo-form');
  if (elClassic) renderTodoFormIn(elClassic, '');
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
  while (container.firstChild) container.removeChild(container.firstChild);

  if (!aid()) {
    var empty = document.createElement('p');
    empty.className = 'todo-empty';
    empty.textContent = 'Selecciona un paciente para ver sus pendientes.';
    container.appendChild(empty);
    return;
  }

  var addRow = document.createElement('div');
  addRow.className = 'todo-add-row';
  var input = document.createElement('input');
  input.type = 'text';
  input.id = idPrefix + 'todo-input';
  input.placeholder = 'Nuevo pendiente...';
  var sel = document.createElement('select');
  sel.id = idPrefix + 'todo-priority';
  [
    { v: 'alta',  t: 'Alta'  },
    { v: 'media', t: 'Media' },
    { v: 'baja',  t: 'Baja'  }
  ].forEach(function (o) {
    var opt = document.createElement('option');
    opt.value = o.v;
    opt.textContent = o.t;
    if (o.v === 'media') opt.selected = true;
    sel.appendChild(opt);
  });
  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = 'Agregar';
  addBtn.addEventListener('click', function () { addTodo(idPrefix); });
  input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') addTodo(idPrefix);
  });
  addRow.appendChild(input);
  addRow.appendChild(sel);
  addRow.appendChild(addBtn);
  container.appendChild(addRow);

  var todos = storage.getTodos(aid()).slice().sort(todoCompareForSort);
  if (!todos.length) {
    var none = document.createElement('p');
    none.className = 'todo-empty';
    none.textContent = 'Sin pendientes. Agrega el primero arriba.';
    container.appendChild(none);
    return;
  }

  var list = document.createElement('div');
  todos.forEach(function (t) {
    var prio = t.priority === 'alta' || t.priority === 'baja' ? t.priority : 'media';
    var row = document.createElement('div');
    row.className = 'todo-row prio-' + prio + (t.completed ? ' completed' : '');

    var chip = document.createElement('span');
    chip.className = 'todo-prio ' + prio;
    chip.title = 'Prioridad: ' + (prio === 'alta' ? 'Alta' : prio === 'baja' ? 'Baja' : 'Media');
    row.appendChild(chip);

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

    var prioSel = document.createElement('select');
    prioSel.className = 'todo-row-select';
    [
      { v: 'alta',  t: 'Alta'  },
      { v: 'media', t: 'Media' },
      { v: 'baja',  t: 'Baja'  }
    ].forEach(function (o) {
      var opt = document.createElement('option');
      opt.value = o.v;
      opt.textContent = o.t;
      if (o.v === prio) opt.selected = true;
      prioSel.appendChild(opt);
    });
    prioSel.title = 'Cambiar prioridad';
    prioSel.addEventListener('change', function () { setTodoPriority(t.id, prioSel.value); });
    row.appendChild(prioSel);

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'todo-del';
    del.textContent = '×';
    del.title = 'Eliminar';
    del.addEventListener('click', function () { deleteTodo(t.id); });
    row.appendChild(del);

    list.appendChild(row);
  });
  container.appendChild(list);
}

export function addTodo(idPrefix) {
  if (idPrefix === undefined || idPrefix === null) idPrefix = '';
  if (typeof idPrefix !== 'string') idPrefix = '';
  if (!aid()) return;
  var input = document.getElementById(idPrefix + 'todo-input');
  var sel   = document.getElementById(idPrefix + 'todo-priority');
  if (!input) return;
  var text = String(input.value || '').trim();
  if (!text) return;
  var priority = sel && (sel.value === 'alta' || sel.value === 'baja' || sel.value === 'media') ? sel.value : 'media';
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
  var todos = storage.getTodos(aid()).filter(function (t) { return t.id !== id; });
  storage.saveTodos(aid(), todos);
  emitLiveSyncTodoDelete(aid(), id, delAt);
  refreshAllTodoUIs();
}

export function setTodoPriority(id, priority) {
  if (!aid()) return;
  var valid = priority === 'alta' || priority === 'baja' || priority === 'media' ? priority : 'media';
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  found.priority = valid;
  found.updatedAt = new Date().toISOString();
  storage.saveTodos(aid(), todos);
  emitLiveSyncTodoUpsert(aid(), found);
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

export const todosWindowHandlers = {
  renderTodoForm,
  addTodo,
  toggleTodo,
  deleteTodo,
  setTodoPriority,
};
