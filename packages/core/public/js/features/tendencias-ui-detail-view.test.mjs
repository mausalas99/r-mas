import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadJsx } from './preact-view-test-helpers.mjs';

const m = await loadJsx(import.meta.url, `
  import { SCENARIOS } from './tendencias-ui-detail-scenarios.mjs';
  import { tendReadingsRows, tendDetailHeaderModel } from './tendencias-insight.mjs';
  import { Badge, Hero, Range, Readings, ComparePicker } from './tendencias-ui-detail-view.jsx';
  export { SCENARIOS };
  export const html = (name) => {
    const { ref, unit, labels, values, sibs, cur } = SCENARIOS[name];
    const latest = values[values.length - 1];
    const model = tendDetailHeaderModel(latest, ref, unit, labels, values, tendReadingsRows(labels, values, ref));
    return {
      badge: model.badge ? renderToString(<Badge st={model.badge} />) : '',
      hero: renderToString(<Hero h={model.hero} />),
      ref: renderToString(<Range text={model.range} />),
      readings: renderToString(<Readings rows={model.readings} />),
      compare: sibs.length ? renderToString(<ComparePicker siblings={sibs} current={sibs.includes(cur) ? cur : null} />) : '',
    };
  };`);

// Exact markup the string builders made before the port (captured from the old code).
const OLD = JSON.parse(await readFile(new URL('./tendencias-ui-detail-view.old.json', import.meta.url), 'utf8'));

// Preact leaves '>' unescaped, writes an empty class / value bare and escapes quotes in text; HTML parses all of it the same.
const norm = (s) => s.replace(/&gt;/g, '>').replace(/ (class|value)(?=[ >])/g, ' $1=""').replace(/&#34;|&quot;/g, '"');

for (const name of Object.keys(m.SCENARIOS)) {
  test(`tendencias detail HTML equals the old builders: ${name}`, () => {
    const now = m.html(name);
    for (const part of ['badge', 'hero', 'ref', 'readings', 'compare']) assert.equal(norm(now[part]), norm(OLD[name][part]), part);
  });
}
