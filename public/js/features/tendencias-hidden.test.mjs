import test from 'node:test';
import assert from 'node:assert/strict';

test('tendencias-hidden — logs warn on setItem QuotaExceededError', async () => {
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
    removeItem(k) { delete mockStore[k]; },
  };
  
  try {
    const { tendHiddenSeriesWrite } = await import('./tendencias-hidden.mjs');
    tendHiddenSeriesWrite(['test']);
    
    assert.ok(warnings.length > 0, 'console.warn should have been called');
    const msg = warnings[0][0];
    assert.ok(msg.includes('failed to write'), 'warn should mention the key');
  } finally {
    console.warn = origWarn;
    delete globalThis.localStorage;
  }
});
