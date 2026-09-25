import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTourDemoTodosForPatient } from './tour-demo-todos.mjs';
import { DEMO_PATIENT_ID } from './tour-demo-patient.mjs';

test('buildTourDemoTodosForPatient devuelve pendientes clínicos', () => {
  const todos = buildTourDemoTodosForPatient(DEMO_PATIENT_ID);
  assert.ok(todos.length >= 4);
  assert.ok(todos.some(function (t) {
    return /BH|QS/i.test(t.text);
  }));
  assert.deepEqual(buildTourDemoTodosForPatient('otro'), []);
});

test('tour-demo-todos — writeTodosMap warns on setItem quota error', async () => {
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  
  globalThis.localStorage = {
    getItem() { return null; },
    setItem() {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    },
  };
  
  try {
    const { seedTourDemoTodos } = await import('./tour-demo-todos.mjs');
    seedTourDemoTodos();

    assert.ok(warnings.length > 0, 'console.warn should have been called');
    const msg = warnings[0][0];
    assert.ok(msg.includes('failed to write') && msg.includes('rpc-todos'),
      'warn should mention the key');
  } finally {
    console.warn = origWarn;
    delete globalThis.localStorage;
  }
});
