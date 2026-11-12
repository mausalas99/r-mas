import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
import { SCENARIOS } from './expediente-listado-view-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { ListadoForm } from './expediente-listado-view.jsx';
  export const form = (props) => renderToString(<ListadoForm {...props} />);`);

// Markup renderListadoForm wrote before the port, captured on the same scenarios.
const OLD = createRequire(import.meta.url)('./expediente-listado-view-old-html.json');

// The old strings wrapped JSON attributes in single quotes; Preact uses double quotes with &quot;. Same DOM.
const canonQuotes = (h) => h.replace(/='([^']*)'/g, (_m, v) => '="' + v.replace(/"/g, '&quot;') + '"');

// Mirrors getMedicosForListado: a non-blank override wins over the profile template.
const medicosOf = (lst, tpl) => {
  const pick = (k) => (lst.medicos?.[k]?.trim() ? lst.medicos[k] : tpl[k] || '');
  return { profesor: pick('profesor'), r4: pick('r4'), r2: pick('r2'), r1a: pick('r1a'), r1b: pick('r1b') };
};

for (const [name, s] of Object.entries(SCENARIOS)) {
  test(`listado form ${name} equals the old HTML`, () => {
    const props = { patient: s.patient, lst: s.lst, medicos: medicosOf(s.lst, s.tpl), hideAiPrompt: s.hideAiPrompt };
    sameHtml(view.form(props).replace(/ ?\/>/g, ">"), canonQuotes(OLD[name]), name); // Preact closes void tags with />
  });
}

test('the AI prompt button follows the profile preference', () => {
  const s = SCENARIOS.full;
  const props = { patient: s.patient, lst: s.lst, medicos: {} };
  assert.match(view.form({ ...props, hideAiPrompt: false }), /copyListadoProblemasAiPrompt/);
  assert.doesNotMatch(view.form({ ...props, hideAiPrompt: true }), /copyListadoProblemasAiPrompt/);
});
