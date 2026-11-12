import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { PanelsHiddenBar, ScaleRow, LegendItem, legendItemModel } from './tend-group-charts-view.jsx';
  import { LEGEND, HIDDEN_BAR, SCALE } from './tend-group-charts-scenarios.mjs';
  export { LEGEND, HIDDEN_BAR, SCALE };
  export const legend = (s) => {
    const raw = s.raw;
    const data = s.rel ? raw.map((v) => (v == null ? null : ((v - s.rel[0]) / (s.rel[1] - s.rel[0])) * 100)) : raw;
    return renderToString(<LegendItem m={legendItemModel(s.fk, s.checked, s.color, s.label, data, raw)} />);
  };
  export const bar = (chips) => renderToString(<PanelsHiddenBar chips={chips} />);
  export const scale = (rel) => renderToString(<ScaleRow rel={rel} />);`);

const text = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

for (const [name, s] of Object.entries(view.LEGEND)) {
  test(`legend row ${name} shows its label`, () => {
    assert.ok(text(view.legend(s)).includes(s.label), s.label);
  });
}
for (const [name, chips] of Object.entries(view.HIDDEN_BAR)) {
  test(`hidden panels bar ${name} shows each hidden chip`, () => {
    if (!chips.length) return;
    const html = view.bar(chips);
    for (const c of chips) assert.ok(text(html).includes(c.title), c.title);
  });
}
for (const [name, rel] of Object.entries(view.SCALE)) {
  test(`scale row ${name} renders`, () => {
    assert.ok(view.scale(rel).length > 0);
  });
}
