import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTableTsv, columnExportHeader } from './tend-export.mjs';

test('columnExportHeader puts event tags above the date text', () => {
  assert.equal(columnExportHeader({ header: '18/08' }), '18/08');
  assert.equal(
    columnExportHeader({
      header: '18/08 05:05',
      eventTags: [
        { text: '4 Plaq', kind: 'transfusion' },
        { text: '2 Plas', kind: 'transfusion' },
      ],
    }),
    '18/08 05:05 [4 Plaq · 2 Plas]'
  );
});

test('copied TSV date headers include event tags', () => {
  const tsv = buildTableTsv({
    columns: [
      {
        header: '16/08',
        eventTags: [{ text: '1 CE', kind: 'transfusion' }],
      },
      { header: '19/08' },
    ],
    rows: [{ label: 'Hb', cells: [{ text: '6.5*' }, { text: '7.1' }] }],
  });
  assert.match(tsv, /16\/08 \[1 CE\]/);
  assert.match(tsv, /19\/08/);
  assert.doesNotMatch(tsv, /19\/08 \[/);
});
