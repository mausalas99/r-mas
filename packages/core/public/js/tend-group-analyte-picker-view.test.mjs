import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadJsx } from './features/preact-view-test-helpers.mjs';
import { PICKER } from './features/tendencias-render-scenarios.mjs';

const m = await loadJsx(import.meta.url, `
  import { PickerBar, SectionList, FieldList } from './tend-group-analyte-picker-view.jsx';
  const noop = () => {};
  export const bar = (extras) => renderToString(<PickerBar chips={extras.map((sp) => ({ key: sp.sectionKey + '|' + sp.fieldKey, name: sp.cardTitle || sp.fieldKey, secLabel: sp.sectionKey }))} onAdd={noop} onRemove={noop} />);
  export const sections = (groups) => renderToString(<SectionList groups={groups} onPick={noop} />);
  export const fields = (g) => renderToString(<FieldList label={g.label} fields={g.specs.map((sp) => ({ fieldKey: sp.fieldKey, title: sp.cardTitle || sp.fieldKey }))} onBack={noop} onPick={noop} />);
  export const noFields = renderToString(<FieldList label="L" fields={[]} onBack={noop} onPick={noop} />);`);

// Exact markup the string builders made before the port (captured from the old code).
const OLD = JSON.parse(await readFile(new URL('./features/tendencias-render-view.old.json', import.meta.url), 'utf8')).picker;
const norm = (s) => s.replace(/&gt;/g, '>').replace(/ (class|value)(?=[ >])/g, ' $1=""').replace(/&#34;|&quot;/g, '"').replace(/<(path|circle|line)([^>]*)><\/\1>/g, '<$1$2/>');

for (const [name, s] of Object.entries(PICKER)) {
  test(`analyte picker HTML equals the old builders: ${name}`, () => {
    assert.equal(norm(m.sections(s.groups)), norm(OLD[name].sections));
    s.groups.forEach((g, i) => assert.equal(norm(m.fields(g)), norm(OLD[name].fields[i])));
    assert.equal(norm(m.bar(s.extras)), norm(OLD[name].bar));
  });
}
test('analyte picker field list with no match keeps the back button and the note', () => {
  assert.match(m.noFields, /tend-analyte-picker-back.*Sin analitos que coincidan/);
});
