import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { DAY_OPTIONS, MOBILE_HINTS, DEDUPE } from './lab-panel-history-view-scenarios.mjs';

const m = await loadJsx(import.meta.url, `
  import { LabHistoryDayOptions, LabMobileEmptyHint } from './lab-panel-history-view.jsx';
  import { LabDedupeModal } from './lab-panel-history-dedupe-view.jsx';
  export const dayOptions = (days, selectedDayKey) => renderToString(<LabHistoryDayOptions days={days} selectedDayKey={selectedDayKey} />);
  export const mobileHint = (message) => renderToString(<LabMobileEmptyHint message={message} />);
  export const dedupe = (sections) => renderToString(<LabDedupeModal sections={sections} />);`);

// Exact markup the string builders made before the port (captured from the old code).
const OLD = JSON.parse(fs.readFileSync(new URL('./lab-panel-history-view.old.json', import.meta.url), 'utf8'));

// Preact writes void tags as <x/>, leaves '>' unescaped and escapes ' as &#39;; HTML parses both the same.
const norm = (s) => s.replace(/ ?\/>/g, '>').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

for (const [name, v] of Object.entries(DAY_OPTIONS)) {
  test(`lab history day options equal the old builder: ${name}`, () => {
    assert.equal(norm(m.dayOptions(v.days, v.selected)), norm(OLD.dayOptions[name]));
  });
}
for (const [name, msg] of Object.entries(MOBILE_HINTS)) {
  test(`lab mobile empty hint equals the old markup: ${name}`, () => {
    assert.equal(norm(m.mobileHint(msg)), norm(OLD.mobileHint[name]));
  });
}
for (const [name, sections] of Object.entries(DEDUPE)) {
  test(`lab dedupe modal equals the old builder: ${name}`, () => {
    assert.equal(norm(m.dedupe(sections)), norm(OLD.dedupe[name]));
  });
}
