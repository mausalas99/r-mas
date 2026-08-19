import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { storage } from '../storage.js';
import { registerTodosRuntime } from './todos-runtime.mjs';
import { addTodoWithFields } from './todos-mutations.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const mutationsSrc = readFileSync(join(dir, 'todos-mutations.mjs'), 'utf8');
const bridgeSrc = readFileSync(join(dir, 'cloud-sync/mutate-bridge.mjs'), 'utf8');

const store = {};

beforeEach(() => {
  globalThis.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
  registerTodosRuntime({ getActiveId: () => 'p1' });
  // addTodoWithFields ends in refreshAllTodoUIs(), which does a bare
  // document.getElementById('todo-form') with no environment guard. This
  // repo's test:one runner (Electron-as-Node) has no DOM at all, so give it
  // just enough of a stub to no-op instead of throwing.
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = { getElementById: () => null };
  }
});

afterEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  delete globalThis.localStorage;
  delete globalThis.document;
  registerTodosRuntime({ getActiveId: () => null });
});

describe('deleteTodo cloud clock', () => {
  it('passes a fresh delAt into enqueueCloudTodoDelete (not only when victim missing)', () => {
    const fn = mutationsSrc.slice(
      mutationsSrc.indexOf('export function deleteTodo'),
      mutationsSrc.indexOf('export function setTodoPriority')
    );
    assert.match(fn, /enqueueCloudTodoDelete\(aid\(\), victim \|\| \{ id: id \}, delAt\)/);
    assert.doesNotMatch(fn, /if \(victim\) enqueueCloudTodoDelete/);
  });

  it('enqueueCloudTodoDelete uses a fresh delete clock for Nube tombstones', () => {
    const fn = bridgeSrc.slice(
      bridgeSrc.indexOf('export function enqueueCloudTodoDelete'),
      bridgeSrc.indexOf('export function enqueueCloudAgendaUpsert')
    );
    assert.match(fn, /updatedAt: String\(updatedAt \|\| new Date\(\)\.toISOString\(\)\)/);
    assert.match(fn, /_deleted: true/);
  });
});

describe('addTodoWithFields', () => {
  it('creates a pendiente with text, priority, and due fields', () => {
    const ok = addTodoWithFields({
      text: 'Reponer potasio',
      priority: 'alta',
      dueFields: { dueDate: '2026-08-18T14:00:00.000Z' },
    });
    assert.equal(ok, true);
    const todos = storage.getTodos('p1');
    assert.equal(todos.length, 1);
    assert.equal(todos[0].text, 'Reponer potasio');
    assert.equal(todos[0].priority, 'alta');
    assert.equal(todos[0].dueDate, '2026-08-18T14:00:00.000Z');
  });

  it('returns false and creates nothing when text is blank', () => {
    const ok = addTodoWithFields({ text: '   ' });
    assert.equal(ok, false);
    assert.equal(storage.getTodos('p1').length, 0);
  });

  it('returns false when there is no active patient', () => {
    registerTodosRuntime({ getActiveId: () => null });
    const ok = addTodoWithFields({ text: 'Algo' });
    assert.equal(ok, false);
  });
});
