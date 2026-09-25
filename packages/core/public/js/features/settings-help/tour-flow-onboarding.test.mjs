import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

test('tour-flow-onboarding — setupNonGuardiaTourMode catches and warns on setItem error', () => {
  const src = readFileSync(join(dir, 'tour-flow-onboarding.mjs'), 'utf8');
  assert.match(src, /try\s*\{\s*localStorage\.setItem\('rpc-settings'/);
  assert.match(src, /catch\s*\(\s*e\s*\)\s*\{\s*console\.warn\(/);
  assert.match(src, /failed to write rpc-settings/);
});
