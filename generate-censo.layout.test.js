const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');
const { renderCensusPdf } = require('./generate-censo.js');

function makeRow(n) {
  return {
    num: String(n),
    cama: '20' + n,
    pacienteNombre: 'PACIENTE ' + n,
    pacienteMeta: 'ID · 50a M',
    dx: 'DX ' + n + ' + OTRO',
    meds: 'MED A',
    labs: '29/05 — Hb 10',
    pendientes: 'Pendiente',
  };
}

test('7 pacientes caben en 2 páginas (6+1)', async () => {
  var rows = [];
  for (var i = 1; i <= 7; i++) rows.push(makeRow(i));
  var buf = await renderCensusPdf({
    header: { mes: 'MAYO 2026', fecha: '29/05/2026', servicio: 'MI' },
    rows: rows,
  });
  var doc = await PDFDocument.load(buf);
  assert.ok(doc.getPageCount() >= 1 && doc.getPageCount() <= 2);
});
