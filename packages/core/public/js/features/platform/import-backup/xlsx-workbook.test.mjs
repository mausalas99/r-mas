import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { buildWorkbook, colName } from './xlsx-workbook.mjs';

test('colName: A..Z then AA', () => {
  assert.equal(colName(0), 'A');
  assert.equal(colName(25), 'Z');
  assert.equal(colName(26), 'AA');
});

test('workbook: sheets, frozen header, filter, numbers kept, text escaped', async () => {
  const bytes = await buildWorkbook([
    {
      name: 'Labs & más',
      columns: [
        { header: 'Paciente', width: 12 },
        { header: 'Valor', width: 10 },
      ],
      rows: [
        ['Ana <x>', 3.5],
        ['Luis', ''],
      ],
    },
  ]);
  const zip = await JSZip.loadAsync(bytes);
  const wb = await zip.file('xl/workbook.xml').async('string');
  const sheet = await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(wb, /<sheet name="Labs &amp; más" sheetId="1" r:id="rId1"\/>/);
  assert.match(wb, /_xlnm\._FilterDatabase" localSheetId="0" hidden="1">'Labs &amp; más'!\$A\$1:\$B\$3/);
  assert.match(sheet, /state="frozen"/);
  assert.match(sheet, /<autoFilter ref="A1:B3"\/>/);
  assert.match(sheet, /<c r="A2" s="0" t="inlineStr"><is><t xml:space="preserve">Ana &lt;x&gt;<\/t>/);
  assert.match(sheet, /<c r="B2" s="0"><v>3.5<\/v><\/c>/);
  assert.doesNotMatch(sheet, /<c r="B3"/);
  assert.ok(zip.file('xl/styles.xml'));
});
