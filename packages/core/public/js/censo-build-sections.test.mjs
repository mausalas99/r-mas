import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPatientSections } from './censo-build-sections.mjs';

test('meds go in one flowing line with the day in parentheses', () => {
  const { sections } = buildPatientSections(
    { id: 'p1', censoMedsText: 'ACICLOVIR\nDía 3\nDEXTROSA\nOMEPRAZOL' },
    { medRecetaByPatient: {}, labHistoryByPatient: {}, todosByPatient: {}, now: new Date('2026-11-07') }
  );
  const meds = sections.find((s) => s.label === 'Medicamentos');
  assert.deepEqual(meds.lines, ['ACICLOVIR (Día 3) · DEXTROSA · OMEPRAZOL']);
});
