/** Pendientes (todo list) — formulario y borde pase */
import { storage } from '../storage.js';
import { emitLiveSyncTodoDelete, emitLiveSyncTodoUpsert } from './lan-sync.mjs';
import { isPaseMode } from './chrome.mjs';
import {
  nextTodoPriority,
  normalizeTodoPriority,
  todoPriorityLabel,
} from '../todos-priority.mjs';
import {
  formatTodoDueLabel,
  getTodoDuePresets,
  isTodoOverdue,
  parseDuePreset,
  todoCompareForDueSort,
} from '../todos-due.mjs';
import { openTodoDueModal } from '../todo-due-modal.mjs';
import { rescheduleAllTodos } from '../todos-reminder-scheduler.mjs';
import {
  TODO_FILTER_ALL,
  TODO_FILTER_HANDOFF,
  isHandoffTodo,
  filterTodosByView,
  countHandoffTodos,
  formatTodoCreatorLabel,
  buildHandoffAckPatch,
} from '../todos-handoff.mjs';

var listFilter = TODO_FILTER_ALL;

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
  getSettings() {
    return {};
  },
  renderPaseBoard() {},
};

export function registerTodosRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

function aid() {
  return rt.getActiveId();
}

function getClinicalUsername() {
  var st = rt.getSettings() || {};
  var u = st.clinicalUsername;
  return u ? String(u) : null;
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
    if (child.classList.contains('todo-composer')) return;
    container.removeChild(child);
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

function appendTodoHandoffMeta(cell, todo) {
  if (!isHandoffTodo(todo, getClinicalUsername())) return;
  var meta = document.createElement('div');
  meta.className = 'todo-handoff-meta';
  var creator = document.createElement('span');
  creator.className = 'todo-handoff-creator';
  creator.textContent = 'De ' + formatTodoCreatorLabel(todo.createdBy);
  meta.appendChild(creator);
  cell.appendChild(meta);
}

function appendTodoMainCell(row, todo, txtInput) {
  var cell = document.createElement('div');
  cell.className = 'todo-cell-main';
  cell.appendChild(txtInput);
  appendTodoHandoffMeta(cell, todo);
  if (todo.dueDate) {
    var dueLabel = document.createElement('span');
    dueLabel.className = 'todo-due-label';
    dueLabel.textContent = formatTodoDueLabel(todo.dueDate);
    if (todo.reminderAt) {
      dueLabel.appendChild(document.createTextNode(' '));
      var bell = document.createElement('span');
      bell.className = 'todo-remind-bell';
      bell.setAttribute('aria-hidden', 'true');
      bell.textContent = '\uD83D\uDD14';
      dueLabel.appendChild(bell);
    }
    cell.appendChild(dueLabel);
  }
  row.appendChild(cell);
}

function buildTodoRow(t) {
  var prio = t.priority === 'alta' || t.priority === 'baja' ? t.priority : 'media';
  var row = document.createElement('div');
  row.className = 'todo-row prio-' + prio + (t.completed ? ' completed' : '');
  if (isTodoOverdue(t)) row.classList.add('todo-row--overdue');
  if (isHandoffTodo(t, getClinicalUsername())) row.classList.add('todo-row--handoff');
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
  appendTodoMainCell(row, t, txtInput);

  var actions = document.createElement('div');
  actions.className = 'todo-row-actions';
  if (isHandoffTodo(t, getClinicalUsername())) {
    var ack = document.createElement('button');
    ack.type = 'button';
    ack.className = 'todo-handoff-ack';
    ack.textContent = 'Recibido';
    ack.title = 'Marcar como recibido del turno anterior';
    ack.addEventListener('click', function () { acknowledgeHandoffTodo(t.id); });
    actions.appendChild(ack);
  }
  var del = document.createElement('button');
  del.type = 'button';
  del.className = 'todo-del';
  del.textContent = '×';
  del.title = 'Eliminar';
  del.addEventListener('click', function () { deleteTodo(t.id); });
  actions.appendChild(del);
  row.appendChild(actions);

  return row;
}

function appendTodoFilterBar(container) {
  var existingToolbar = container.querySelector('.todo-toolbar');
  if (existingToolbar) existingToolbar.remove();

  var toolbar = document.createElement('div');
  toolbar.className = 'todo-toolbar';

  var bar = document.createElement('div');
  bar.className = 'todo-filter-bar todo-segmented';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Filtrar pendientes');

  var allTodos = storage.getTodos(aid());
  var handoffCount = countHandoffTodos(allTodos, getClinicalUsername());
  var filters = [
    { id: TODO_FILTER_ALL, label: 'Todos' },
    {
      id: TODO_FILTER_HANDOFF,
      label: handoffCount ? 'Entrega (' + handoffCount + ')' : 'Entrega',
    },
  ];

  filters.forEach(function (f) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'todo-filter-chip' + (listFilter === f.id ? ' is-active' : '');
    btn.dataset.filter = f.id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', listFilter === f.id ? 'true' : 'false');
    btn.textContent = f.label;
    btn.addEventListener('click', function () {
      listFilter = f.id;
      renderTodoListSection(container, null);
    });
    bar.appendChild(btn);
  });

  toolbar.appendChild(bar);
  container.appendChild(toolbar);
}

function syncDueAddSelection(state, toggleEl, selectionEl, presetBtns) {
  state.reminderAt = state.remindEnabled && state.dueDate ? state.dueDate : null;
  if (toggleEl) {
    toggleEl.textContent = 'Fecha límite';
    toggleEl.setAttribute(
      'aria-label',
      state.dueDate
        ? 'Cambiar fecha límite: ' + formatTodoDueLabel(state.dueDate)
        : 'Elegir fecha límite'
    );
  }
  if (selectionEl) {
    var label = state.dueDate ? formatTodoDueLabel(state.dueDate) : '';
    if (state.dueDate && state.remindEnabled) label += ' 🔔';
    selectionEl.textContent = label;
    selectionEl.hidden = !state.dueDate;
  }
  (presetBtns || []).forEach(function (btn) {
    var presetId = String(btn.dataset.preset || '');
    var fields = parseDuePreset(presetId);
    var active = !!(state.dueDate && fields.dueDate && state.dueDate === fields.dueDate);
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function applyDuePresetToAddState(state, presetId, toggleEl, selectionEl, presetBtns) {
  var fields = parseDuePreset(presetId);
  state.dueDate = fields.dueDate;
  state.reminderAt = null;
  state.remindEnabled = false;
  syncDueAddSelection(state, toggleEl, selectionEl, presetBtns);
}

function createTodoDueAddSection(idPrefix) {
  idPrefix = idPrefix == null ? '' : String(idPrefix);
  var state = { dueDate: null, reminderAt: null, remindEnabled: false };
  var section = document.createElement('div');
  section.className = 'todo-due-section';

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'todo-due-toggle';
  toggle.textContent = 'Fecha límite';
  toggle.setAttribute('aria-haspopup', 'dialog');

  var selection = document.createElement('span');
  selection.className = 'todo-due-selection';
  selection.hidden = true;

  var primary = document.createElement('div');
  primary.className = 'todo-due-section-primary';

  var presetsWrap = document.createElement('div');
  presetsWrap.className = 'todo-due-presets';
  presetsWrap.setAttribute('role', 'group');
  presetsWrap.setAttribute('aria-label', 'Fechas rápidas');

  var presetBtns = [];
  function wirePresetButton(btn, preset) {
    btn.type = 'button';
    btn.className = 'todo-due-preset-chip';
    btn.dataset.preset = preset.id;
    btn.textContent = preset.label;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', function () {
      if (state.dueDate) {
        var current = parseDuePreset(preset.id);
        if (current.dueDate && state.dueDate === current.dueDate) {
          state.dueDate = null;
          state.reminderAt = null;
          state.remindEnabled = false;
          syncDueAddSelection(state, toggle, selection, presetBtns);
          return;
        }
      }
      applyDuePresetToAddState(state, preset.id, toggle, selection, presetBtns);
    });
  }
  function rebuildPresetButtons() {
    presetsWrap.textContent = '';
    presetBtns.length = 0;
    getTodoDuePresets().forEach(function (preset) {
      var btn = document.createElement('button');
      wirePresetButton(btn, preset);
      presetsWrap.appendChild(btn);
      presetBtns.push(btn);
    });
    syncDueAddSelection(state, toggle, selection, presetBtns);
  }
  rebuildPresetButtons();
  if (typeof document !== 'undefined' && !document._todoDuePresetsComposerWired) {
    document._todoDuePresetsComposerWired = true;
    document.addEventListener('rpc-todo-due-presets-changed', function () {
      rebuildPresetButtons();
    });
  }

  syncDueAddSelection(state, toggle, selection, presetBtns);

  toggle.addEventListener('click', function () {
    openTodoDueModal({
      dueDate: state.dueDate,
      remindEnabled: state.remindEnabled,
      onSave: function (fields) {
        state.dueDate = fields.dueDate;
        state.reminderAt = fields.reminderAt;
        state.remindEnabled = !!fields.remindEnabled;
        syncDueAddSelection(state, toggle, selection, presetBtns);
      },
    });
  });

  primary.appendChild(toggle);
  primary.appendChild(selection);
  section.appendChild(primary);
  section.appendChild(presetsWrap);

  return {
    element: section,
    getFields: function () {
      return { dueDate: state.dueDate, reminderAt: state.reminderAt };
    },
    reset: function () {
      state.dueDate = null;
      state.reminderAt = null;
      state.remindEnabled = false;
      syncDueAddSelection(state, toggle, selection, presetBtns);
    },
  };
}

function appendTodoAddRow(container, idPrefix) {
  var composer = document.createElement('div');
  composer.className = 'todo-composer';

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
  var dueControls = createTodoDueAddSection(idPrefix);
  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'todo-add-btn';
  addBtn.textContent = 'Agregar';
  function submitAdd() {
    addTodo(idPrefix, addPrio, dueControls.getFields());
    dueControls.reset();
  }
  addBtn.addEventListener('click', submitAdd);
  input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') submitAdd();
  });
  var chkSpacer = document.createElement('span');
  chkSpacer.className = 'todo-check-spacer';
  chkSpacer.setAttribute('aria-hidden', 'true');
  addRow.appendChild(prioChip);
  addRow.appendChild(chkSpacer);
  addRow.appendChild(input);
  addRow.appendChild(addBtn);
  composer.appendChild(addRow);
  composer.appendChild(dueControls.element);
  container.appendChild(composer);
}

function renderTodoListSection(container, preserveTodoId) {
  var preservedRow = preserveTodoId ? findPreservedTodoRow(container, preserveTodoId) : null;
  clearTodoListSection(container);
  appendTodoFilterBar(container);

  var todos = filterTodosByView(storage.getTodos(aid()), listFilter, getClinicalUsername())
    .slice()
    .sort(todoCompareForDueSort);
  if (preservedRow) {
    var stillExists = todos.some(function (t) {
      return t.id === preserveTodoId;
    });
    if (!stillExists) preservedRow = null;
  }

  if (!todos.length && !preservedRow) {
    var none = document.createElement('div');
    none.className = 'todo-empty';
    none.setAttribute('role', 'status');
    if (listFilter === TODO_FILTER_HANDOFF) {
      none.innerHTML =
        '<span class="empty-state-title">Sin pendientes del turno anterior para este paciente</span>' +
        '<span class="empty-state-lead">Los que quedaron abiertos al cerrar el turno previo aparecerán aquí.</span>';
    } else {
      none.innerHTML =
        '<span class="empty-state-title">Sin pendientes</span>' +
        '<span class="empty-state-lead">Usa el campo de arriba para agregar uno.</span>';
    }
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

function refreshRondaTodoMount() {
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
}

/** LAN-scoped repaint: active patient todo form + pase board when sync touched one patient. */
export function refreshTodoUIsForPatient(patientId, opts) {
  opts = opts || {};
  var pid = String(patientId || '').trim();
  if (!pid) return;

  if (aid() === pid) {
    var todoForm = document.getElementById('todo-form');
    if (todoForm) renderTodoFormIn(todoForm, '');
    refreshRondaTodoMount();
  }

  if (isPaseMode() && !opts.skipPaseBoard) {
    rt.renderPaseBoard();
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
    rt.renderPaseBoard();
  }
}

export function refreshAllTodoUIs() {
  var todoForm = document.getElementById('todo-form');
  if (todoForm) renderTodoFormIn(todoForm, '');
  refreshRondaTodoMount();
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
    var empty = document.createElement('div');
    empty.className = 'todo-empty';
    empty.setAttribute('role', 'status');
    empty.innerHTML =
      '<span class="empty-state-title">Elige un paciente para ver pendientes</span>' +
      '<span class="empty-state-lead">Selecciona uno en la lista de la izquierda.</span>';
    container.appendChild(empty);
    return;
  }

  container.classList.add('todo-shell');

  var draft = getTodoFormDraftState(container, idPrefix);
  var hasAddRow = !!container.querySelector('.todo-composer, .todo-add-row');
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

export function addTodo(idPrefix, priorityOverride, dueFields) {
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
  var username = getClinicalUsername();
  if (username) row.createdBy = username;
  if (dueFields && dueFields.dueDate) {
    row.dueDate = dueFields.dueDate;
    if (dueFields.reminderAt) row.reminderAt = dueFields.reminderAt;
  }
  todos.push(row);
  storage.saveTodos(aid(), todos);
  emitLiveSyncTodoUpsert(aid(), row);
  rescheduleAllTodos(aid());
  input.value = '';
  refreshAllTodoUIs();
}

export function toggleTodo(id) {
  if (!aid()) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) { return t.id === id; });
  if (!found) return;
  var nowIso = new Date().toISOString();
  var username = getClinicalUsername();
  found.completed = !found.completed;
  if (found.completed) {
    found.completedAt = nowIso;
    if (username) found.completedBy = username;
  } else {
    found.completedAt = null;
    found.completedBy = null;
  }
  found.updatedAt = nowIso;
  storage.saveTodos(aid(), todos);
  emitLiveSyncTodoUpsert(aid(), found);
  rescheduleAllTodos(aid());
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
  rescheduleAllTodos(aid());
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
  rescheduleAllTodos(aid());
  if (opts.deferResortMs) {
    setTimeout(refreshAllTodoUIs, opts.deferResortMs);
    return;
  }
  refreshAllTodoUIs();
}

export function acknowledgeHandoffTodo(id) {
  if (!aid()) return;
  var todos = storage.getTodos(aid());
  var found = todos.find(function (t) {
    return t.id === id;
  });
  if (!found || !isHandoffTodo(found, getClinicalUsername())) return;
  Object.assign(found, buildHandoffAckPatch(getClinicalUsername()));
  storage.saveTodos(aid(), todos);
  emitLiveSyncTodoUpsert(aid(), found);
  rescheduleAllTodos(aid());
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
  rescheduleAllTodos(aid());
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
