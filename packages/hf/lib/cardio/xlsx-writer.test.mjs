import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { buildXlsxWorkbook } from './xlsx-writer.mjs';

test('buildXlsxWorkbook produces a valid multi-sheet OOXML zip', async () => {
  const bytes = await buildXlsxWorkbook([
    { name: 'Pacientes', headers: ['Nombre', 'Edad'], rows: [['Ana', '42'], ['Luis, Jr']] },
    { name: 'Visitas', headers: ['Fecha'], rows: [['2026-01-01']] },
  ]);
  const zip = await JSZip.loadAsync(bytes);
  assert.ok(zip.file('xl/workbook.xml'));
  assert.ok(zip.file('xl/worksheets/sheet1.xml'));
  assert.ok(zip.file('xl/worksheets/sheet2.xml'));

  const sheet1 = await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.match(sheet1, /<is><t xml:space="preserve">Nombre<\/t><\/is>/);
  assert.match(sheet1, /<v>42<\/v>/, 'numeric-looking cells should be written as numbers');
  assert.match(sheet1, /Luis, Jr/, 'commas in cell text must not need CSV-style escaping');

  const workbook = await zip.file('xl/workbook.xml').async('string');
  assert.match(workbook, /name="Pacientes"/);
  assert.match(workbook, /name="Visitas"/);
});
