import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { gridWithSectionExpanded, gridWithRows, gridWithRowOrder } from './tendencias-grid-model.mjs';
import { GRID, SUMMARY, TOOLBAR, HIDDEN, EMPTY, LEGEND } from './tendencias-render-scenarios.mjs';

const m = await loadJsx(import.meta.url, `
  import { tendSectionModel, tendSummaryModel } from './tendencias-grid-model.mjs';
  import { buildTextSkeletonPanel } from '../ui-skeleton.mjs';
  import { tendToolbarModel, tendHiddenChipsModel, tendHiddenSeriesWrite } from './tendencias-series.mjs';
  import { tendEventsLegendModel } from './tendencias-event-context.mjs';
  import { Section, Summary, Toolbar, HiddenChips, EmptyNote, Skeleton } from './tendencias-render-view.jsx';
  import { EventsLegend } from './tendencias-ui-detail-view.jsx';
  export const section = (key, expanded, fields, index) =>
    renderToString(<Section s={tendSectionModel(key, fields.map((f) => ({ sectionKey: key, fieldKey: f })), index, expanded)} />);
  export const summary = (history, oor, total) => renderToString(<Summary m={tendSummaryModel(history, oor, total)} />);
  export const toolbar = (s) => renderToString(<Toolbar m={tendToolbarModel(s.hidden, { total: s.total, oor: s.oor, gaso: s.gaso, on: s.on })} />);
  export const hidden = (keys) => { tendHiddenSeriesWrite(keys); const h = renderToString(<HiddenChips chips={tendHiddenChipsModel()} />); tendHiddenSeriesWrite([]); return h; };
  export const skeleton = (n) => ({ now: renderToString(<Skeleton lines={n} />), old: buildTextSkeletonPanel('tend-skeleton skel-panel', n) });
  export const note = (kind) => renderToString(<EmptyNote kind={kind} />);
  export const legend = (s) => {
    const byIndex = new Map(s.markers.map(([i, kind, entries]) => [i, { kind, entries }]));
    return renderToString(<EventsLegend items={tendEventsLegendModel({ indices: s.markers.map((x) => x[0]), byIndex }, s.labels)} />);
  };`);

// Exact markup the string builders made before the port (captured from the old code).
const OLD = JSON.parse(await readFile(new URL('./tendencias-render-view.old.json', import.meta.url), 'utf8'));

// Preact leaves '>' unescaped, writes an empty class / value bare and escapes quotes in text; HTML parses all of it the same.
const norm = (s) => s.replace(/(<input(?:[^>"]|"[^"]*")*?)\/>/g, '$1>').replace(/&gt;/g, '>').replace(/ (class|value)(?=[ >])/g, ' $1=""').replace(/&#34;|&quot;/g, '"').replace(/<(path|circle|line)([^>]*)><\/\1>/g, '<$1$2/>').replace(/&#39;/g, "'");

for (const [name, s] of Object.entries(GRID)) {
  test(`tendencias sections HTML equals the old builders: ${name}`, () => {
    const now = s.sections.map((x) => m.section(x.key, x.expanded, x.fields, s.index));
    assert.deepEqual(now.map(norm), OLD.grid[name].map(norm));
  });
}
for (const [name, s] of Object.entries(SUMMARY)) {
  test(`tendencias summary HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(m.summary(s.history, s.oor, s.total)), norm(OLD.summary[name]));
  });
}
for (const [name, s] of Object.entries(TOOLBAR)) {
  test(`tendencias toolbar HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(m.toolbar(s)), norm(OLD.toolbar[name]));
  });
}
for (const [name, keys] of Object.entries(HIDDEN)) {
  test(`tendencias hidden chips HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(m.hidden(keys)), norm(OLD.hidden[name] || '<p style="margin:0;font-size:13px;color:var(--text-muted);">No hay analitos ocultos.</p>'));
  });
}
for (const name of Object.keys(EMPTY)) {
  test(`tendencias empty note HTML equals the old builder: ${name}`, () => {
    const kind = { 'abnormal only': 'abnormal', 'all hidden': 'hidden', 'no data': 'nodata' }[name];
    assert.equal(norm(m.note(kind)), norm(OLD.empty[kind]));
  });
}
for (const [name, s] of Object.entries(LEGEND)) {
  test(`tendencias events legend HTML equals the old builder: ${name}`, () => {
    assert.equal(norm(m.legend(s)), norm(OLD.legend[name]));
  });
}

for (const n of [4, 1, 3]) {
  test(`tendencias loading skeleton HTML equals the old builder: ${n} lines`, () => {
    const { now, old } = m.skeleton(n);
    assert.equal(norm(now), norm(old));
  });
}

const base = { toolbar: {}, summary: {}, sections: [
  { key: 'BH', expanded: true, rows: [{ key: 'BH|Hb', latest: 1 }, { key: 'BH|Hto', latest: 2 }] },
  { key: 'QS', expanded: false, rows: [{ key: 'QS|Glu', latest: 3 }] },
] };

test('grid model: opening a section changes only that section', () => {
  const next = gridWithSectionExpanded(base, 'QS', true);
  assert.equal(next.sections[1].expanded, true);
  assert.equal(next.sections[0], base.sections[0]);
  assert.equal(base.sections[1].expanded, false);
});

test('grid model: new rows replace by key, an unknown key gives null', () => {
  const next = gridWithRows(base, { 'BH|Hto': { key: 'BH|Hto', latest: 9 } });
  assert.deepEqual(next.sections[0].rows.map((r) => r.latest), [1, 9]);
  assert.equal(gridWithRows(base, { 'XX|Nope': {} }), null);
  assert.equal(gridWithRows(base, {}), null);
});

test('grid model: a dragged order is kept, unlisted rows go last', () => {
  const next = gridWithRowOrder(base, 'BH', ['BH|Hto']);
  assert.deepEqual(next.sections[0].rows.map((r) => r.key), ['BH|Hto', 'BH|Hb']);
  assert.equal(next.sections[1], base.sections[1]);
});
