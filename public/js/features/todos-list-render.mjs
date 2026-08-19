/** Pendientes — list/row DOM render. */
import { storage } from '../storage.js';
import {
  formatTodoDueLabel,
  isTodoOverdue,
  todoCompareForDueSort,
  groupTodosByStatus,
} from '../todos-due.mjs';
import {
  TODO_FILTER_ALL,
  TODO_FILTER_HANDOFF,
  isHandoffTodo,
  filterTodosByView,
  countHandoffTodos,
  formatTodoCreatorLabel,
} from '../todos-handoff.mjs';
import { aid, getClinicalUsername, getListFilter, setListFilter } from './todos-runtime.mjs';
import { openTodoAddModal } from './todos-add-modal.mjs';
import { nextTodoPriority, normalizeTodoPriority, todoPriorityLabel } from '../todos-priority.mjs';
import {
  toggleTodo,
  deleteTodo,
  setTodoPriority,
  setTodoInProgress,
  acknowledgeHandoffTodo,
  updateTodoText,
} from './todos-mutations.mjs';
import { settlePasteSurface } from '../ui-motion.mjs';

/** wb-table grid — columns Prior. / Pendiente / Quién / Vence / (acción), mockup L416. */
var OPEN_ROW_GRID = '62px 1fr 118px 104px 74px';
/** Cerrados rows drop Prior. and the acción column. */
var CLOSED_ROW_GRID = '1fr 118px 104px';
var OPEN_COLUMNS = ['Prior.', 'Pendiente', 'Quién', 'Vence', ''];

var GROUP_META = {
  vencido: { title: 'Vencidos', headerClass: 'wb-table-card-header--alert', titleClass: 'wb-table-card-title--alert' },
  hoy: { title: 'Hoy' },
  sin_fecha: { title: 'Sin fecha' },
  listo: { title: 'Cerrados · últimas 24 h', titleClass: 'wb-table-card-title--muted' },
};

/** Detects an in-progress row-text edit so a refresh doesn't steal focus mid-keystroke. */
function getTodoFormDraftState(container) {
  if (!container) return null;
  var active = document.activeElement;
  if (!active || !container.contains(active)) return null;

  if (active.classList && active.classList.contains('todo-text-input')) {
    var row = active.closest('.wb-row');
    var todoId = row && row.dataset ? row.dataset.todoId : '';
    if (todoId) return { kind: 'edit', todoId: todoId };
  }

  return null;
}

function clearTodoListSection(container) {
  Array.from(container.children).forEach(function (child) {
    container.removeChild(child);
  });
}

function findPreservedTodoRow(container, todoId) {
  if (!todoId) return null;
  var rows = container.querySelectorAll('.wb-row[data-todo-id]');
  for (var i = 0; i < rows.length; i += 1) {
    if (rows[i].dataset.todoId === todoId) return rows[i];
  }
  return null;
}

export function todoRowDetailBits(t, opts) {
  opts = opts || {};
  var bits = [];
  if (t && t.due) bits.push('Vence: ' + String(t.due));
  if (t && isTodoOverdue(t)) bits.push('Atrasado');
  if (opts.handoff) bits.push('De entrega');
  return bits;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Vence cell for an open row: bare time for today, bare date otherwise. */
function formatOpenVenceLabel(t, now) {
  if (!t || !t.dueDate) return '—';
  var full = formatTodoDueLabel(t.dueDate, now);
  if (!full) return '—';
  var todayOnly = full.replace(/^Hoy\s+/, '');
  if (todayOnly !== full) return todayOnly;
  return full.replace(/\s\d{2}:\d{2}$/, '');
}

/** Vence cell for a closed row: when it was resolved, not when it was due. */
function formatClosedVenceLabel(t, now) {
  var iso = t && (t.completedAt || t.updatedAt);
  if (!iso) return '—';
  var date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  var ref = now == null ? new Date() : new Date(now);
  var time = pad2(date.getHours()) + ':' + pad2(date.getMinutes());
  var sameDay =
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth() &&
    date.getDate() === ref.getDate();
  if (sameDay) return time;
  var yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);
  var isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return 'ayer ' + time;
  return formatTodoDueLabel(iso, now) || time;
}

function buildTodoPriorCell(t, row) {
  var prio = normalizeTodoPriority(t.priority);
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'wb-todo-prior wb-todo-prior--' + prio;
  btn.textContent = todoPriorityLabel(prio).toUpperCase();
  btn.title = 'Clic: cambiar prioridad';
  btn.addEventListener('click', function () {
    var next = nextTodoPriority(prio);
    setTodoPriority(t.id, next, { deferResortMs: 180 });
    row.classList.remove('wb-todo-row--prio-alta', 'wb-todo-row--prio-media', 'wb-todo-row--prio-baja');
    row.classList.add('wb-todo-row--prio-' + next);
    btn.className = 'wb-todo-prior wb-todo-prior--' + next;
    btn.textContent = todoPriorityLabel(next).toUpperCase();
    prio = next;
  });
  return btn;
}

function buildTodoPendienteCell(t, txtInput) {
  var cell = document.createElement('span');
  cell.className = 'wb-todo-pendiente';
  cell.appendChild(txtInput);
  var triggerValue = t && t.triggerValue ? String(t.triggerValue).trim() : '';
  if (triggerValue) {
    var trigger = document.createElement('span');
    trigger.className = 'wb-todo-trigger';
    trigger.textContent = triggerValue;
    cell.appendChild(document.createTextNode(' '));
    cell.appendChild(trigger);
  }
  return cell;
}

function buildTodoQuienCell(t) {
  var cell = document.createElement('span');
  cell.className = 'wb-todo-quien';
  var creatorLabel = formatTodoCreatorLabel(t.createdBy);
  cell.textContent = isHandoffTodo(t, getClinicalUsername()) ? 'De ' + creatorLabel : creatorLabel;
  return cell;
}

function buildTodoVenceCell(t, status, now) {
  var cell = document.createElement('span');
  cell.className = 'wb-todo-vence wb-todo-vence--' + status;
  cell.textContent = formatOpenVenceLabel(t, now);
  if (t.reminderAt) {
    var bell = document.createElement('span');
    bell.className = 'todo-remind-bell';
    bell.setAttribute('aria-hidden', 'true');
    bell.textContent = String.fromCodePoint(0x1f514);
    cell.appendChild(document.createTextNode(' '));
    cell.appendChild(bell);
  }
  return cell;
}

/** Toggle for the D3b "En curso" flag — reflected as EN CURSO in Guardia (6a/6b). */
function buildTodoInCursoBtn(t) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'wb-todo-encurso-btn' + (t.inProgress ? ' is-active' : '');
  btn.textContent = 'En curso';
  btn.title = t.inProgress ? 'Quitar "en curso"' : 'Marcar como en curso';
  btn.setAttribute('aria-pressed', String(!!t.inProgress));
  btn.addEventListener('click', function () {
    var next = !t.inProgress;
    setTodoInProgress(t.id, next);
    t.inProgress = next;
    btn.classList.toggle('is-active', next);
    btn.title = next ? 'Quitar "en curso"' : 'Marcar como en curso';
    btn.setAttribute('aria-pressed', String(next));
  });
  return btn;
}

function buildTodoAccionCell(t) {
  var cell = document.createElement('span');
  cell.className = 'wb-todo-accion';
  cell.appendChild(buildTodoInCursoBtn(t));
  var listo = document.createElement('button');
  listo.type = 'button';
  listo.className = 'wb-todo-listo-btn';
  listo.textContent = 'Listo';
  listo.title = 'Marcar como resuelto';
  listo.addEventListener('click', function () { toggleTodo(t.id); });
  cell.appendChild(listo);
  if (isHandoffTodo(t, getClinicalUsername())) {
    var ack = document.createElement('button');
    ack.type = 'button';
    ack.className = 'wb-todo-ack-btn';
    ack.textContent = 'Recibido';
    ack.title = 'Marcar como recibido del turno anterior';
    ack.addEventListener('click', function () { acknowledgeHandoffTodo(t.id); });
    cell.appendChild(ack);
  }
  var del = document.createElement('button');
  del.type = 'button';
  del.className = 'wb-todo-del-btn';
  del.textContent = '×';
  del.title = 'Eliminar';
  del.addEventListener('click', function () { deleteTodo(t.id); });
  cell.appendChild(del);
  return cell;
}

function buildTodoTextInput(t) {
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
  return txtInput;
}

/** Open (vencido/hoy/sin_fecha) row: PRIOR / PENDIENTE / QUIÉN / VENCE / acción. */
function buildOpenTodoRow(t, status, now) {
  var row = document.createElement('div');
  row.className = 'wb-row wb-todo-row wb-todo-row--prio-' + normalizeTodoPriority(t.priority);
  if (status === 'vencido') row.classList.add('wb-row--alert');
  if (isHandoffTodo(t, getClinicalUsername())) row.classList.add('wb-todo-row--handoff');
  row.style.gridTemplateColumns = OPEN_ROW_GRID;
  row.dataset.todoId = t.id;

  var txtInput = buildTodoTextInput(t);
  row.appendChild(buildTodoPriorCell(t, row));
  row.appendChild(buildTodoPendienteCell(t, txtInput));
  row.appendChild(buildTodoQuienCell(t));
  row.appendChild(buildTodoVenceCell(t, status, now));
  row.appendChild(buildTodoAccionCell(t));
  return row;
}

/** Closed (listo) row: strikethrough text, no prior/acción columns. */
function buildClosedTodoRow(t, now) {
  var row = document.createElement('div');
  row.className = 'wb-row wb-todo-row wb-todo-row--closed';
  row.style.gridTemplateColumns = CLOSED_ROW_GRID;
  row.dataset.todoId = t.id;

  var text = document.createElement('span');
  text.className = 'wb-todo-pendiente wb-todo-pendiente--closed';
  text.textContent = t.text;
  row.appendChild(text);
  row.appendChild(buildTodoQuienCell(t));
  var vence = document.createElement('span');
  vence.className = 'wb-todo-vence wb-todo-vence--listo';
  vence.textContent = formatClosedVenceLabel(t, now);
  row.appendChild(vence);
  return row;
}

function buildTodoRow(t, status, now) {
  return status === 'listo' ? buildClosedTodoRow(t, now) : buildOpenTodoRow(t, status, now);
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

  var listFilter = getListFilter();
  var allTodos = storage.getTodos(aid());
  var handoffCount = countHandoffTodos(allTodos, getClinicalUsername());
  var filters = [
    { id: TODO_FILTER_ALL, label: 'Todos', count: allTodos.length },
    {
      id: TODO_FILTER_HANDOFF,
      label: 'Entrega',
      count: handoffCount,
    },
  ];

  filters.forEach(function (f) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'todo-filter-chip' + (listFilter === f.id ? ' is-active' : '');
    btn.dataset.filter = f.id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', listFilter === f.id ? 'true' : 'false');
    btn.appendChild(document.createTextNode(f.label));
    if (f.count != null) {
      var countEl = document.createElement('span');
      countEl.className = 'todo-filter-count';
      countEl.textContent = String(f.count);
      btn.appendChild(countEl);
    }
    btn.addEventListener('click', function () {
      setListFilter(f.id);
      renderTodoListSection(container, null);
    });
    bar.appendChild(btn);
  });

  var addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'todo-toolbar-add-btn';
  addBtn.textContent = '+ Pendiente';
  addBtn.setAttribute('aria-haspopup', 'dialog');
  addBtn.addEventListener('click', function () {
    openTodoAddModal({
      onAdded: function () {
        renderTodoListSection(container, null);
      },
    });
  });

  toolbar.appendChild(bar);
  toolbar.appendChild(addBtn);
  container.appendChild(toolbar);
}

/**
 * Open-pendientes count (not `completed`) shown on the always-visible
 * "Pendientes" pill (`#exp-group-row`, ≥1100px) and its <1100px classic-bar
 * counterpart (`#itab-todo`'s `#exp-pendientes-badge-classic`), mockup
 * L416's red count next to the Pendientes tab label.
 */
export function updateExpPendientesTabBadge() {
  if (typeof document === 'undefined') return;
  var badges = [
    document.getElementById('exp-pendientes-badge'),
    document.getElementById('exp-pendientes-badge-classic'),
  ].filter(Boolean);
  if (!badges.length) return;
  var patientId = aid();
  var count = patientId
    ? storage.getTodos(patientId).filter(function (t) {
        return !t.completed;
      }).length
    : 0;
  badges.forEach(function (badge) {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  });
}

export function renderTodoListSection(container, preserveTodoId) {
  var preservedRow = preserveTodoId ? findPreservedTodoRow(container, preserveTodoId) : null;
  clearTodoListSection(container);
  appendTodoFilterBar(container);

  var listFilter = getListFilter();
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
        '<span class="empty-state-title">Sin pendientes del turno anterior</span>' +
        '<span class="empty-state-lead">Los que quedaron abiertos al cerrar el turno previo aparecen aquí.</span>';
    } else {
      none.innerHTML =
        '<span class="empty-state-title">Sin pendientes</span>' +
        '<span class="empty-state-lead">Escribe uno arriba para agregarlo.</span>';
    }
    container.appendChild(none);
    settlePasteSurface(none);
    updateExpPendientesTabBadge();
    return;
  }

  var list = document.createElement('div');
  list.className = 'todo-list';
  appendGroupedTodoSections(list, todos, preservedRow, preserveTodoId);
  container.appendChild(list);
  settlePasteSurface(list);
  updateExpPendientesTabBadge();
}

/** Vencidos first, then hoy, then sin fecha, then resueltos (cerrados) collapsed at the bottom. */
var TODO_OPEN_GROUP_ORDER = ['vencido', 'hoy', 'sin_fecha'];

/**
 * Pure planning step (no DOM): sorted, non-empty groups in display order,
 * with `collapsed: true` only on the trailing resueltos ("listo") group.
 * @returns {Array<{ status: string, todos: Array, collapsed: boolean }>}
 */
export function buildTodoGroupPlan(todos, now) {
  var groups = groupTodosByStatus(todos, now);
  var plan = [];
  TODO_OPEN_GROUP_ORDER.forEach(function (status) {
    if (groups[status].length) {
      plan.push({
        status: status,
        todos: groups[status].slice().sort(todoCompareForDueSort),
        collapsed: false,
      });
    }
  });
  if (groups.listo.length) {
    plan.push({
      status: 'listo',
      todos: groups.listo.slice().sort(todoCompareForDueSort),
      collapsed: true,
    });
  }
  return plan;
}

function rowForTodo(t, status, now, preservedRow, preserveTodoId) {
  return preservedRow && t.id === preserveTodoId ? preservedRow : buildTodoRow(t, status, now);
}

/**
 * Group card header: "Vencidos · N" / "Hoy · N" / "Sin fecha · N" as the wb
 * table-card title (mockup L416); Cerrados keeps its fixed title and shows
 * the count as a separate trailing span instead.
 */
function buildTodoGroupHeaderHtml(status, count) {
  var meta = GROUP_META[status] || GROUP_META.sin_fecha;
  var titleClass = 'wb-table-card-title' + (meta.titleClass ? ' ' + meta.titleClass : '');
  if (status === 'listo') {
    return (
      '<span class="' + titleClass + '">' + meta.title + '</span>' +
      '<span class="wb-todo-group-count">' + count + '</span>'
    );
  }
  return '<span class="' + titleClass + '">' + meta.title + ' · ' + count + '</span>';
}

function appendTodoGroupRows(parent, status, todos, now, preservedRow, preserveTodoId) {
  var body = document.createElement('div');
  body.className = 'wb-table-body';
  todos.forEach(function (t) {
    body.appendChild(rowForTodo(t, status, now, preservedRow, preserveTodoId));
  });
  parent.appendChild(body);
}

function appendTodoGroupSection(list, group, now, preservedRow, preserveTodoId, showColhead) {
  var meta = GROUP_META[group.status] || GROUP_META.sin_fecha;
  var root = document.createElement(group.collapsed ? 'details' : 'div');
  root.className = 'todo-group wb-table-card todo-group--' + group.status.replace(/_/g, '-');
  if (group.collapsed) root.open = false;

  var header = document.createElement(group.collapsed ? 'summary' : 'div');
  header.className = 'todo-group-header wb-table-card-header' + (meta.headerClass ? ' ' + meta.headerClass : '');
  header.innerHTML = buildTodoGroupHeaderHtml(group.status, group.todos.length);
  root.appendChild(header);

  if (showColhead && group.status !== 'listo') {
    var colhead = document.createElement('div');
    colhead.className = 'wb-table-colhead';
    colhead.style.gridTemplateColumns = OPEN_ROW_GRID;
    OPEN_COLUMNS.forEach(function (c) {
      var span = document.createElement('span');
      span.textContent = c;
      colhead.appendChild(span);
    });
    root.appendChild(colhead);
  }

  appendTodoGroupRows(root, group.status, group.todos, now, preservedRow, preserveTodoId);
  list.appendChild(root);
}

/** Groups pendientes vencido → hoy → sin_fecha → listo (cerrados, collapsed). */
export function appendGroupedTodoSections(list, todos, preservedRow, preserveTodoId, now) {
  var plan = buildTodoGroupPlan(todos, now);
  var colheadShown = false;
  plan.forEach(function (group) {
    var showColhead = !colheadShown && group.status !== 'listo';
    if (showColhead) colheadShown = true;
    appendTodoGroupSection(list, group, now, preservedRow, preserveTodoId, showColhead);
  });
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

  // Preserve focus mid-edit on a refresh (e.g. a live-sync patch landing while
  // the user is typing in a row's text field) instead of rebuilding the DOM.
  var draft = getTodoFormDraftState(container);
  var hasContent = !!container.querySelector('.todo-toolbar');
  if (draft && hasContent) {
    renderTodoListSection(container, draft.todoId);
    return;
  }

  while (container.firstChild) container.removeChild(container.firstChild);
  renderTodoListSection(container, null);
}
