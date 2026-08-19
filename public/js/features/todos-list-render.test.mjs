import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { todoRowDetailBits, buildTodoGroupPlan, appendGroupedTodoSections } from './todos-list-render.mjs';

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
