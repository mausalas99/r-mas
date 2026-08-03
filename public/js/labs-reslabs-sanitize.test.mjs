import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeLabSectionChunk,
  sanitizeResLabsChunks,
} from './labs-reslabs-sanitize.mjs';
import { isLikelyLabDataLine } from './lab-history-format.mjs';
import { procesarLabs } from './labs.js';
import { formatLabsForCensoCompact } from './censo-labs-format.mjs';

const LETTERHEAD_COLLAPSED =
  'Sistema SOME UNIVERSIDAD AUTONOMA DE NUEVO LEON MOP-HU-647-07-RC-040 ' +
  'FACULTAD DE MEDICINA Y HOSPITAL UNIVERSITARIO "DR. JOSE ELEUTERIO GONZALEZ" ' +
  'AV. MADERO Y AV. GONZALITOS, COL. MITRAS CENTRO, MONTERREY, N.L. CP. 64460 ' +
  'REPORTE DE RESULTADOS DE LABORATORIO Expediente: 1862133-7 Solicitud: 2606270344 ' +
  'Nombre: JUAN GABRIEL CASTILLO SALAZAR Fecha Registro: Jun 27 2026 5:43AM ' +
  'Sexo: FEMENINO Ubicación: MEDICINA INTERNA 2 Edad: 52 ' +
  'HEMATOLOGIA HGB 7.85 g/dL 12.0 - 16.0 Campo 12234309 Labo -647* DJEG 64460 UANL -647* Feme 1';

const MANGLED_FOOTER =
  'USER Estu 2.53* 89 31 2932 Unid 2.53* UL 11 MD 60 UL 22 ML 98 Campo 12234309 ' +
  'Labo -647* DJEG 64460 1017 24.5* RS -647* UANL -647* Feme 1';

test('solo paneles clínicos son chunks válidos — el membrete no lo es', () => {
  assert.equal(looksLikeLabSectionChunk('BH\tHb 7.85*  Hto 24.5*'), true);
  assert.equal(looksLikeLabSectionChunk('QS\tGlu 145  Cr 1.2'), true);
  assert.equal(looksLikeLabSectionChunk(LETTERHEAD_COLLAPSED), false);
  assert.equal(looksLikeLabSectionChunk(MANGLED_FOOTER), false);
});

test('isLikelyLabDataLine ya no acepta sopa digit+letra ni tabs sueltos', () => {
  assert.equal(isLikelyLabDataLine('BH\tHb 7.85*'), true);
  assert.equal(isLikelyLabDataLine(LETTERHEAD_COLLAPSED), false);
  assert.equal(isLikelyLabDataLine(MANGLED_FOOTER), false);
  assert.equal(isLikelyLabDataLine('Expediente:\t1862133-7\tSolicitud:\t2606270344'), false);
  assert.equal(isLikelyLabDataLine('Hb 7.85* something 12'), false);
});

test('sanitizeResLabsChunks solo conserva paneles; descarta blobs desconocidos', () => {
  var out = sanitizeResLabsChunks([
    'BH\tHb 7.85*  Hto 24.5*',
    LETTERHEAD_COLLAPSED,
    'QS\tGlu 145  Cr 1.2',
    MANGLED_FOOTER,
    '',
  ]);
  assert.deepEqual(out, ['BH\tHb 7.85*  Hto 24.5*', 'QS\tGlu 145  Cr 1.2']);
});

test('sanitizeResLabsChunks recorta chrome pegado al final de un panel', () => {
  var out = sanitizeResLabsChunks([
    'BH\tHb 7.85*  Hto 24.5* Expediente: 1862133-7 Solicitud: 2606270344 Nombre: JUAN',
  ]);
  assert.equal(out.length, 1);
  assert.match(out[0], /^BH\tHb 7\.85\*/);
  assert.doesNotMatch(out[0], /Expediente|Solicitud|Nombre/i);
});

test('sanitizeResLabsChunks preserva bloque cultivo multi-fila', () => {
  var out = sanitizeResLabsChunks([
    'BH\tHb 12',
    'UROCULTIVO 01/06: E. COLI',
    'ATB AMPICILINA R',
    'Cuenta: >100000',
  ]);
  assert.equal(out.length, 4);
  assert.match(out[1], /UROCULTIVO/);
  assert.match(out[2], /^ATB/);
});

test('sanitizeResLabsChunks descarta membrete USER/Labo tras cultivo', () => {
  var out = sanitizeResLabsChunks([
    'UROCULTIVO POR SONDA 20/07: KLEBSIELLA PNEUMONIAE\nCuenta: 80,000 UFC/ML',
    'USER CP1 -647* Labo -647* DJEG 64460',
    'USER CP1 -647 Labo -647 DJEG 64460 UANL -647 RS -647 MH60 64460 Feme 74',
  ]);
  assert.equal(out.length, 1);
  assert.match(out[0], /KLEBSIELLA/);
  assert.doesNotMatch(out[0], /USER|Labo|DJEG|Feme/i);
});

test('sanitizeResLabsChunks recorta USER pegado al final del chunk de cultivo', () => {
  var out = sanitizeResLabsChunks([
    'UROCULTIVO POR SONDA 20/07: KLEBSIELLA PNEUMONIAE\nCuenta: 80,000 UFC/ML\nUSER CP1 -647* Labo -647* DJEG 64460',
  ]);
  assert.equal(out.length, 1);
  assert.match(out[0], /Cuenta:\s*80,000/i);
  assert.doesNotMatch(out[0], /USER|Labo/i);
});

test('sanitizeResLabsChunks preserva cabeceras condensadas parseCultivo_', () => {
  var out = sanitizeResLabsChunks([
    'ASPIRADO TRAQUEAL 18/05: ESCHERICHIA COLI · BLEE\nATB R: AMP\nCuenta: +100,000 UFC/ML',
    'LIQUIDO PERITONEAL 20/05: PSEUDOMONAS AERUGINOSA\nCuenta: >100000',
    'SECRECION DE HERIDA (TRAQUEO) 24/05: ACINETOBACTER BAUMANNII',
  ]);
  assert.equal(out.length, 3);
  assert.match(out[0], /^ASPIRADO TRAQUEAL/);
  assert.match(out[1], /^LIQUIDO PERITONEAL/);
  assert.match(out[2], /^SECRECION DE HERIDA/);
});

test('procesarLabs no mete membrete en resLabs aunque venga en el pegado', () => {
  var report =
    LETTERHEAD_COLLAPSED.replace(/HEMATOLOGIA[\s\S]*$/, '') +
    `
HEMATOLOGIA
BIOMETRIA HEMATICA
HGB\tA
7.85
g/dL\t12.0 - 16.0
HCT\tA
24.5
%\t36.0 - 46.0
WBC\t*
5.53
K/uL\t4.5 - 11.0
`;
  var r = procesarLabs(report);
  var joined = (r.resLabs || []).join('\n');
  assert.ok(joined.includes('BH') || joined.includes('Hb'), 'debe parsear BH');
  assert.ok((r.resLabs || []).every(function (chunk) {
    return looksLikeLabSectionChunk(chunk);
  }));
});

test('formatLabsForCensoCompact no muestra blobs no clínicos aunque estén en resLabs viejos', () => {
  var lines = formatLabsForCensoCompact([
    {
      fecha: '27/06/2026',
      resLabs: ['BH\tHb 7.85*  Hto 24.5*', LETTERHEAD_COLLAPSED, MANGLED_FOOTER],
      bhExtras: {},
    },
  ]);
  var text = lines.join('\n');
  assert.match(text, /Hb 7\.85/);
  assert.doesNotMatch(text, /UNIVERSIDAD|MOP-HU-|Campo\s+\d+|UANL|DJEG|Sistema\s+SOME/i);
});
