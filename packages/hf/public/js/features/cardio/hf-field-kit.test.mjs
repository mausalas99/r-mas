import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  triSelect,
  enumSelect,
  narrativeTextarea,
  prevActualTable,
  normalizeComorbilidadRows,
  addComorbilidadRow,
  removeComorbilidadRow,
  updateComorbilidadField,
  comorbilidadListHtml,
  normalizeMedicamentoPrevioRows,
  addMedicamentoPrevioRow,
  removeMedicamentoPrevioRow,
  updateMedicamentoPrevioField,
  medicamentoPrevioListHtml,
} from './hf-field-kit.mjs';

var FENOTIPOS = [
  { value: 'HFrEF', label: 'HFrEF (FEVI ≤40%)' },
  { value: 'HFpEF', label: 'HFpEF (FEVI ≥50%)' },
];

test('triSelect renders Sí/No/— options and selects the current value', () => {
  var html = triSelect('ea-cardio-pocus', 'pvy', true);
  assert.match(html, /data-ea-cardio-pocus="pvy"/);
  assert.match(html, /<option value="true" selected>Sí<\/option>/);
  assert.doesNotMatch(html, /<option value="false" selected>/);

  var htmlFalse = triSelect('ea-cardio-pocus', 'pvy', false);
  assert.match(htmlFalse, /<option value="false" selected>No<\/option>/);

  var htmlNull = triSelect('ea-cardio-pocus', 'pvy', null);
  assert.match(htmlNull, /<option value="" selected>—<\/option>/);
});

test('enumSelect selects a matching option with no "(valor previo)" fallback', () => {
  var html = enumSelect('ea-cardio', 'fenotipo', 'HFrEF', FENOTIPOS);
  assert.match(html, /data-ea-cardio="fenotipo"/);
  assert.match(html, /<option value="HFrEF" selected>HFrEF \(FEVI ≤40%\)<\/option>/);
  assert.doesNotMatch(html, /valor previo/);
});

test('enumSelect with no value selects the placeholder and adds no fallback', () => {
  var html = enumSelect('ea-cardio', 'fenotipo', '', FENOTIPOS);
  assert.match(html, /<option value="">—<\/option>/);
  assert.doesNotMatch(html, /valor previo/);
  FENOTIPOS.forEach(function (o) {
    assert.doesNotMatch(html, new RegExp('value="' + o.value + '" selected'));
  });
});

test('enumSelect with a legacy value not in the option list appends a "(valor previo)" fallback', () => {
  var html = enumSelect('ea-cardio', 'fenotipo', 'IC sistólica leve', FENOTIPOS);
  assert.match(html, /<option value="IC sistólica leve" selected>IC sistólica leve \(valor previo\)<\/option>/);
  // the placeholder must not also be selected
  assert.doesNotMatch(html, /<option value="" selected>/);
  // real options must not be selected either
  assert.doesNotMatch(html, /value="HFrEF" selected/);
});

test('enumSelect escapes a legacy value used in the fallback option', () => {
  var html = enumSelect('ea-cardio', 'fenotipo', '<script>x</script>', FENOTIPOS);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('narrativeTextarea renders a large textarea with the hf-narrative class and label', () => {
  var html = narrativeTextarea('ea-cardio-pocus', 'note', 'Estertores bibasales', 'Nota');
  assert.match(html, /class="ea-input hf-narrative"/);
  assert.match(html, /rows="5"/);
  assert.match(html, /data-ea-cardio-pocus="note"/);
  assert.match(html, />Estertores bibasales<\/textarea>/);
  assert.match(html, /<span class="ea-label">Nota<\/span>/);
});

test('narrativeTextarea escapes its content', () => {
  var html = narrativeTextarea('ea-cardio-pocus', 'note', '<b>x</b>', 'Nota');
  assert.doesNotMatch(html, /<b>x<\/b>/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
});

test('prevActualTable renders — for missing values and includes units', () => {
  var rowsDef = [
    { key: 'bnp', label: 'NT-proBNP', unit: 'pg/mL' },
    { key: 'creatinina', label: 'Creatinina', unit: 'mg/dL' },
  ];
  var html = prevActualTable(rowsDef, { bnp: 4200 }, { bnp: 900, creatinina: 1.1 });
  assert.match(html, /NT-proBNP/);
  assert.match(html, /4200 pg\/mL/);
  assert.match(html, /900 pg\/mL/);
  assert.match(html, /1\.1 mg\/dL/);
  // creatinina previo is missing
  var creatininaRow = html.split('Creatinina')[1];
  assert.match(creatininaRow, /^<\/td><td class="hf-prev-actual-val">—<\/td>/);
});

test('prevActualTable handles null previo/actual', () => {
  var html = prevActualTable([{ key: 'bnp', label: 'NT-proBNP' }], null, null);
  assert.match(html, /<td class="hf-prev-actual-val">—<\/td>/);
});

test('comorbilidad row helpers: add/remove/update by id', () => {
  var rows = addComorbilidadRow(undefined);
  assert.equal(rows.length, 1);
  var id = rows[0].id;
  assert.ok(id);

  rows = updateComorbilidadField(rows, id, 'value', 'DM2');
  assert.equal(rows[0].value, 'DM2');

  rows = addComorbilidadRow(rows);
  assert.equal(rows.length, 2);

  rows = removeComorbilidadRow(rows, id);
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].id, id);
});

test('normalizeComorbilidadRows drops non-object entries and backfills ids', () => {
  var rows = normalizeComorbilidadRows([{ value: 'HTA' }, null, 'garbage', { value: 'ERC', otra: '' }]);
  assert.equal(rows.length, 2);
  rows.forEach(function (r) {
    assert.ok(r.id);
  });
});

test('comorbilidadListHtml shows an empty state and an add button', () => {
  var html = comorbilidadListHtml([], []);
  assert.match(html, /Sin comorbilidades registradas/);
  assert.match(html, /data-hf-comorb-action="add"/);
});

test('comorbilidadListHtml renders one row per entry with field/id data attrs', () => {
  var rows = [{ id: 'a1', value: 'DM2', otra: '' }];
  var html = comorbilidadListHtml(rows, [{ value: 'DM2', label: 'DM2' }]);
  assert.match(html, /data-hf-comorb-row="a1"/);
  assert.match(html, /data-hf-comorb-field="value" data-hf-comorb-id="a1"/);
  assert.match(html, /data-hf-comorb-field="otra" data-hf-comorb-id="a1"/);
  assert.match(html, /data-hf-comorb-action="remove" data-hf-comorb-id="a1"/);
});

test('medicamento previo row helpers: add/remove/update by id', () => {
  var rows = addMedicamentoPrevioRow(undefined);
  assert.equal(rows.length, 1);
  var id = rows[0].id;

  rows = updateMedicamentoPrevioField(rows, id, 'medicamento', 'Enalapril');
  rows = updateMedicamentoPrevioField(rows, id, 'dosis', '10 mg BID');
  assert.equal(rows[0].medicamento, 'Enalapril');
  assert.equal(rows[0].dosis, '10 mg BID');

  rows = removeMedicamentoPrevioRow(rows, id);
  assert.equal(rows.length, 0);
});

test('normalizeMedicamentoPrevioRows drops non-object entries', () => {
  var rows = normalizeMedicamentoPrevioRows([{ medicamento: 'X' }, undefined, 42]);
  assert.equal(rows.length, 1);
});

test('medicamentoPrevioListHtml shows an empty state and an add button', () => {
  var html = medicamentoPrevioListHtml(undefined);
  assert.match(html, /Sin medicamentos previos registrados/);
  assert.match(html, /data-hf-medprevio-action="add"/);
});
