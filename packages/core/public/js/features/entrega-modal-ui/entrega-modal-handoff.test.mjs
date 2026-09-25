import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Same convention as entrega-modal-procedures.test.mjs: `npm run test:one` runs
// through Electron's Node runtime with no `document`, so a rendered innerHTML
// string can't be mounted here — assert on the source directly.
const src = readFileSync(fileURLToPath(new URL('./entrega-modal-handoff.mjs', import.meta.url)), 'utf8');

describe('entrega handoff panel — Marcadores esfuerzo/pronóstico', () => {
  it('renders the guardia emoji marker groups only when a patientId is known', () => {
    assert.match(
      src,
      /marks\s*\?\s*guardiaMarksGroupHtml\('Esfuerzo terapéutico', 'guardiaEsfuerzo', GUARDIA_ESFUERZO_OPTIONS, marks\.guardiaEsfuerzo\)/
    );
    assert.match(src, /const marks = patientId \? currentGuardiaMarks\(patientId\) : null;/);
  });

  it('wires the marker buttons to save only once a patientId is known', () => {
    assert.match(src, /if \(patientId\) wireGuardiaMarksButtons\(host, \{ patientId, onMarksSaved: null \}\);/);
  });
});

describe('entrega handoff panel — Soporte · Signos vitales collapses by default', () => {
  it('wraps vasopresor/ventilación/vitales in the existing entrega-proc-details disclosure', () => {
    assert.match(src, /<details class="entrega-proc-details"\$\{supportOpen \? ' open' : ''\}>/);
    assert.match(src, /const supportOpen = norm\.vasopressor\.active \|\| norm\.ventilation\.active;/);
  });
});
