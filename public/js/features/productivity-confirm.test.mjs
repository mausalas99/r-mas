import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerProductivityRuntime, undoLastOperation, deleteExtraTemplate } from './productivity.mjs';

function memoryStorage() {
  const data = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem(k, v) {
      data[k] = String(v);
    },
    removeItem(k) {
      delete data[k];
    },
  };
}

describe('productivity.mjs confirm migrations', () => {
  let prevLocalStorage;

  beforeEach(() => {
    prevLocalStorage = globalThis.localStorage;
    globalThis.localStorage = memoryStorage();
  });

  afterEach(() => {
    globalThis.localStorage = prevLocalStorage;
  });

  it('undoLastOperation opens a consequence confirm; canceling leaves the undo stack untouched', async () => {
    if (typeof document === 'undefined') return;
    localStorage.setItem(
      'rpc-undo-stack',
      JSON.stringify([{ label: 'eliminar paciente', data: {} }])
    );
    await undoLastOperation();
    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'consequence modal should be open');
    assert.match(backdrop.innerHTML, /wb-confirm-modal--consequence/);
    assert.match(backdrop.innerHTML, /¿Revertir &quot;eliminar paciente&quot;\?/);
    assert.match(backdrop.innerHTML, /La aplicación se recargará\./);

    document.querySelector('[data-wb-confirm-cancel]').click();
    const stack = JSON.parse(localStorage.getItem('rpc-undo-stack'));
    assert.equal(stack.length, 1, 'canceling must not consume the undo snapshot');
  });

  it('deleteExtraTemplate opens a destructive confirm; only removes the template on confirm', async () => {
    if (typeof document === 'undefined') return;
    const settings = { extraTemplates: [{ id: 't1', label: 'Plan A' }] };
    registerProductivityRuntime({ getSettings: () => settings });

    const p = deleteExtraTemplate('t1');
    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'destructive modal should be open');
    assert.match(backdrop.innerHTML, /wb-confirm-modal--destructive/);
    assert.match(backdrop.innerHTML, /¿Eliminar la plantilla &quot;Plan A&quot;\?/);

    document.querySelector('[data-wb-confirm-ok]').click();
    await p;
    assert.equal(settings.extraTemplates.length, 0, 'confirm must remove the template');
  });
});
