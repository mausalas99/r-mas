import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIcSugerencias,
  looksLikeIcSugerenciasPaste,
  applyIcSugerenciasToIndica,
  indicaDocHasContent,
} from './ic-sugerencias-parse.mjs';
import { planSmartPaste, looksLikeSmartPasteCandidate } from './features/paste-smart-model.mjs';

// Synthetic example (fake values), same layout as the IC «SUGERENCIAS» note.
var SAMPLE = [
  'SUGERENCIAS POR MEDICINA INTERNA',
  '01/02/2030',
  'DIETA',
  '',
  '1. INICIAR DIETA BLANDA DE 1500 KCAL CON 60 G DE PROTEINA. ',
  '',
  'PLAN DE LÍQUIDOS',
  '',
  '1. SIN CAMBIOS EN EL MANEJO ACTUAL',
  '',
  'CUIDADOS:',
  '',
  '1. CUANTIFICAR DIURESIS DE 24 HORAS.',
  '2. GLUCOMETRÍAS CAPILARES CADA 8 HORAS.',
  '',
  'MEDICAMENTOS:',
  '',
  '1. AJUSTAR INSULINA GLARGINA A 8 UI SC CADA 24 HORAS.',
  '2. CONTINUAR PARACETAMOL 500 MG VO CADA 8 HORAS',
  '',
  'RESTO DE INDICACIONES SIN CAMBIOS POR PARTE DEL SERVICIO TRATANTE.',
  'LABORATORIOS:',
  '',
  '1. ELECTROLITOS SÉRICOS DE CONTROL EN AM.',
  '',
  'IMAGEN:',
  '',
  '1. SIN CAMBIOS',
  '',
  'RECOMENDACIONES:',
  '',
  '1. AVISAR ANTE GLUCOSA MENOR DE 70 MG/DL.',
  '2. INTERCONSULTA SUGERIDA A NEFROLOGÍA.',
].join('\n');

test('parse: title, date, fixed boxes and own-title sections', function () {
  var p = parseIcSugerencias(SAMPLE);
  assert.equal(p.descripcion, 'SUGERENCIAS POR MEDICINA INTERNA');
  assert.equal(p.fecha, '01/02/2030');
  assert.equal(p.fields.dieta, 'INICIAR DIETA BLANDA DE 1500 KCAL CON 60 G DE PROTEINA.');
  assert.equal(p.fields.cuidados, 'CUANTIFICAR DIURESIS DE 24 HORAS.\nGLUCOMETRÍAS CAPILARES CADA 8 HORAS.');
  assert.equal(
    p.fields.medicamentos,
    'AJUSTAR INSULINA GLARGINA A 8 UI SC CADA 24 HORAS.\nCONTINUAR PARACETAMOL 500 MG VO CADA 8 HORAS\n' +
      'RESTO DE INDICACIONES SIN CAMBIOS POR PARTE DEL SERVICIO TRATANTE.'
  );
  assert.equal(p.fields.estudios, 'ELECTROLITOS SÉRICOS DE CONTROL EN AM.');
  assert.deepEqual(p.otros, [
    { titulo: 'PLAN DE LÍQUIDOS', contenido: 'SIN CAMBIOS EN EL MANEJO ACTUAL' },
    { titulo: 'IMAGEN', contenido: 'SIN CAMBIOS' },
    { titulo: 'RECOMENDACIONES', contenido: 'AVISAR ANTE GLUCOSA MENOR DE 70 MG/DL.\nINTERCONSULTA SUGERIDA A NEFROLOGÍA.' },
  ]);
});

test('detect: IC paste yes; plain note and SOME lab text no', function () {
  assert.equal(looksLikeIcSugerenciasPaste(SAMPLE), true);
  assert.equal(looksLikeIcSugerenciasPaste('PACIENTE ESTABLE.\nDIETA\n1. NORMAL'), false);
  assert.equal(looksLikeIcSugerenciasPaste('Expediente:\nNombre: PRUEBA\nQUIMICA SANGUINEA'), false);
  assert.equal(looksLikeIcSugerenciasPaste('DIETA\n1. A\nCUIDADOS\n1. B\nMEDICAMENTOS\n1. C'), true);
});

test('paste anywhere routes the IC paste to ic-sugerencias', function () {
  assert.equal(looksLikeSmartPasteCandidate(SAMPLE), true);
  assert.equal(planSmartPaste(SAMPLE, { patients: [] }).kind, 'ic-sugerencias');
});

test('apply replace clears old sections; append keeps them', function () {
  var p = parseIcSugerencias(SAMPLE);
  var old = { dieta: 'AYUNO', estudios: '', otros: [{ titulo: 'IMAGEN', contenido: 'RX TORAX' }] };
  assert.equal(indicaDocHasContent(old), true);
  assert.equal(indicaDocHasContent({ otros: [] }), false);

  var r = applyIcSugerenciasToIndica(JSON.parse(JSON.stringify(old)), p, 'replace');
  assert.equal(r.dieta, p.fields.dieta);
  assert.equal(r.interconsultas, '');
  assert.equal(r.otros.length, 3);
  assert.equal(r.descripcion, 'SUGERENCIAS POR MEDICINA INTERNA');
  assert.equal(r.fecha, '01/02/2030');

  var a = applyIcSugerenciasToIndica(JSON.parse(JSON.stringify(old)), p, 'append');
  assert.equal(a.dieta, 'AYUNO\n' + p.fields.dieta);
  assert.equal(a.otros[0].contenido, 'RX TORAX\nSIN CAMBIOS');
  assert.equal(a.otros.length, 3);
});
