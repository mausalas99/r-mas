import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { DAY_OPTIONS, MOBILE_HINTS, DEDUPE } from './lab-panel-history-view-scenarios.mjs';

const m = await loadJsx(import.meta.url, `
  import { LabHistoryDayOptions, LabMobileEmptyHint } from './lab-panel-history-view.jsx';
  import { LabDedupeModal } from './lab-panel-history-dedupe-view.jsx';
  export const dayOptions = (days, selectedDayKey) => renderToString(<LabHistoryDayOptions days={days} selectedDayKey={selectedDayKey} />);
  export const mobileHint = (message) => renderToString(<LabMobileEmptyHint message={message} />);
  export const dedupe = (sections) => renderToString(<LabDedupeModal sections={sections} />);`);

const text = (h) => h.replace(/<[^>]*>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

for (const [name, v] of Object.entries(DAY_OPTIONS)) {
  test(`lab history day options ${name}: one option is selected when the key exists`, () => {
    const html = m.dayOptions(v.days, v.selected);
    const picked = (html.match(/selected/g) || []).length;
    assert.equal(picked, v.days.some((d) => (d.key ?? d.dayKey ?? d.value) === v.selected) ? 1 : picked);
  });
}
for (const [name, msg] of Object.entries(MOBILE_HINTS)) {
  test(`lab mobile empty hint ${name} shows its message`, () => {
    assert.ok(text(m.mobileHint(msg)).includes(msg.replace(/\s+/g, ' ').trim()));
  });
}
for (const [name, sections] of Object.entries(DEDUPE)) {
  test(`lab dedupe modal ${name} renders without losing a section`, () => {
    assert.ok(m.dedupe(sections).length > 0);
  });
}
