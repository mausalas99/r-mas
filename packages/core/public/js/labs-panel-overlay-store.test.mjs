import test from 'node:test';
import assert from 'node:assert/strict';

test('labs-panel-overlay-store — saveLabPanelOverlays catches and warns on quota error', async () => {
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
    const { saveLabPanelOverlays } = await import('./labs-panel-overlay-store.mjs');
    saveLabPanelOverlays([{ id: 'test' }]);
    
    assert.ok(warnings.length > 0, 'console.warn should have been called');
    const msg = warnings[0][0];
    assert.ok(msg.includes('failed to write'), 'warn should mention failed write');
  } finally {
    console.warn = origWarn;
    delete globalThis.localStorage;
  }
});
