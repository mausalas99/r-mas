import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { SCENARIOS, TODAY } from './med-pharm-profile-view-scenarios.mjs';
import { buildMedPharmSummaryModel } from './med-pharm-profile-render-helpers.mjs';
import { buildSomeGridModel, buildMedGroupModalSubtitle } from './med-pharm-profile-grid.mjs';

const view = await loadJsx(import.meta.url, `import { MedPharmSummaryList, MedPharmEmptyColumns, MedPharmEmptyFilter, SomeGrid } from './med-pharm-profile-view.jsx';
  export const list = (rows) => renderToString(<MedPharmSummaryList rows={rows} onDays={() => {}} />);
  export const emptyColumns = (label) => renderToString(<MedPharmEmptyColumns label={label} onImport={() => {}} />);
  export const emptyFilter = (hiddenCount) => renderToString(<MedPharmEmptyFilter hiddenCount={hiddenCount} />);
  export const grid = (model) => renderToString(<SomeGrid model={model} onDayClick={() => {}} />);`);

// Exact markup the old createElement / string code made before the port (captured from the old
// code with a tiny fake DOM, a fixed clock and the scenarios in med-pharm-profile-view-scenarios.mjs).
const { default: OLD } = await import('./med-pharm-profile-view.old.json', { with: { type: 'json' } });

// Preact writes void tags as <x/>, an empty value as a bare attribute and escapes quotes in text; HTML parses both the same.
const norm = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/ /g, '&nbsp;')
  .replace(/ ?\/>/g, '>')
  .replace(/ (data-med-pharm-open-paste)(?:="")?(?=[ >])/g, ' $1=""');

function draw(s) {
  switch (s.kind) {
    case 'list': return view.list(buildMedPharmSummaryModel(s.groups, s.window, s.profile));
    case 'grid': return view.grid(buildSomeGridModel(s.window, s.rows, s.profile, TODAY));
    case 'emptyColumns': return view.emptyColumns(s.window.label);
    case 'emptyFilter': return view.emptyFilter(s.hiddenCount);
    case 'subtitle': return buildMedGroupModalSubtitle(s.profile, s.window, s.rows);
    default: throw new Error(s.kind);
  }
}

for (const [name, s] of Object.entries(SCENARIOS)) {
  test(`pharm profile HTML equals the old code: ${name}`, () => {
    assert.equal(norm(draw(s)), norm(OLD[name]));
  });
}

test('scenarios cover misses, ×2 days, today, hidden and multi-regimen rows', () => {
  assert.match(OLD.gridFull, /not-admin/);
  assert.match(OLD.gridFull, /class="x2"/);
  assert.match(OLD.gridFull, /today-col/);
  assert.match(OLD.listCurrent, /med-pharm-row--hidden/);
  assert.match(OLD.listCurrent, /med-pharm-regimen-badge/);
});
