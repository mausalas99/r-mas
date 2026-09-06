import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { switchInnerTab, invalidateInnerTabRenderCache, addPendientesFromParsedReceta } from './medications-actions.mjs';
import { storage } from '../storage.js';
import { registerTodosRuntime } from './todos-runtime.mjs';

describe('medications-actions global handler wiring', () => {
  const originalSwitch = globalThis.switchInnerTab;
  const originalInvalidate = globalThis.invalidateInnerTabRenderCache;

  afterEach(() => {
    if (originalSwitch) globalThis.switchInnerTab = originalSwitch;
    else delete globalThis.switchInnerTab;
    if (originalInvalidate) globalThis.invalidateInnerTabRenderCache = originalInvalidate;
    else delete globalThis.invalidateInnerTabRenderCache;
  });

  it('switchInnerTab calls the window-published handler', () => {
    delete globalThis.window;
    const calls = [];
    globalThis.switchInnerTab = (tab, opts) => calls.push([tab, opts]);
    switchInnerTab('notas', { forceRender: true });
    assert.deepEqual(calls, [['notas', { forceRender: true }]]);
  });

  it('invalidateInnerTabRenderCache calls the window-published handler', () => {
    delete globalThis.window;
    const calls = [];
    globalThis.invalidateInnerTabRenderCache = (tab) => calls.push(tab);
    invalidateInnerTabRenderCache('estadoActual');
    assert.deepEqual(calls, ['estadoActual']);
  });

  it('does not throw when no handler is published', () => {
    delete globalThis.window;
    delete globalThis.switchInnerTab;
    delete globalThis.invalidateInnerTabRenderCache;
    assert.doesNotThrow(() => switchInnerTab('notas'));
    assert.doesNotThrow(() => invalidateInnerTabRenderCache('estadoActual'));
  });
});

describe('addPendientesFromParsedReceta', () => {
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

  it('creates a pendiente for each ESTUDIOS/PROCEDIMIENTO row, kept separate', () => {
    addPendientesFromParsedReceta('p1', [
      { kind: 'estudio', nombreRaw: 'TAC TORAX SIMPLE Y CONT', detalleRaw: '' },
      { kind: 'procedimiento', nombreRaw: 'HEMODIALISIS', detalleRaw: 'KIT PARA HEMODIALISIS' },
    ]);
    const todos = storage.getTodos('p1');
    assert.equal(todos.length, 2);
    assert.equal(todos[0].text, 'Estudio: TAC TORAX SIMPLE Y CONT');
    // "KIT PARA X" es sólo el insumo, no aporta nada al pendiente.
    assert.equal(todos[1].text, 'Procedimiento: HEMODIALISIS');
  });

  it('shortens a TOMOGRAFIA procedimiento name and folds contraste into "contrastada"', () => {
    addPendientesFromParsedReceta('p1', [
      {
        kind: 'procedimiento',
        nombreRaw: 'TOMOGRAFIA AXIAL COMPUTERIZADA DE TORAX',
        detalleRaw: 'CONTRASTE PARA TAC DE TORAX',
      },
    ]);
    assert.equal(storage.getTodos('p1')[0].text, 'Procedimiento: TAC de Torax contrastada');
  });

  it('does not duplicate a pendiente already open with the same text', () => {
    addPendientesFromParsedReceta('p1', [{ kind: 'estudio', nombreRaw: 'BIOMETRÍA HEMÁTICA', detalleRaw: '' }]);
    addPendientesFromParsedReceta('p1', [{ kind: 'estudio', nombreRaw: 'BIOMETRÍA HEMÁTICA', detalleRaw: '' }]);
    assert.equal(storage.getTodos('p1').length, 1);
  });

  it('a changed solicitud (contrastada vs sin contraste) is a new pendiente, not a duplicate', () => {
    addPendientesFromParsedReceta('p1', [
      { kind: 'procedimiento', nombreRaw: 'TOMOGRAFIA AXIAL COMPUTERIZADA DE TORAX', detalleRaw: 'CONTRASTE PARA TAC DE TORAX' },
    ]);
    addPendientesFromParsedReceta('p1', [
      { kind: 'procedimiento', nombreRaw: 'TOMOGRAFIA AXIAL COMPUTERIZADA DE TORAX', detalleRaw: 'SIN CONTRASTE' },
    ]);
    const todos = storage.getTodos('p1');
    assert.equal(todos.length, 2);
    assert.equal(todos[0].text, 'Procedimiento: TAC de Torax contrastada');
    assert.equal(todos[1].text, 'Procedimiento: TAC de Torax');
  });
});
