import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

test('clinical-value animations in pase-board.css are bounded, never infinite', () => {
  const css = read('public/styles/pase-board.css');

  // Critical-value pulse (priority-critical) must run a fixed number of times.
  assert.match(css, /animation:\s*criticalPulseHighlight 2\.5s var\(--ease-out\) 2;/);

  // Vitals-banner warning blink must run a fixed number of times.
  assert.match(css, /animation:\s*guardia-vitals-blink 1\.5s var\(--ease-out\) 2;/);

  // No animation on a clinical-value selector (priority-critical, vitals-banner)
  // may run forever.
  const clinicalRules = css.match(
    /\.(?:priority-critical|vitals-banner)[^{]*\{[^}]*\}/gs
  ) || [];
  for (const rule of clinicalRules) {
    assert.equal(
      /animation:[^;]*\binfinite\b/.test(rule),
      false,
      `clinical-value rule must not use infinite: ${rule}`
    );
  }
});
