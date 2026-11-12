import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { hourHeaderParts } from './lab-results-card.mjs';
import { HOUR_HEADERS, CHIPS } from './lab-results-card-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { LabHourHeader, LabAlteredChips } from './lab-results-card-view.jsx';
  export const header = (p) => renderToString(<LabHourHeader hora={p.hora} label={p.label} />);
  export const chips = (list) => renderToString(<LabAlteredChips chips={list} />);`);

// Exact markup lab-results-card.mjs made before the port (headerEl.innerHTML / host.innerHTML, from the old code).
const { default: OLD } = await import('./lab-results-card-view.old.json', { with: { type: 'json' } });

// Preact writes a bare `hidden`, escapes > in text and quotes; HTML parses both the same.
const norm = (s) => s.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/ ([a-z-]+)=""/g, ' $1');

for (const [name, h] of Object.entries(HOUR_HEADERS)) {
  test(`Lab hour header HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.header(hourHeaderParts(h.text, h.altered))), norm(OLD.hours[name]));
  });
}
for (const [name, list] of Object.entries(CHIPS)) {
  if (!list.length) continue;
  test(`Lab altered chips HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.chips(list)), norm(OLD.chips[name]));
  });
}
