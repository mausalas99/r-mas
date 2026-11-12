import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';
import { rt } from './patients-runtime-state.mjs';
import { homeModel, railItems } from './sala-view-variants.mjs';
import { SALA_SCENARIOS, SALA_ACTIVE_ID } from './sala-view-variants-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { SalaHome, SalaRail } from './sala-view-variants-view.jsx';
  export const home = (m) => renderToString(<SalaHome model={m} />);
  export const rail = (items) => renderToString(<SalaRail items={items} />);`);

// Markup the string builders wrote before the port, captured on the same scenarios.
const OLD = createRequire(import.meta.url)('./sala-view-variants-old-html.json');

rt.getActiveId = () => SALA_ACTIVE_ID;

// Old markup quoted data-onclick-args with ' and used an inline onclick; the port uses the data-onclick hook.
const oldNorm = (h) => h.replace(/data-onclick-args='([^']*)'/g, 'data-onclick-args="$1"')
  .replace(/ onclick="openAddModal\(\)"/g, ' data-onclick="openAddModal"')
  // old innerHTML text kept an inner quote as-is; both parse the same
  .replace(/<(rect|path)([^>]*?)><\/\1>/g, '<$1$2/>');
const newNorm = (h) => h.replace(/<(rect|path)([^>]*?)><\/\1>/g, '<$1$2/>');

for (const [name, s] of Object.entries(SALA_SCENARIOS)) {
  test(`sala ${name} equals the old HTML (home and rail)`, () => {
    const shown = s.archView ? s.archived : s.list;
    sameHtml(newNorm(view.home(homeModel(s.list, s.archived, shown, s.archView))), oldNorm(OLD[name].home), name + ' home');
    sameHtml(newNorm(view.rail(railItems(s.list))), oldNorm(OLD[name].rail), name + ' rail');
  });
}

test('names and diagnoses are escaped, never parsed as markup', () => {
  const s = SALA_SCENARIOS.mixed;
  const html = view.home(homeModel(s.list, s.archived, s.list, false));
  assert.doesNotMatch(html, /<GRAVE>/);
  assert.match(html, /NEUMONIA &lt;GRAVE>/);
});
