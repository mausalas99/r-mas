import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { switchInnerTab, invalidateInnerTabRenderCache } from './medications-actions.mjs';

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
