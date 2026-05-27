import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  manejoTodoDismissKey,
  dismissManejoTodo,
  isManejoTodoDismissed,
  shouldAllowManejoTodo,
  filterTodosRespectingDismissals,
  dismissManejoTodoFromTodo,
} from './manejo-todo-dismiss.mjs';

const store = {};

test('dismissManejoTodo bloquea nuevas sugerencias para la misma regla y día', () => {
  globalThis.localStorage = {
    getItem(k) {
      return store[k] || null;
    },
    setItem(k, v) {
      store[k] = v;
    },
    removeItem(k) {
      delete store[k];
    },
  };
  dismissManejoTodo('p1', 'manejo:k-hypo-severe', '17/05/2026');
  assert.equal(isManejoTodoDismissed('p1', 'k-hypo-severe', '17/05/2026'), true);
  assert.equal(
    shouldAllowManejoTodo('p1', 'manejo:k-hypo-severe', '17/05/2026', []),
    false
  );
  assert.equal(
    manejoTodoDismissKey('k-hypo-severe', '17/05/2026'),
    'manejo:k-hypo-severe|17/05/2026'
  );
});

test('filterTodosRespectingDismissals elimina Repo abiertos bloqueados', () => {
  dismissManejoTodo('p2', 'manejo:na-hypo-mild', '18/05/2026');
  var out = filterTodosRespectingDismissals('p2', [
    {
      id: '1',
      completed: false,
      text: 'Repo Na ↓ 130',
      labRuleId: 'manejo:na-hypo-mild',
      labFecha: '18/05/2026',
    },
    { id: '2', completed: false, text: 'Otro pendiente', labFecha: '18/05/2026' },
    {
      id: '3',
      completed: true,
      text: 'Repo K ↓',
      labRuleId: 'manejo:k-hypo',
      labFecha: '18/05/2026',
    },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out.some((t) => t.id === '1'), false);
});

test('dismissManejoTodoFromTodo registra legacy sin labRuleId', () => {
  dismissManejoTodoFromTodo('p3', {
    text: 'Repo Mg ↓ 1.2',
    labFecha: '19/05/2026',
  });
  var out = filterTodosRespectingDismissals('p3', [
    { id: 'x', completed: false, text: 'Repo Mg ↓ 1.2', labFecha: '19/05/2026' },
  ]);
  assert.equal(out.length, 0);
});
