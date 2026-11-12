import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';
import { buildMedRecetaListModel } from './medications-panel-rows.mjs';
import { MED_SCENARIOS, MED_NOW, MED_PATIENT } from './medications-panel-view-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { MedRecetaList } from './medications-panel-view.jsx';
  export const list = (m) => renderToString(<MedRecetaList model={m} />);`);

// Markup buildMedRecetaListHtml wrote before the port, captured on the same blocks and the same `now`.
const OLD = createRequire(import.meta.url)('./medications-panel-view-old-html.json');

const oldNorm = (h) => h.replace(/data-(onclick|onchange)-args='([^']*)'/g, 'data-$1-args="$2"')
  .replace(/<(path|circle)([^>]*?)><\/\1>/g, '<$1$2/>');
const newNorm = (h) => h.replace(/<(path|circle)([^>]*?)><\/\1>/g, '<$1$2/>');

for (const [name, block] of Object.entries(MED_SCENARIOS)) {
  test(`med list ${name} equals the old HTML`, () => {
    const model = buildMedRecetaListModel(MED_PATIENT, structuredClone(block), MED_NOW);
    sameHtml(newNorm(model ? view.list(model) : ''), oldNorm(OLD[name]), name);
  });
}

test('an empty list gives no model', () => {
  assert.equal(buildMedRecetaListModel(MED_PATIENT, { items: [] }, MED_NOW), null);
});
