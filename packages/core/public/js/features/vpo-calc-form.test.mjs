import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyVpoState } from '../vpo-data.mjs';
import { autofillCalc } from '../vpo-calc.mjs';
import { renderCalcInputsHtml } from './vpo-calc-form.mjs';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

test('form renders every input and shows autofilled flags as checked', () => {
  const s = emptyVpoState();
  s.diagnosticosList = ['EPOC', 'CARDIOPATIA ISQUEMICA CON STENT'];
  autofillCalc(s, {});
  const html = renderCalcInputsHtml(s, esc);
  assert.match(html, /data-vpo-field="procedureId"/);
  assert.match(html, /<option value="gupta-foregut-hpb">/);
  assert.match(html, /data-vpo-calc="copd" checked/);
  assert.match(html, /data-vpo-calc="modStent" checked/);
  assert.match(html, /data-vpo-action="calc-all"/);
  assert.equal((html.match(/data-vpo-calc="mod/g) || []).length, 7);
});
