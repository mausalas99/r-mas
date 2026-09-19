const test = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');
const {
  fillRecetaHuPdf,
  formatMedicationsBlock,
  formatLabList,
  splitToFieldLines,
  landscapeToPortrait,
  pdfSafeLine,
} = require('./generate-receta-hu.js');

test('landscapeToPortrait mapea vista rotada 90° CW al portrait del PDF', () => {
  assert.deepEqual(landscapeToPortrait(48, 468), { x: 612 - 468, y: 48 });
  assert.deepEqual(landscapeToPortrait(0, 0), { x: 612, y: 0 });
});

test('pdfSafeLine elimina saltos y controles', () => {
  assert.equal(pdfSafeLine('a\nb\tc'), 'a b c');
});

test('formatMedicationsBlock une filas legibles', () => {
  assert.equal(
    formatMedicationsBlock([{ medicamento: 'A', presentacion: 'tab', dosis: '1' }]),
    'A  ·  tab  ·  1'
  );
  assert.equal(formatMedicationsBlock([{ medicamento: '', presentacion: '', dosis: '' }]), '');
});

test('formatLabList y splitToFieldLines', () => {
  assert.equal(formatLabList([' QS ', '', 'PFH']), 'QS\nPFH');
  assert.deepEqual(splitToFieldLines('a\nb\nc', 2), ['a', 'b c']);
});

test('fillRecetaHuPdf produce 2 páginas sobre plantilla oficial dual', async () => {
  const buf = await fillRecetaHuPdf(
    {
      patient: { nombre: 'Ana López', registro: '999', servicio: 'Nefrología' },
      fecha: '27/07/2026',
      meds: [{ medicamento: 'Losartán', presentacion: 'tab 50 mg', dosis: '1 VO c/24h' }],
      labs: ['Creatinina'],
      cuidados: 'Dieta hiposódica',
      proximaCita: 'Acudir en 2 semanas a consulta de Nefrología',
      proximaCitaFecha: '10/08/2026',
      doctorName: 'Dra. Prueba',
      cedulaProfesional: '112233',
    },
    __dirname
  );
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 1000);
  const pdf = await PDFDocument.load(buf);
  assert.equal(pdf.getPageCount(), 2);
  // Plantilla oficial sin AcroForm: el llenado es por drawText.
  assert.equal(pdf.getForm().getFields().length, 0);
});
