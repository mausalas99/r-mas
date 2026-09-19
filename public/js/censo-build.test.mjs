import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPatientNameForCenso } from './censo-build.mjs';

test('formatPatientNameForCenso conserva nombre completo', () => {
  assert.equal(formatPatientNameForCenso('GARCIA LOPEZ JUAN CARLOS'), 'GARCIA LOPEZ JUAN CARLOS');
  assert.equal(formatPatientNameForCenso('  MARIA  '), 'MARIA');
  assert.equal(formatPatientNameForCenso(''), '—');
});
