import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from './storage.js';
import { setBlobCache } from './storage/storage-core.mjs';
import {
  buildPitchDemoTodosForPatient,
  seedPitchDemoTodos,
  clearPitchDemoTodos,
} from './tour-pitch-demo-todos.mjs';
import { PITCH_DEMO_PATIENT_ID } from './tour-pitch-demo-seed.mjs';

test('buildPitchDemoTodosForPatient: DEMO PÉREZ con pendientes abiertos', () => {
  const todos = buildPitchDemoTodosForPatient(PITCH_DEMO_PATIENT_ID);
  assert.ok(todos.length >= 5);
  assert.ok(todos.some((t) => !t.completed && t.priority === 'alta'));
  assert.ok(todos.some((t) => t.completed));
});

test('seedPitchDemoTodos persiste en rpc-todos (localStorage)', () => {
  const store = {};
  globalThis.localStorage = {
    getItem(k) {
      return store[k] ?? null;
    },
    setItem(k, v) {
      store[k] = String(v);
    },
  };
  clearPitchDemoTodos();
  seedPitchDemoTodos();
  const todos = storage.getTodos(PITCH_DEMO_PATIENT_ID);
  assert.ok(todos.length >= 5);
  assert.ok(todos.some((t) => /ATB|antibiograma/i.test(t.text)));
  clearPitchDemoTodos();
  delete globalThis.localStorage;
});

test('seedPitchDemoTodos sigue visible cuando ya hay un blob cache activo (modo Electron/DB)', () => {
  const store = {};
  globalThis.localStorage = {
    getItem(k) {
      return store[k] ?? null;
    },
    setItem(k, v) {
      store[k] = String(v);
    },
  };
  // Simula una sesión desktop ya desbloqueada: rpc-todos vacío en el cache, no en localStorage.
  setBlobCache({ todos: '{}' });
  clearPitchDemoTodos();
  seedPitchDemoTodos();
  const todos = storage.getTodos(PITCH_DEMO_PATIENT_ID);
  assert.ok(todos.length >= 5, 'debe leer el seed via el blob cache, no localStorage stale');
  clearPitchDemoTodos();
  setBlobCache(null);
  delete globalThis.localStorage;
});
