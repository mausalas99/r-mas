/**
 * Pendientes list — what to draw, as plain data (no DOM, no storage). todos-list-view.jsx draws it;
 * todos-list-render.mjs feeds it and holds the state. Rows keep their todo id, so a repaint reuses
 * the row on screen; a row that leaves the open groups stays drawn as a "leaving" copy until its
 * fade ends (old code cloned the DOM node for this).
 */
import {
  formatTodoDueLabel,
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
import { normalizeTodoPriority } from '../todos-priority.mjs';

/** Same time a fade-out copy lives in the old clone code (ui-motion.mjs). */
export const LEAVING_MS = 500;

export const GROUP_META = {
  vencido: { title: 'Vencidos', headerClass: 'wb-table-card-header--alert', titleClass: 'wb-table-card-title--alert' },
  hoy: { title: 'Hoy' },
  proximo: { title: 'Próximos' },
  sin_fecha: { title: 'Sin fecha' },
  listo: { title: 'Cerrados · últimas 24 h', titleClass: 'wb-table-card-title--muted' },
};

/** Vencidos first, then hoy, próximos, sin fecha, then resueltos (cerrados) collapsed at the bottom. */
const OPEN_GROUP_ORDER = ['vencido', 'hoy', 'proximo', 'sin_fecha'];

const pad2 = (n) => String(n).padStart(2, '0');

/** Vence cell for an open row: bare time for today, bare date otherwise. */
function formatOpenVenceLabel(t, now) {
  if (!t || !t.dueDate) return '—';
  const full = formatTodoDueLabel(t.dueDate, now);
  if (!full) return '—';
  const todayOnly = full.replace(/^Hoy\s+/, '');
  if (todayOnly !== full) return todayOnly;
  return full.replace(/\s\d{2}:\d{2}$/, '');
}

/** Vence cell for a closed row: when it was resolved, not when it was due. */
function formatClosedVenceLabel(t, now) {
  const iso = t && (t.completedAt || t.updatedAt);
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const ref = now == null ? new Date() : new Date(now);
  const time = pad2(date.getHours()) + ':' + pad2(date.getMinutes());
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, ref)) return time;
  const yesterday = new Date(ref);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(date, yesterday)) return 'ayer ' + time;
  return formatTodoDueLabel(iso, now) || time;
}

function rowFor(t, status, username, now) {
  const handoff = isHandoffTodo(t, username);
  const creator = formatTodoCreatorLabel(t.createdBy);
  return {
    id: t.id,
    text: t.text,
    status,
    closed: status === 'listo',
    priority: normalizeTodoPriority(t.priority),
    handoff,
    trigger: t && t.triggerValue ? String(t.triggerValue).trim() : '',
    who: handoff ? 'De ' + creator : creator,
    vence: status === 'listo' ? formatClosedVenceLabel(t, now) : formatOpenVenceLabel(t, now),
    bell: !!t.reminderAt,
    inProgress: !!t.inProgress,
    enter: false,
  };
}

/**
 * @param {{ todos: object[], filter: string, username: string|null, now?: Date|string }} input
 *   `todos` = every todo of the patient (the filter chips count them all).
 */
export function buildTodoListModel({ todos, filter, username, now }) {
  const shown = filterTodosByView(todos, filter, username).sort((a, b) => todoCompareForDueSort(a, b, now));
  const groups = groupTodosByStatus(shown, now);
  const plan = [];
  OPEN_GROUP_ORDER.forEach((status) => {
    if (groups[status].length) plan.push({ status, collapsed: false, todos: groups[status] });
  });
  if (groups.listo.length) plan.push({ status: 'listo', collapsed: true, todos: groups.listo });
  let colheadShown = false;
  return {
    chips: [
      { id: TODO_FILTER_ALL, label: 'Todos', count: todos.length, active: filter === TODO_FILTER_ALL },
      { id: TODO_FILTER_HANDOFF, label: 'Entrega', count: countHandoffTodos(todos, username), active: filter === TODO_FILTER_HANDOFF },
    ],
    empty: shown.length ? null : (filter === TODO_FILTER_HANDOFF ? 'handoff' : 'all'),
    stillPresent: shown.map((t) => t.id),
    groups: plan.map((g) => {
      const colhead = !colheadShown && g.status !== 'listo';
      if (colhead) colheadShown = true;
      return { status: g.status, collapsed: g.collapsed, colhead, rows: g.todos.map((t) => rowFor(t, g.status, username, now)) };
    }),
  };
}

/** Rows of the open groups in screen order (closed rows never fade or enter). */
export const openRowsOf = (model) => (model && model.groups ? model.groups.filter((g) => !g.collapsed).flatMap((g) => g.rows) : []);

export const emptyTodoListState = () => ({ patientId: undefined, kind: 'nopatient', model: null, leaving: [], swap: false });

/**
 * One repaint. `kind`: 'nopatient' | 'empty' | 'list'. `swap` = first paint or patient switch: the
 * whole panel settles as one block instead of rows fading one by one.
 * Leaving rows are kept (until `endLeaving`) even across later repaints, unless the row came back.
 */
export function nextTodoListState(prev, input) {
  const patientId = String(input.patientId || '');
  if (!patientId) return { patientId: prev.patientId, kind: 'nopatient', model: null, leaving: [], swap: false };
  const hadPrior = prev.patientId !== undefined;
  const changed = hadPrior && prev.patientId !== patientId;
  const model = buildTodoListModel(input);
  const prevOpen = changed ? [] : openRowsOf(prev.model);
  const open = openRowsOf(model);
  const openIds = new Set(open.map((r) => r.id));
  const prevIds = new Set(prevOpen.map((r) => r.id));
  let leaving = [];
  if (!changed) {
    open.forEach((r) => { if (!prevIds.has(r.id)) r.enter = true; });
    const present = new Set(model.stillPresent);
    leaving = prev.leaving.filter((e) => !openIds.has(e.row.id));
    prevOpen.forEach((row, i) => {
      if (openIds.has(row.id)) return;
      // The copy sits next to the nearest row that stays: the next one, else the previous one.
      let anchor = prevOpen.slice(i + 1).find((r) => openIds.has(r.id));
      let before = true;
      if (!anchor) {
        before = false;
        anchor = prevOpen.slice(0, i).reverse().find((r) => openIds.has(r.id));
      }
      // Still in the data (now under Cerrados) = completed: success flash. Gone = deleted: plain exit.
      leaving.push({ row, kind: present.has(row.id) ? 'row-exit-done' : 'row-exit', anchorId: anchor ? anchor.id : null, before });
    });
  }
  return { patientId, kind: model.empty ? 'empty' : 'list', model, leaving, swap: !hadPrior || changed };
}

/** Fade ended (or timer): stop drawing that row. No-op when it is already gone. */
export function endLeaving(state, id) {
  if (!state.leaving.some((e) => e.row.id === id)) return state;
  return { ...state, leaving: state.leaving.filter((e) => e.row.id !== id) };
}

/** Change one row on screen now (priority click) without a rebuild from storage. */
export function patchRow(state, id, patch) {
  if (!state.model) return state;
  const groups = state.model.groups.map((g) => (g.rows.some((r) => r.id === id)
    ? { ...g, rows: g.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }
    : g));
  return { ...state, model: { ...state.model, groups } };
}

export function findRow(state, id) {
  for (const g of state.model ? state.model.groups : []) {
    const r = g.rows.find((x) => x.id === id);
    if (r) return r;
  }
  return null;
}

/**
 * Put the leaving copies in the lists they belong to: `groups[i].items` and `tail` (after the last
 * group, or after the empty message). A copy is `{ ...row, leave: 'row-exit' | 'row-exit-done' }`.
 */
export function placeLeaving(state) {
  const groups = state.model ? state.model.groups.map((g) => ({ ...g, items: g.rows.slice() })) : [];
  const tail = [];
  state.leaving.forEach((e) => {
    const copy = { ...e.row, leave: e.kind };
    for (const g of groups) {
      const at = g.items.findIndex((r) => !r.leave && r.id === e.anchorId);
      if (e.anchorId && at >= 0) {
        g.items.splice(e.before ? at : at + 1, 0, copy);
        return;
      }
    }
    tail.push(copy);
  });
  return { groups, tail };
}
