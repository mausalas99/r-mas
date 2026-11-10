import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { emptyVpoState } from '../vpo-data.mjs';
import { autofillCalc } from '../vpo-calc.mjs';

const loadRender = () => loadJsx(import.meta.url, `import { CalcForm } from './vpo-calc-form.jsx';
  export { vpoScaleTab } from './vpo-ui-state.mjs';
  export const render = (state) => renderToString(<CalcForm state={state} />);`);

test('form renders every input and shows autofilled flags as checked', async () => {
  const { render } = await loadRender();
  const s = emptyVpoState();
  s.diagnosticosList = ['EPOC', 'CARDIOPATIA ISQUEMICA CON STENT'];
  autofillCalc(s, {});
  const html = render(s);
  assert.match(html, /data-vpo-field="procedureId"/);
  assert.match(html, /<option value="gupta-foregut-hpb">/);
  assert.match(html, /data-vpo-calc="copd" checked/);
  assert.match(html, /data-vpo-calc="modStent" checked/);
  assert.match(html, /data-vpo-action="calc-all"/);
  assert.equal((html.match(/data-vpo-calc="mod/g) || []).length, 7);
});

test('form escapes values and marks the picked option and tab', async () => {
  const { render, vpoScaleTab } = await loadRender();
  const s = emptyVpoState();
  s.edad = '5"><b>';
  s.asaKey = 'asa-iii';
  vpoScaleTab.set('hasbled');
  const html = render(s);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /data-vpo-field="edad" value="5&quot;>&lt;b>"/);
  assert.match(html, /<option value="asa-iii" selected>/);
  assert.match(html, /data-vpo-tab="hasbled" aria-selected="true"/);
  assert.match(html, /data-vpo-tab="stopbang" aria-selected="false"/);
});

test('kit pieces: dialog title row, text button and filled button keep the app classes', async () => {
  const { render } = await loadRender();
  const html = render(emptyVpoState());
  assert.match(html, /<dialog class="vpo-dialog vpo-dialog--wide" aria-label="Otras escalas" data-kit-dialog="true"/);
  assert.match(html, /<button type="button" class="ea-io-link" data-vpo-close="true">Cerrar<\/button>/);
  assert.match(html, /<button type="button" class="wb-btn wb-btn-primary" data-vpo-action="calc-all">Calcular todo<\/button>/);
  assert.match(html, /data-vpo-dialog="scales"/);
});
