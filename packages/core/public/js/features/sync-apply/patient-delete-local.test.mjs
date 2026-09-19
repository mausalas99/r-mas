import test from 'node:test';
import assert from 'node:assert/strict';

let store = {};
const ls = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { store = {}; },
};
global.localStorage = ls;
global.window = { localStorage: ls };

const { storage } = await import('../../storage.js');
const { clearPatientTodosLocal, pruneOrphanTodos } = await import('./patient-delete-local.mjs');

const PID = 'pat-1';

test('clearPatientTodosLocal empties the patient todos through storage.getTodos/saveTodos', () => {
  ls.clear();
  storage.saveTodos(PID, [
    { id: 't1', text: 'Revisar labs', completed: false, priority: 'media' },
  ]);
  assert.equal(storage.getTodos(PID).length, 1);

  clearPatientTodosLocal(PID);

  assert.equal(storage.getTodos(PID).length, 0);
});

test('clearPatientTodosLocal is a no-op for a patient with no todos', () => {
  ls.clear();
  assert.doesNotThrow(() => clearPatientTodosLocal(PID));
  assert.equal(storage.getTodos(PID).length, 0);
});

test('pruneOrphanTodos drops pendientes for patients no longer in the census', () => {
  ls.clear();
  storage.saveTodos('live-1', [
    { id: 't-live', text: 'Labs', completed: false, priority: 'media' },
  ]);
  storage.saveTodos('gone-1', [
    { id: 't-gone', text: 'PRUEBA DE SUPRESIÓN CON DEXAMETASONA', completed: false, priority: 'alta' },
  ]);
  assert.equal(storage.getTodos('gone-1').length, 1);

  const n = pruneOrphanTodos(['live-1']);
  assert.equal(n, 1);
  assert.equal(storage.getTodos('gone-1').length, 0);
  assert.equal(storage.getTodos('live-1').length, 1);
  assert.deepEqual(storage.listTodoPatientIds(), ['live-1']);
});
