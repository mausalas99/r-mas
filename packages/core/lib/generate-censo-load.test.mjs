import { test } from 'node:test';
import assert from 'node:assert/strict';

// Regression: main-process PDF export must load without browser-only .jsx modules.
test('generate-censo.js loads in plain Node', async () => {
  const m = await import('../generate-censo.js');
  assert.equal(typeof m.renderCensusPdf, 'function');
});
