import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ensureClinicoTabConsistency, applyHideManejoSectionEffects } from './profile-prefs.mjs';

describe('profile-prefs global handler wiring', () => {
  const globalNames = ['getActiveInnerTab', 'switchInnerTab', 'renderInnerTabs'];
  const originals = {};
  for (const name of globalNames) originals[name] = globalThis[name];

  afterEach(() => {
    for (const name of globalNames) {
      if (originals[name]) globalThis[name] = originals[name];
      else delete globalThis[name];
    }
  });

  it('ensureClinicoTabConsistency reads the active tab via the global and no-ops without one', () => {
    delete globalThis.getActiveInnerTab;
    const calls = [];
    globalThis.switchInnerTab = (tab) => calls.push(tab);
    assert.doesNotThrow(() => ensureClinicoTabConsistency());
    assert.deepEqual(calls, []);
  });

  it('applyHideManejoSectionEffects calls the window-published renderInnerTabs handler', () => {
    globalThis.getActiveInnerTab = () => null;
    const calls = [];
    globalThis.renderInnerTabs = () => calls.push('rendered');
    applyHideManejoSectionEffects();
    assert.deepEqual(calls, ['rendered']);
  });
});
