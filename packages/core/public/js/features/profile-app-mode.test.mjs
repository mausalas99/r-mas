import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { applyAppModeSwitchEffects } from './profile-app-mode.mjs';

function stubDocument() {
  return {
    getElementById() {
      return null;
    },
  };
}

describe('applyAppModeSwitchEffects', () => {
  const globalNames = ['getActiveInnerTab', 'switchInnerTab', 'refreshExpedienteForAppModeChange', 'renderNotaEvolucionPrimaryTab'];
  const originals = {};
  for (const name of globalNames) originals[name] = globalThis[name];
  const originalDoc = globalThis.document;

  afterEach(() => {
    for (const name of globalNames) {
      if (originals[name]) globalThis[name] = originals[name];
      else delete globalThis[name];
    }
    if (originalDoc) globalThis.document = originalDoc;
    else delete globalThis.document;
  });

  it('calls the window-published refreshExpedienteForAppModeChange handler', () => {
    globalThis.document = stubDocument();
    const calls = [];
    globalThis.getActiveInnerTab = () => 'todo';
    globalThis.switchInnerTab = (tab) => calls.push(['switch', tab]);
    globalThis.refreshExpedienteForAppModeChange = () => calls.push(['refresh']);
    globalThis.renderNotaEvolucionPrimaryTab = () => calls.push(['renderNota']);

    applyAppModeSwitchEffects();

    assert.ok(calls.some((c) => c[0] === 'refresh'), 'expected refreshExpedienteForAppModeChange to be invoked via the global');
  });

  it('does not throw when no window handlers are published', () => {
    globalThis.document = stubDocument();
    delete globalThis.getActiveInnerTab;
    delete globalThis.switchInnerTab;
    delete globalThis.refreshExpedienteForAppModeChange;
    delete globalThis.renderNotaEvolucionPrimaryTab;

    assert.doesNotThrow(() => applyAppModeSwitchEffects());
  });
});
