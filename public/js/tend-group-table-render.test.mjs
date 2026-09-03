import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tableHiddenRowClass,
  tableColumnHeader,
  rowKey,
  createTableExportModel,
} from './tend-group-table-render.mjs';

test('hidden rows use the same is-hidden class as columns', () => {
  assert.equal(tableHiddenRowClass(true), 'is-hidden');
  assert.equal(tableHiddenRowClass(false), '');
});

test('table date headers omit lab-draw time', () => {
  const cols = [
    { fecha: '18/08/2026', hora: '05:05' },
    { fecha: '18/08/2026', hora: '17:02' },
  ];
  assert.equal(tableColumnHeader(cols[0], cols), '18/08/2026');
  assert.equal(tableColumnHeader(cols[1], cols), '18/08/2026');
});

test('rowKey namespaces by section so cross-section homonyms cannot collide', () => {
  const bhRow = { sectionKey: 'BH', fieldKey: 'Fib' };
  const qsRow = { sectionKey: 'QS', fieldKey: 'Fib' };
  assert.notEqual(rowKey(bhRow), rowKey(qsRow));
  assert.equal(rowKey(bhRow), 'BH|Fib');
});

test('LCR export/copy model appends a per-day interpretation row from resLabs', () => {
  const rawModel = {
    columns: [
      {
        fecha: '03/08/2026',
        hora: '10:00',
        resLabs: ['INTERPRETACIÓN CITOQUÍMICO:\tSugestivo de meningitis viral'],
      },
      { fecha: '06/08/2026', hora: '11:00', resLabs: ['LCR\npH 9'] },
    ],
    rows: [],
  };
  const model = createTableExportModel(
    {},
    { sectionKey: 'LCR', historyDesc: [] },
    'LCR',
    rawModel,
    { rows: [], cols: [] },
    null
  );
  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].label, 'Interpretación');
  assert.equal(model.rows[0].cells[0].text, 'Sugestivo de meningitis viral');
  assert.equal(model.rows[0].cells[1].text, '—');
});

test('non-LCR sections skip the interpretation row', () => {
  const rawModel = { columns: [{ fecha: '03/08/2026', resLabs: [] }], rows: [] };
  const model = createTableExportModel(
    {},
    { sectionKey: 'QS', historyDesc: [] },
    'QS',
    rawModel,
    { rows: [], cols: [] },
    null
  );
  assert.equal(model.rows.length, 0);
});
