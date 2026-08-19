import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  todoRowDetailBits,
  buildTodoGroupPlan,
  appendGroupedTodoSections,
  updateExpPendientesTabBadge,
} from './todos-list-render.mjs';
import { registerTodosRuntime } from './todos-runtime.mjs';
import { addTodoWithFields, toggleTodo } from './todos-mutations.mjs';
import { storage } from '../storage.js';

function todo(overrides) {
  return Object.assign(
    { id: '1', text: 'x', completed: false, priority: 'media', dueDate: null },
    overrides
  );
}

describe('todoRowDetailBits', () => {
  it('omits Estado pendiente and Estado completado', () => {
    var open = todoRowDetailBits({ text: 'RX TORAX', completed: false });
    var done = todoRowDetailBits({ text: 'RX TORAX', completed: true });
    assert.deepEqual(open, []);
    assert.deepEqual(done, []);
    assert.equal(open.join(' ').includes('pendiente'), false);
    assert.equal(done.join(' ').includes('completado'), false);
  });

  it('keeps due, overdue, and handoff bits', () => {
    var bits = todoRowDetailBits(
      { due: 'hoy 18:00', dueDate: '2000-01-01T00:00:00.000Z', completed: false },
      { handoff: true }
    );
    assert.ok(bits.includes('Vence: hoy 18:00'));
    assert.ok(bits.includes('Atrasado'));
    assert.ok(bits.includes('De entrega'));
    assert.equal(bits.some(function (b) { return /Estado:/.test(b); }), false);
  });
});

describe('buildTodoGroupPlan', () => {
  const NOW = new Date('2026-06-11T12:00:00.000Z');

  it('orders groups vencido -> hoy -> sin_fecha -> listo (collapsed)', () => {
    const todos = [
      todo({ id: 'listo', text: 'Resuelto', completed: true }),
      todo({ id: 'sin-fecha', text: 'Sin fecha' }),
      todo({ id: 'hoy', text: 'Vence hoy', dueDate: '2026-06-11T18:00:00.000Z' }),
      todo({ id: 'vencido', text: 'Atrasado', dueDate: '2026-06-10T12:00:00.000Z' }),
    ];
    const plan = buildTodoGroupPlan(todos, NOW);
    assert.deepEqual(plan.map((g) => g.status), ['vencido', 'hoy', 'sin_fecha', 'listo']);
    assert.deepEqual(plan.map((g) => g.collapsed), [false, false, false, true]);
    assert.equal(plan.find((g) => g.status === 'vencido').todos[0].id, 'vencido');
    assert.equal(plan.find((g) => g.status === 'listo').todos[0].id, 'listo');
  });

  it('omits empty groups entirely', () => {
    const todos = [todo({ id: 'a', text: 'Solo sin fecha' })];
    const plan = buildTodoGroupPlan(todos, NOW);
    assert.deepEqual(plan.map((g) => g.status), ['sin_fecha']);
  });

  it('renders the "Vencidos" wb-table-card group header, PRIOR/PENDIENTE/QUIÉN/VENCE table for the vencido row', () => {
    if (typeof document === 'undefined') return;
    const todos = [todo({ id: 'v', text: 'Atrasado', dueDate: '2026-06-10T12:00:00.000Z' })];
    const list = document.createElement('div');
    appendGroupedTodoSections(list, todos, null, null, NOW);
    const card = list.querySelector('.todo-group');
    assert.match(card.querySelector('.todo-group-header').innerHTML, /Vencidos · 1/);
    assert.ok(card.querySelector('.wb-table-colhead'), 'first open group renders the column head');
    const row = card.querySelector('.wb-row[data-todo-id="v"]');
    assert.ok(row, 'row is rendered with the wb-row grammar');
    assert.match(row.className, /wb-row--alert/);
    assert.match(row.querySelector('.wb-todo-prior').textContent, /MEDIA/);
    assert.notEqual(row.querySelector('.wb-todo-vence').textContent.trim(), '—');
  });

  it('renders closed rows strikethrough with no Prior./acción columns', () => {
    if (typeof document === 'undefined') return;
    const todos = [todo({ id: 'c', text: 'Resuelto', completed: true, updatedAt: '2026-06-11T05:10:00.000Z' })];
    const list = document.createElement('div');
    appendGroupedTodoSections(list, todos, null, null, NOW);
    const row = list.querySelector('.wb-row[data-todo-id="c"]');
    assert.ok(row);
    assert.doesNotMatch(row.className, /wb-todo-row--prio/);
    assert.equal(row.querySelector('.wb-todo-prior'), null);
    assert.equal(row.querySelector('.wb-todo-accion'), null);
    assert.match(row.querySelector('.wb-todo-pendiente--closed').textContent, /Resuelto/);
  });
});

/** Real, always-visible Pendientes entry point (Phase 6 fix): the tab-bar
 * badge tracks the open (non-completed) count, mockup L416's red "4". */
describe('updateExpPendientesTabBadge', () => {
  const store = {};

  beforeEach(() => {
    globalThis.localStorage = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    };
    registerTodosRuntime({ getActiveId: () => 'p1' });
  });

  afterEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    delete globalThis.localStorage;
    delete globalThis.document;
    registerTodosRuntime({ getActiveId: () => null });
  });

  it('shows the open-todo count and hides the badge at zero', () => {
    const badge = { textContent: '', hidden: false };
    globalThis.document = { getElementById: (id) => (id === 'exp-pendientes-badge' ? badge : null) };

    addTodoWithFields({ text: 'Reponer potasio', priority: 'alta' });
    addTodoWithFields({ text: 'Solicitar TAC', priority: 'media' });
    updateExpPendientesTabBadge();
    assert.equal(badge.textContent, '2');
    assert.equal(badge.hidden, false);

    const first = storage.getTodos('p1')[0];
    toggleTodo(first.id);
    updateExpPendientesTabBadge();
    assert.equal(badge.textContent, '1');

    toggleTodo(first.id); // un-resolve — back to 2
    updateExpPendientesTabBadge();
    assert.equal(badge.textContent, '2');

    const second = storage.getTodos('p1')[1];
    toggleTodo(first.id);
    toggleTodo(second.id);
    updateExpPendientesTabBadge();
    assert.equal(badge.textContent, '0');
    assert.equal(badge.hidden, true);
  });

  it('does nothing when the badge element is not mounted', () => {
    globalThis.document = { getElementById: () => null };
    assert.doesNotThrow(() => updateExpPendientesTabBadge());
  });
});
