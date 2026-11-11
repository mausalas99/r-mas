import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { buildScaleLines } from '../vpo-calc.mjs';
import { SCENARIOS } from './vpo-panel-view-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { VpoPanel } from './vpo-panel-view.jsx';
  export const html = (p) => renderToString(<VpoPanel {...p} />);`);

// Exact markup the old string builders (buildVpoPanelInnerHtml and friends) made before the port,
// captured from the old code with the scenarios in vpo-panel-view-scenarios.mjs.
const { default: OLD } = await import('./vpo-panel-view.old.json', { with: { type: 'json' } });

// Preact writes void tags as <x/>, a boolean attribute as ="true", an empty value as a bare attribute and leaves '>' unescaped in text; HTML parses both the same.
const norm = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/ ?\/>/g, '>')
  .replace(/ (data-vpo-(?:close|dx-paste))="(?:true)?"/g, ' $1')
  .replace(/( (?:value|placeholder))(?=[ >])/g, '$1=""');

for (const [name, sc] of Object.entries(SCENARIOS)) {
  test(`VPO panel HTML equals the old builder: ${name}`, () => {
    const state = sc.state();
    const lines = sc.calc ? buildScaleLines(state) : {};
    assert.equal(norm(view.html({ state, calc: sc.calc, lines, note: sc.note })), norm(OLD[name]));
  });
}

test('calculator scenarios draw «Falta» rows and the calc host', () => {
  assert.match(OLD.calcOnMissing, /vpo-row-miss/);
  assert.match(OLD.calcOnMissing, /vpo-risk-in/);
  assert.doesNotMatch(OLD.empty, /vpo-risk-in/);
});
