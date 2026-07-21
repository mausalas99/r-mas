import test from 'node:test';
import assert from 'node:assert/strict';
import {
  candidatesToDraftRows,
  draftRowsToPanelDef,
  previewLinesFromDraft,
  suggestKeyFromLabel,
} from './labs-panel-teach-model.mjs';
import { parsePanelDef_ } from './labs-panel-parse.mjs';

test('suggestKeyFromLabel', () => {
  assert.equal(suggestKeyFromLabel('T4 LIBRE'), 'T4L');
  assert.equal(suggestKeyFromLabel('HEMOGLOBINA GLICOSILADA'), 'HbA1c');
});

test('draftRowsToPanelDef + parsePanelDef_ preview', () => {
  var rows = [{
    included: true,
    label: 'MARCADOR RARO',
    key: 'Rare',
    value: '12',
    min: 0,
    max: 5,
    mode: 'num',
  }];
  var def = draftRowsToPanelDef(rows, { sectionKey: 'CUST', mode: 'num', gates: ['MARCADOR RARO'] });
  var texto =
    'MARCADOR RARO\nEstudio\t\tResultado\tUnidades\tValor de Referencia\nMARCADOR RARO\t\n*\n12\nng/mL\t0 - 5\n';
  var line = parsePanelDef_(def, texto);
  assert.match(line, /^CUST\t/);
  assert.match(line, /\bRare 12\*/);
  assert.deepEqual(previewLinesFromDraft(rows, { sectionKey: 'CUST', mode: 'num' }, texto), [line]);
});

test('candidatesToDraftRows maps residual candidates', () => {
  var rows = candidatesToDraftRows([
    { id: 'r0', label: 'MARCADOR RARO', value: '12', min: 0, max: 5, selected: true },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].included, true);
  assert.equal(rows[0].label, 'MARCADOR RARO');
  assert.equal(rows[0].key, suggestKeyFromLabel('MARCADOR RARO'));
});
