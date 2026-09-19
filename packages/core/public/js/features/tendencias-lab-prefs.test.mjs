import test from 'node:test';
import assert from 'node:assert/strict';

test('tendencias-lab-prefs — setLabOutputPrefs catches and warns on quota error', async () => {
  const warnings = [];
  const origWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  
  const mockStore = {};
  globalThis.localStorage = {
    getItem(k) { return mockStore[k]; },
    setItem(k) {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    },
  };
  
  try {
    const { setLabOutputPrefs } = await import('./tendencias-lab-prefs.mjs');
    setLabOutputPrefs({ showBhExtendedLine: true });
    
    assert.ok(warnings.length > 0, 'console.warn should have been called');
    const msg = warnings[0][0];
    assert.ok(msg.includes('failed to write'), 'warn should mention failed write');
  } finally {
    console.warn = origWarn;
    delete globalThis.localStorage;
  }
});
