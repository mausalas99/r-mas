const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const {
  renderCensusPdf,
  layoutRows,
  measureRowLineCount,
  pageTableMetrics,
} = require('./generate-censo.js');

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

test('labs largos aumentan altura de fila sin truncar líneas', async () => {
  var pdfDoc = await PDFDocument.create();
  var font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  var fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  var layoutCols = {
    cols: [
      { key: 'num', w: 30 },
      { key: 'cama', w: 40 },
      { key: 'paciente', w: 90 },
      { key: 'dx', w: 80 },
      { key: 'meds', w: 80 },
      { key: 'labs', w: 200 },
      { key: 'accesos', w: 50 },
      { key: 'cultivos', w: 80 },
      { key: 'pend', w: 120 },
    ],
  };
  var shortLabs = makeRow(1);
  var longLabs = makeRow(2);
  longLabs.labs = Array.from({ length: 22 }, function (_, i) {
    return '29/05/2026 BH Hb ' + (5 + i * 0.1).toFixed(1) + '* Hto ' + (18 + i) + '*';
  }).join('\n');

  var longLines = measureRowLineCount(font, fontBold, longLabs, layoutCols);
  var shortLines = measureRowLineCount(font, fontBold, shortLabs, layoutCols);
  assert.ok(longLines > shortLines);

  var pageLayouts = layoutRows([shortLabs, longLabs], font, fontBold, layoutCols);
  assert.ok(pageLayouts[0].heights[1] > pageLayouts[0].heights[0]);

  var availH = pageTableMetrics().availH;
  var used = pageLayouts[0].heights.reduce(function (s, h) {
    return s + h;
  }, 0);
  assert.ok(used <= availH + 1);
});
