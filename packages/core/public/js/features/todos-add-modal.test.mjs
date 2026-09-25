import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../storage.js';
import { buildTodoAddModalHtml, openTodoAddModal, closeTodoAddModal } from './todos-add-modal.mjs';
import { registerTodosRuntime } from './todos-runtime.mjs';

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
  registerTodosRuntime({ getActiveId: () => 'p1', getClinicalUsername: () => '' });
});

afterEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  delete globalThis.localStorage;
  closeTodoAddModal();
});

describe('buildTodoAddModalHtml', () => {
  it('renders the three fields: qué hay que hacer, prioridad, vence', () => {
    const html = buildTodoAddModalHtml({ patientContext: 'Pérez García, Juan M. · 214-B · 2' });
    assert.match(html, /wb-todo-add-text/);
    assert.match(html, /Qué hay que hacer/);
    assert.match(html, /Prioridad/);
    assert.match(html, /Vence/);
    assert.match(html, /wb-todo-add-context">Pérez García, Juan M\. · 214-B · 2/);
    assert.match(html, /Agregar pendiente/);
  });
});

describe('openTodoAddModal', () => {
  it('mounts a modal in the DOM and closes on Esc', () => {
    if (typeof document === 'undefined') return;
    openTodoAddModal({});
    assert.ok(document.querySelector('[data-wb-todo-add-backdrop]'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(document.querySelector('[data-wb-todo-add-backdrop]'), null);
  });

  it('submitting with text creates a pendiente and calls onAdded', () => {
    if (typeof document === 'undefined') return;
    let added = false;
    openTodoAddModal({ onAdded: () => (added = true) });
    const textarea = document.querySelector('.wb-todo-add-text');
    textarea.value = 'Reponer potasio en 6 h';
    document.querySelector('[data-wb-todo-add-ok]').click();
    assert.equal(added, true);
    assert.equal(document.querySelector('[data-wb-todo-add-backdrop]'), null);
    const todos = storage.getTodos('p1');
    assert.equal(todos.length, 1);
    assert.equal(todos[0].text, 'Reponer potasio en 6 h');
  });

  it('does not submit or close when the text field is empty', () => {
    if (typeof document === 'undefined') return;
    let added = false;
    openTodoAddModal({ onAdded: () => (added = true) });
    document.querySelector('[data-wb-todo-add-ok]').click();
    assert.equal(added, false);
    assert.ok(document.querySelector('[data-wb-todo-add-backdrop]'), 'modal should stay open');
  });

  it('cancel button closes without creating a pendiente', () => {
    if (typeof document === 'undefined') return;
    openTodoAddModal({});
    const textarea = document.querySelector('.wb-todo-add-text');
    textarea.value = 'no debería guardarse';
    document.querySelector('[data-wb-todo-add-cancel]').click();
    assert.equal(document.querySelector('[data-wb-todo-add-backdrop]'), null);
    assert.equal(storage.getTodos('p1').length, 0);
  });
});
