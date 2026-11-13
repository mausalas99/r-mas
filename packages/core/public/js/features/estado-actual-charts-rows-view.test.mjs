import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { historialSortedAsc } from './estado-actual-charts-series.mjs';

// Output of the old string builders (renderEaChartsRows before the Preact port) for HIST, captured
// per tab|range|sel|slot-or-inline. `slot` = pills in the header slot (ctl), `inline` = pills in the mount.
const OLD = createRequire(import.meta.url)('./estado-actual-charts-rows-view-old-html.json');

// Synthetic: 7 days x 2 registros, some vitals/glucometrías out of range.
function makeHist() {
  const out = [];
  for (let d = 0; d < 7; d++) {
    for (const h of [8, 20]) {
      const k = d * 2 + (h === 8 ? 0 : 1);
      out.push({
        recordedAt: new Date(2025, 2, 1 + d, h, 0).toISOString(),
        vitalSeries: {
          tas: [{ value: 110 + ((k * 7) % 45) }],
          tad: [{ value: 65 + ((k * 5) % 35) }],
          fc: [{ value: 62 + ((k * 11) % 50) }],
          fr: [{ value: 14 + ((k * 3) % 14) }],
          sat: [{ value: 88 + ((k * 3) % 11) }],
          temp: [{ value: 36 + (k % 4) * 0.7 }],
        },
        glucometrias: [{ time: '07:00', value: 80 + ((k * 23) % 120) }, { time: '13:30', value: 95 + ((k * 17) % 100) }],
        io: { ing: 1500 + k * 120, egr: 1100 + ((k * 211) % 900) },
      });
    }
  }
  return out;
}

async function load() {
  return loadJsx(import.meta.url, `import { EaChartsPane, EaChartsControls, EaChartsEmpty, EaChartsInline } from './estado-actual-charts-rows-view.jsx';
    export const pane = (p) => renderToString(<EaChartsPane {...p} />);
    export const controls = (p) => renderToString(<EaChartsControls {...p} />);
    export const empty = () => renderToString(<EaChartsEmpty />);
    export const inline = (p) => renderToString(<EaChartsInline {...p} />);`);
}

// Same markup, other spellings: Preact self-closes empty SVG shapes and writes a bare >;
// the old strings wrote <rect></rect> and a double space when the guide was not hidden.
const same = (s) =>
  s
    .replace(/<(rect|polyline|polygon|line)([^>]*?)\s*\/>/g, '<$1$2></$1>')
    .replace(/<br\s*\/>/g, '<br>')
    .replace(/&gt;/g, '>')
    .replace(/ {2}/g, ' ');

test('Gráficas: same HTML as the old string builders', async () => {
  const v = await load();
  const hist = historialSortedAsc(makeHist());
  const rd = { vit: true, glu: true, bal: true };
  let checked = 0;
  for (const tab of ['vit', 'glu', 'bal']) {
    for (const range of ['last5', 'all']) {
      for (const sel of [null, 1, 3]) {
        const p = { tab, histAsc: hist, range, sel, ready: rd };
        const slot = OLD[[tab, range, String(sel), 'slot'].join('|')];
        const inl = OLD[[tab, range, String(sel), 'inline'].join('|')];
        assert.equal(same(v.pane(p)), same(slot.mount), `${tab} ${range} ${sel} pane`);
        assert.equal(same(v.controls(p)), same(slot.ctl), `${tab} ${range} ${sel} controls`);
        assert.equal(same(v.inline(p)), same(inl.mount), `${tab} ${range} ${sel} inline`);
        checked++;
      }
    }
  }
  assert.equal(checked, 18);
});

test('Gráficas: empty state and disabled tabs', async () => {
  const v = await load();
  assert.equal(same(v.empty()), same(OLD['empty|slot'].mount));
  assert.equal(same(v.empty()), same(OLD['empty|inline'].mount));
  assert.equal(OLD['empty|slot'].ctl, '');
  // glucometrías-only registros: vit disabled, glu active, bal disabled
  const gluOnly = historialSortedAsc(makeHist().slice(0, 2).map((e) => ({ recordedAt: e.recordedAt, glucometrias: e.glucometrias })));
  const p = { tab: 'glu', histAsc: gluOnly, range: 'last5', sel: null, ready: { vit: false, glu: true, bal: false } };
  assert.equal(same(v.controls(p)), same(OLD['glu-only|slot'].ctl));
  assert.equal(same(v.pane(p)), same(OLD['glu-only|slot'].mount));
});
