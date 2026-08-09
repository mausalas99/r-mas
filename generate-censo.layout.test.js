const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const {
  renderCensusPdf,
  layoutRows,
  measureRowLineCount,
  pageTableMetrics,
  tableLayout,
  wrapLabsCellLines,
  wrapPlainCellLines,
  wrapPacienteCellLines,
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

  var longMeasure = measureRowLineCount(font, fontBold, longLabs, layoutCols);
  var shortMeasure = measureRowLineCount(font, fontBold, shortLabs, layoutCols);
  assert.ok(longMeasure.lineCount > shortMeasure.lineCount);

  var pageLayouts = layoutRows([shortLabs, longLabs], font, fontBold, layoutCols);
  assert.ok(pageLayouts[0].heights[1] > pageLayouts[0].heights[0]);

  var availH = pageTableMetrics().availH;
  var used = pageLayouts[0].heights.reduce(function (s, h) {
    return s + h;
  }, 0);
  assert.ok(used <= availH + 1);
});

test('labs anchos se envuelven sin elipsis', async () => {
  var pdfDoc = await PDFDocument.create();
  var font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  var fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  var innerW = 90;
  var longPanel =
    'BH · Hb 5.8* Hto 18* Leu 4200 Neu 85% Linf 10% Plt 180000 Glu 145 Cr 1.2 BUN 45 Na 138 K 4.2 Cl 102 Ca 8.5';
  var lines = wrapLabsCellLines(font, fontBold, longPanel, innerW, 0);
  assert.ok(lines.length > 1);
  lines.forEach(function (ln) {
    assert.doesNotMatch(ln, /…$/);
    assert.ok(fontBold.widthOfTextAtSize(ln, 7.25) <= innerW + 0.5);
  });
});

test('pendientes largos se envuelven sin elipsis', async () => {
  var pdfDoc = await PDFDocument.create();
  var font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  var innerW = 70;
  var longPend =
    'Solicitar resonancia magnética de abdomen con contraste y valoración por gastroenterología';
  var lines = wrapPlainCellLines(font, longPend, innerW, 0, 8.25);
  assert.ok(lines.length > 1);
  lines.forEach(function (ln) {
    assert.doesNotMatch(ln, /…$/);
    assert.ok(font.widthOfTextAtSize(ln, 8.25) <= innerW + 0.5);
  });
});

function makeGuardiaRow(n, overrides) {
  var base = {
    num: String(n),
    cama: '21' + n + '-' + n,
    pacienteNombre: 'PACIENTE LARGO NOMBRE ' + n,
    pacienteMeta: '1234567-' + n + '\n40 años',
    dx: 'DIAGNOSTICO PRINCIPAL + SECUNDARIO EN ESTUDIO',
    meds: 'ATORVASTATINA\nLOSARTAN\nONDANSETRON',
    labs:
      '09/08/2026\n' +
      'BH Hb 7.92* Hto 26.5* VCM 79* HCM 23.8* Leu 5.44 Neu 4.29 Eos 0.335 Plt 240\n' +
      'BH ext Eri 3.33* CHCM 29.9* RDW 19.4* VPM 7.8 Lin# 0.34 Mono# 0.423 Baso# 0.051\n' +
      'QS Glu 141* Cr 0.7 eTFG 91 BUN 15 AU 8.4* COL 78* TGL 197*\n' +
      'ESC Na 135 Cl 103 K 4 Ca 8.6 F 3.6\n' +
      'PFHs Alb 2.9* AST 12* ALT 8 FA 55 Prot 4.8* BT 0.4 BD 0.1 BI 0.3 LDH 112 Amil 15*',
    signosCol: 'T°: 36.5 °C\nFC: 61 LPM\nFR: 17 RPM\nTA: 115/70 MMHG\nSAT: 98% AL AIRE AMBIENTE',
    ioCol: 'I: 980 CC\nE: NO CUANTIFICADA\nB: +190 CC\nEVAC: 2',
    accesos: '',
    cultivos: '',
    pendientes: '',
  };
  return Object.assign(base, overrides || {});
}

test('4 pacientes densos caben en una página sin columnas vacías', async () => {
  var rows = [
    makeGuardiaRow(1, {
      pacienteNombre: 'MANUEL VAZQUEZ REYNA',
      pacienteMeta: '1963670-6\n83 años',
    }),
    makeGuardiaRow(2, {
      pacienteNombre: 'FRANCISCO SEBASTIAN RUIZ AVILA',
      pacienteMeta: '2169877-0\n33 años',
      labs:
        makeGuardiaRow(2).labs +
        '\nGASES pH 7.36 pCO2 35* pO2 51* Lactato 0.6 Bica 19.8* AG 8.3 AGc 12.8* Delta-Delta 0.2',
    }),
    makeGuardiaRow(3, {
      pacienteNombre: 'FABIOLA MARISOL CASTAÑEDA GARAY',
      pacienteMeta: '2227949-0\n29 años',
    }),
    makeGuardiaRow(4, {
      pacienteNombre: 'VERONICA HERNANDEZ HILARIA',
      pacienteMeta: '2232113-5\n48 años',
      labs:
        makeGuardiaRow(4).labs +
        '\nGASES pH 7.36 pCO2 22* pO2 57* Lactato 0.5 Bica 12.4* AG 17.1* AGc 22.3* Delta-Delta 0.9',
    }),
  ];

  var pdfDoc = await PDFDocument.create();
  var font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  var fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  var layout = tableLayout(rows);
  assert.equal(
    layout.cols.some(function (c) {
      return c.key === 'accesos';
    }),
    false
  );

  var pages = layoutRows(rows, font, fontBold, layout);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].rows.length, 4);

  var buf = await renderCensusPdf({
    header: { mes: 'AGOSTO 2026', fecha: '09/08/2026', servicio: 'MI' },
    rows: rows,
  });
  var doc = await PDFDocument.load(buf);
  assert.equal(doc.getPageCount(), 1);
});

test('nombre de paciente se envuelve sin elipsis', async () => {
  var pdfDoc = await PDFDocument.create();
  var font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  var fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  var innerW = 90;
  var lines = wrapPacienteCellLines(
    font,
    fontBold,
    'FRANCISCO SEBASTIAN RUIZ AVILA\n2169877-0\n33 años',
    innerW,
    0
  );
  assert.ok(lines.length >= 2);
  assert.match(lines.join(' '), /FRANCISCO SEBASTIAN RUIZ AVILA/);
  lines.forEach(function (ln) {
    assert.doesNotMatch(ln, /…$/);
  });
});
