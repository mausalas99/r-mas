import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

// Exact markup the string builders made before the port (captured from the old code).
const OLD = JSON.parse(fs.readFileSync(new URL('./tend-group-charts-view.old.json', import.meta.url), 'utf8'));

// Preact leaves '>' unescaped, writes an empty class / value bare, closes SVG tags and escapes quotes in text; HTML parses all of it the same.
const norm = (s) => s.replace(/&gt;/g, '>').replace(/ (class|value)(?=[ >])/g, ' $1=""').replace(/&#34;|&quot;/g, '"').replace(/<polyline([^>]*?)\/>/g, '<polyline$1></polyline>').replace(/ ?\/>/g, '>');

for (const [name, s] of Object.entries(view.LEGEND)) {
  test(`legend row HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.legend(s)), norm(OLD.legend[name]));
  });
}
for (const [name, chips] of Object.entries(view.HIDDEN_BAR)) {
  test(`hidden panels bar HTML equals the old builder: ${name}`, () => {
    if (!chips.length) return assert.equal(OLD.hiddenBar[name].display, 'none');
    assert.equal(norm(view.bar(chips)), norm(OLD.hiddenBar[name].html));
  });
}
for (const [name, rel] of Object.entries(view.SCALE)) {
  test(`scale row HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(view.scale(rel)), norm(OLD.scale[name]));
  });
}
