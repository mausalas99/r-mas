/**
 * Pendientes — list render. todos-list-model.mjs decides what to draw, todos-list-view.jsx draws it
 * (Preact, rows keyed by todo id). This file keeps the state, reads storage and runs the callbacks
 * (save, confirm dialogs, add modal). A row that leaves the list stays drawn as a fading copy for
 * LEAVING_MS, then the store drops it.
 */
import { h, render } from 'preact';
import { storage } from '../storage.js';
import { aid, getClinicalUsername, getListFilter, setListFilter } from './todos-runtime.mjs';
import { openTodoAddModal } from './todos-add-modal.mjs';
import { openConfirm } from './workbench/confirm.mjs';
import { nextTodoPriority } from '../todos-priority.mjs';
import {
  toggleTodo,
  deleteTodo,
  setTodoPriority,
  setTodoInProgress,
  acknowledgeHandoffTodo,
  updateTodoText,
} from './todos-mutations.mjs';
import { settlePasteSurface } from '../ui-motion.mjs';
import { createStore } from '../ui-kit/store.mjs';
import { TodoListView } from './todos-list-view.jsx';
import { LEAVING_MS, emptyTodoListState, nextTodoListState, endLeaving, patchRow, findRow } from './todos-list-model.mjs';

/** What is on screen (one #todo-form at a time); every change redraws through the subscription. */
const store = createStore(emptyTodoListState());
let host = null;
let stopDraw = null;

const handlers = {
  onChip(id) {
    setListFilter(id);
    renderTodoListSection();
  },
  onAdd() {
    /* No onAdded here: addTodoWithFields already repaints #todo-form via
     * refreshAllTodoUIs(). A second render here rebuilt the row an instant
     * later, wiping the freshly-entered row before row-enter could animate. */
    openTodoAddModal();
  },
  onPrio(id) {
    const row = findRow(store.get(), id);
    if (!row) return;
    const next = nextTodoPriority(row.priority);
    // Show the new priority now; the re-sort waits 180 ms so the row does not jump under the cursor.
    setTodoPriority(id, next, { deferResortMs: 180 });
    store.set((s) => patchRow(s, id, { priority: next }));
  },
  onInCurso(id) {
    const row = findRow(store.get(), id);
    if (row) setTodoInProgress(id, !row.inProgress);
  },
  onListo(id) {
    toggleTodo(id);
    // Mockup #11a's reversible-weight example is this exact transition
    // ("Pendiente marcado como listo" + Deshacer) — no blocking modal,
    // just a dismissible undo toast. Only on open -> listo, not the reverse.
    void openConfirm({
      weight: 'reversible',
      message: 'Pendiente marcado como listo',
      undoLabel: 'Deshacer',
      onUndo: function () { toggleTodo(id); },
    });
  },
  onAck(id) {
    acknowledgeHandoffTodo(id);
  },
  onDel(id) {
    const row = findRow(store.get(), id);
    void openConfirm({
      weight: 'destructive',
      title: '¿Eliminar este pendiente?',
      message: row && row.text ? '"' + row.text + '" se borra de tu lista. No se puede deshacer.' : 'No se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      onConfirm: function () { deleteTodo(id); },
    });
  },
  /** Text field left: save a changed text, put the old one back when it was emptied. */
  onText(id, input) {
    const row = findRow(store.get(), id);
    if (!row) return;
    const v = String(input.value || '').trim();
    if (!v) {
      input.value = row.text;
      return;
    }
    if (v !== String(row.text || '')) updateTodoText(id, v);
  },
  onLeaveEnd(id) {
    store.set((s) => endLeaving(s, id));
  },
};

/** Start drawing into `container` (replaces anything in it); a new or emptied container starts clean. */
function mount(container) {
  if (host === container && container.firstChild) return;
  if (stopDraw) stopDraw();
  if (host) render(null, host);
  host = container;
  container.textContent = '';
  store.set(emptyTodoListState());
  stopDraw = store.subscribe((state) => render(h(TodoListView, { state, h: handlers }), host));
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
    badge.textContent = '';
    badge.hidden = count === 0;
    // role="img": aria-label is not allowed on a role-less span.
    if (count === 0) {
      badge.removeAttribute('role');
      badge.removeAttribute('aria-label');
    } else {
      badge.setAttribute('role', 'img');
      badge.setAttribute('aria-label', 'Pendientes abiertos');
    }
  });
}

function renderTodoListSection() {
  const prev = store.get();
  const patientId = aid();
  const next = nextTodoListState(prev, {
    patientId,
    todos: patientId ? storage.getTodos(patientId) : [],
    filter: getListFilter(),
    username: getClinicalUsername(),
    now: new Date(),
  });
  store.set(next);
  if (next.kind === 'nopatient') return;
  /* Only the freshly-appeared panel gets the whole-block settle. An in-place
   * add/complete/delete on an already-shown list must not re-fade rows that
   * did not change — the row-enter / leaving copies animate those. */
  if (next.swap) settlePasteSurface(host.querySelector('.todo-list, .todo-empty'));
  const known = new Set(prev.leaving.map((e) => e.row.id));
  next.leaving.forEach((e) => {
    if (!known.has(e.row.id)) setTimeout(() => handlers.onLeaveEnd(e.row.id), LEAVING_MS);
  });
  updateExpPendientesTabBadge();
}

export function renderTodoFormIn(container, _idPrefix) {
  if (!container) return;
  mount(container);
  if (aid()) container.classList.add('todo-shell');
  renderTodoListSection();
}
