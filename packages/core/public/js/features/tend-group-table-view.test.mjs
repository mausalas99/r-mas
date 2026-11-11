import test from 'node:test';
import assert from 'node:assert/strict';
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

for (const [name, s] of Object.entries(view.SCENARIOS)) {
  test(`group table ${name}: shows a table only when there are rows`, () => {
    const { m } = view.models(s);
    assert.equal(view.wrap(m, false).includes('<table'), !m.empty);
  });

  test(`group table ${name}: day toggle draws`, () => {
    assert.ok(view.day(s.byDay).length > 0);
  });

  test(`group table ${name}: hidden bar follows the hidden columns`, () => {
    const { bar } = view.models(s);
    if (!bar) return;
    assert.match(view.bar(bar), /<button/);
  });
}
