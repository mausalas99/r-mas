import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadJsx } from './preact-view-test-helpers.mjs';

// The render module imports the .jsx view, so it is bundled with it like the renderer does.
const view = await loadJsx(import.meta.url, `import { GroupTable, DayToggle, HiddenBar } from './tend-group-table-view.jsx';
  import { SCENARIOS, deps } from './tend-group-table-scenarios.mjs';
  import { buildGroupTableViewModel, buildHiddenBarModel, createTableExportModel } from '../tend-group-table-render.mjs';
  export { SCENARIOS };
  export const models = (s) => {
    const exp = createTableExportModel(deps, s.state, s.state.sectionKey, s.raw, s.hidden, s.markersByDay);
    const m = buildGroupTableViewModel(deps, s.state, s.raw, s.hidden, s.byDay, s.specsByRowKey, s.markersByDay, exp);
    m.empty = !s.specs.length;
    s.state.tableHiddenMenuOpen = s.menuOpen;
    return { m, bar: buildHiddenBarModel(deps, s.state, s.hidden, s.raw, s.specsByRowKey) };
  };
  const noop = () => {};
  export const wrap = (m, slotted) => renderToString(<GroupTable m={m} slotted={slotted} onToggleCol={noop} onToggleRow={noop} onByDay={noop} />);
  export const day = (byDay) => renderToString(<DayToggle byDay={byDay} onByDay={noop} />);
  export const bar = (m) => renderToString(<HiddenBar m={m} onTrigger={noop} onFilter={noop} onShowAll={noop} onRestore={noop} />);`);

// Exact markup the string builders made before the port (captured from the old code).
const OLD = JSON.parse(fs.readFileSync(new URL('./tend-group-table-view.old.json', import.meta.url), 'utf8'));

// Preact leaves '>' unescaped, writes an empty class / value bare, closes SVG tags and escapes quotes in text; HTML parses all of it the same.
const norm = (s) =>
  s.replace(/&gt;/g, '>').replace(/ (class|value)(?=[ >])/g, ' $1=""').replace(/&#34;|&quot;/g, '"').replace(/<(path|circle)([^>]*?)\/>/g, '<$1$2></$1>').replace(/ ?\/>/g, '>');

for (const [name, s] of Object.entries(view.SCENARIOS)) {
  test(`group table HTML equals the old builders: ${name}`, () => {
    const { m, bar } = view.models(s);
    const old = OLD[name];
    assert.equal(norm(view.wrap(m, false)), norm(old.wrap), 'wrap');
    assert.equal(norm(view.wrap(m, true)), norm(old.wrapSlot), 'wrap with day slot');
    assert.equal(norm(view.day(s.byDay)), norm(old.day), 'day toggle');
    assert.equal(bar ? '' : 'none', old.bar.display, 'bar display');
    if (bar) assert.equal('tend-group-table-hidden-bar' + (bar.open ? ' is-open' : ''), old.bar.className, 'bar class');
    assert.equal(bar ? norm(view.bar(bar)) : '', norm(old.bar.html), 'bar');
  });
}
