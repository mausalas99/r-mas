import test from 'node:test';
import assert from 'node:assert/strict';

test('tendencias-sections — tendSectionExpandedWrite catches and warns on quota error', async () => {
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
    const { tendSectionExpandedWrite } = await import('./tendencias-series.mjs');
    tendSectionExpandedWrite({ section1: true });
    
    assert.ok(warnings.length > 0, 'console.warn should have been called');
    const msg = warnings[0][0];
    assert.ok(msg.includes('failed to write'), 'warn should mention failed write');
  } finally {
    console.warn = origWarn;
    delete globalThis.localStorage;
  }
});
