import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  censoFileName,
  censoDateStamp,
  listCensoFilesForDate,
  writeCensoPdfForToday,
} from './censo-export-file.mjs';

test('censoFileName — servicio y fecha del día', () => {
  var d = new Date(2026, 5, 3, 15, 30);
  assert.equal(censoFileName('ONCO', d), 'Censo_ONCO_2026-06-03.pdf');
  assert.equal(censoDateStamp(d), '2026-06-03');
});

test('writeCensoPdfForToday — sobreescribe censos del mismo día', () => {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'censo-export-'));
  var d = new Date(2026, 5, 3);
  try {
    var oldName = 'Censo_GUARDIA_2026-06-03.pdf';
    fs.writeFileSync(path.join(dir, oldName), Buffer.from('old'));
    fs.writeFileSync(path.join(dir, 'Censo_TORRE_2026-06-03.pdf'), Buffer.from('old2'));
    fs.writeFileSync(path.join(dir, 'Censo_GUARDIA_2026-06-02.pdf'), Buffer.from('yesterday'));
    fs.writeFileSync(path.join(dir, 'Nota_Evolucion_X.docx'), Buffer.from('other'));

    var out = writeCensoPdfForToday(dir, censoFileName('ONCO', d), Buffer.from('new'), d);
    assert.equal(out.replaced, true);
    assert.deepEqual(out.removedFiles.sort(), ['Censo_GUARDIA_2026-06-03.pdf', 'Censo_TORRE_2026-06-03.pdf'].sort());
    assert.equal(fs.readFileSync(path.join(dir, 'Censo_ONCO_2026-06-03.pdf'), 'utf8'), 'new');
    assert.equal(fs.existsSync(path.join(dir, oldName)), false);
    assert.equal(fs.existsSync(path.join(dir, 'Censo_GUARDIA_2026-06-02.pdf')), true);
    assert.equal(listCensoFilesForDate(dir, '2026-06-03').length, 1);
    assert.equal(listCensoFilesForDate(dir, '2026-06-03')[0], 'Censo_ONCO_2026-06-03.pdf');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
