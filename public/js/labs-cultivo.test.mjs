import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCultivo_,
  procesarLabs,
  extractMicSortKey,
  buildAtbRisSummaryHtml,
  formatCultivoCondensedForCopy,
} from './labs.js';

const norm = (t) => t.replace(/\s+/g, ' ');

test('urocultivo: tipo y germen (sin muestra útil tras PRODUCTO)', () => {
  const raw = `
BACTERIOLOGIA
Estudio		Resultado
UROCULTIVO POR SONDA
PRODUCTO	
*
TINCION DE GRAM	
*
MICROORGANISMO	
*
Escherichia coli
COMENTARIO:	
*
CUENTA DE KASS	
*
+100,000 UFC/mL
`;
  const tNorm = norm(raw);
  const out = parseCultivo_(raw, tNorm);
  assert.match(out, /UROCULTIVO POR SONDA/i);
  assert.match(out, /ESCHERICHIA COLI/i);
  assert.ok(!out.includes('TINCION'), 'no debe usar TINCION como muestra');
});

test('hemocultivo: tipo y muestra (PRODUCTO)', () => {
  const raw = `
BACTERIOLOGIA
HEMOCULTIVO
PRODUCTO	
*
CATETER NIAGARA
MICROORGANISMO	
*
`;
  const tNorm = norm(raw);
  const out = parseCultivo_(raw, tNorm);
  assert.match(out, /HEMOCULTIVO/);
  assert.match(out, /\(CATETER NIAGARA\)/);
});

test('hemocultivo positivo: periférico y pseudomonas', () => {
  const raw = `
Nombre:	GONZALEZ PEREZ BRANDON
Fecha Registro:	14/02/2026 02:18:16 p. m.
BACTERIOLOGIA
HEMOCULTIVO
PRODUCTO	
*
PERIFERICO IZQUIERDO
MICROORGANISMO	
*
Pseudomonas aeruginosa
`;
  const tNorm = norm(raw);
  const out = parseCultivo_(raw, tNorm);
  assert.match(out, /HEMOCULTIVO \(PERIFERICO IZQUIERDO\)/);
  assert.match(out, /PSEUDOMONAS AERUGINOSA/);
  assert.match(out, /14\/02/);
});

test('cultivo catéter: tipo CATETER y punta CVC', () => {
  const raw = `
BACTERIOLOGIA
CATETER
PRODUCTO	
*
PUNTA CVC
MICROORGANISMO	
*
Pseudomonas aeruginosa
`;
  const tNorm = norm(raw);
  const out = parseCultivo_(raw, tNorm);
  assert.match(out, /CATETER \(PUNTA CVC\)/);
  assert.match(out, /PSEUDOMONAS/);
});

test('cultivo líquido peritoneal: tipo, pseudomonas y antibiograma', () => {
  const raw = `
Expediente:	1929604-8	Solicitud:	2605071010
Nombre:	CORONADO PALOMO RAUL	Fecha Registro:	07/05/2026 04:32:46 p. m.
Sexo:	MASCULINO	Ubicación:	NEUROMEDICA
Edad:	69	Medico:	A QUIEN CORRESPONDA
BACTERIOLOGIA
Estudio		Resultado	Unidades	Valor de Referencia
LIQUIDO PERITONEAL
PRODUCTO	
*
TINCION DE GRAM	
*
ESCASOS BACILOS GRAM NEGATIVO
CALIDAD DE LA MUESTRA	
*
ESTADO DE CULTIVO	
*
*
MICROORGANISMO	
*
Pseudomonas aeruginosa
COMENTARIO:	
*
CUENTA	
*
X
ANTIBIOGRAMA	
*
CEFTAZIDIMA
>16	R
*
CIPROFLOXACINA
<=1	S
*
CEFEPIMA
16	I
*
IMIPENEM
2	S
*
LEVOFLOXACINA
<=2	S
*
MEROPENEM
<=1	S
*
PIP/TAZO
64	S
*
TOBRAMICINA
<=4	S
*
MICROORGANISMO	
*
COMENTARIO:	
*
CUENTA	
*
*
IDENTIFICACION POR ESPECTROMETRIA DE MASAS (MALDI TOF)
MICROORGANISMO	
*
`;
  const out = parseCultivo_(raw, norm(raw));
  assert.match(out, /LIQUIDO PERITONEAL 07\/05: PSEUDOMONAS AERUGINOSA/);
  assert.doesNotMatch(out, /NEUROMEDICA/i);
  assert.match(out, /\bATB R: CAZ \| I: FEP\b/);
  assert.match(out, /S: CIPRO, IMI, LVX, MERO, PIP\/TAZO, TOBRA/);
});

test('urocultivo: detecta BLEE por comentario y ESBL en antibiograma', () => {
  const raw = `
Expediente:	2211202-9
Fecha Registro:	29/04/2026 03:00:39 p. m.
BACTERIOLOGIA
UROCULTIVO POR SONDA
PRODUCTO	
*
MICROORGANISMO	
*
Klebsiella pneumoniae
COMENTARIO:	
*
AISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)
CUENTA DE KASS	
*
+100,000 UFC/mL
ANTIBIOGRAMA	
*
CEFTRIAXONA
>32	ESBL
*
CEFOXITINA
<=8	S
`;
  const tNorm = norm(raw);
  const out = parseCultivo_(raw, tNorm);
  assert.match(out, /KLEBSIELLA PNEUMONIAE/i);
  assert.match(out, /\bBLEE\b/);
  assert.match(out, /\bATB\b/);
  assert.match(out, /ESBL:/i);
  assert.match(out, /CFTX|CTX|CEFTRI/i);
  assert.match(out, /Cuenta:.*100,000.*UFC/i);
});

test('urocultivo polimicrobiano: Klebsiella y Enterococcus con ATB por germen', () => {
  const raw = `
BACTERIOLOGIA
UROCULTIVO POR SONDA
PRODUCTO
*
MICROORGANISMO
*
Klebsiella pneumoniae
COMENTARIO:
AISLAMIENTO PRODUCTOR DE BETALACTAMASAS (BLEE)
CUENTA DE KASS
*
+100,000 UFC/mL
ANTIBIOGRAMA
*
CEFTRIAXONA
>32	ESBL
*
MICROORGANISMO
*
Enterococcus faecium
COMENTARIO:
*
CUENTA DE KASS
*
+100,000 UFC/mL
ANTIBIOGRAMA
*
AMPICILINA
>8	R
*
VANCOMICINA
<=0.5	S
*
IDENTIFICACION POR ESPECTROMETRIA DE MASAS (MALDI TOF)
MICROORGANISMO
*
`;
  const tNorm = norm(raw);
  const out = parseCultivo_(raw, tNorm);
  assert.match(out, /KLEBSIELLA PNEUMONIAE/i);
  assert.match(out, /ENTEROCOCCUS FAECIUM/i);
  assert.match(out, /\bBLEE\b/);
  const kIdx = out.indexOf('KLEBSIELLA');
  const eIdx = out.indexOf('ENTEROCOCCUS');
  assert.ok(kIdx !== -1 && eIdx !== -1 && kIdx < eIdx, 'orden: Klebsiella antes que Enterococcus');
  assert.match(out, /\bAMP\b|\bAMPICILINA/i);
});

test('comentario: carbapenemasa NDM y fenotipo Carb-R', () => {
  const raw = `
BACTERIOLOGIA
UROCULTIVO POR SONDA
MICROORGANISMO
Klebsiella pneumoniae
COMENTARIO:
PRODUCTOR DE NDM-1
CUENTA DE KASS
+10,000 UFC/mL
`;
  const out = parseCultivo_(raw, norm(raw));
  assert.match(out, /\bNDM\b|\bNDM-1\b/i);
});

test('comentario: resistencia carbapenemicos sin enzima nombrada → Carb-R', () => {
  const raw = `
BACTERIOLOGIA
MICROORGANISMO
Acinetobacter baumannii
COMENTARIO:
RESISTENTE A CARBAPENEMICOS
`;
  const out = parseCultivo_(raw, norm(raw));
  assert.match(out, /Acinetobacter baumannii/i);
  assert.match(out, /Carb-R|CRE/i);
});

test('procesarLabs: Ubicación del encabezado es del paciente (no se antepone al cultivo)', () => {
  const raw = [
    'Expediente:\t1\tSolicitud:\t2',
    'Nombre:\tPACIENTE\tFecha Registro:\t07/05/2026',
    'Sexo:\tMASCULINO\tUbicación:\tNEUROMEDICA',
    'Edad:\t69',
    'BACTERIOLOGIA',
    'UROCULTIVO POR SONDA',
    'PRODUCTO',
    '*',
    'MICROORGANISMO',
    '*',
    'Escherichia coli',
  ].join('\n');
  const r = procesarLabs(raw);
  assert.equal(r.patient.ubicacion, 'NEUROMEDICA');
  const joined = (r.resLabs || []).join('\n');
  assert.doesNotMatch(joined, /NEUROMEDICA/i);
  assert.match(joined, /UROCULTIVO|POR SONDA|Escherichia coli/i);
});

test('extractMicSortKey: primer valor numérico del CMI', () => {
  assert.equal(extractMicSortKey('<=8'), 8);
  assert.equal(extractMicSortKey('>=256'), 256);
  assert.equal(extractMicSortKey('\u226564'), 64);
  assert.ok(Number.isNaN(extractMicSortKey('')));
});

test('formatCultivoCondensedForCopy: fecha, cabecera y ATB', () => {
  const chunk = [
    'LIQUIDO PERITONEAL 07/05: PSEUDOMONAS AERUGINOSA',
    'ATB R: CAZ | I: FEP | S: CIPRO, IMI, LVX, MERO, PIP/TAZO, TOBRA',
    'Cuenta: +100 UFC',
  ].join('\n');
  const out = formatCultivoCondensedForCopy(chunk, '07/05/2026');
  assert.equal(
    out,
    '07/05/2026\nLIQUIDO PERITONEAL 07/05: PSEUDOMONAS AERUGINOSA\nATB R: CAZ | I: FEP | S: CIPRO, IMI, LVX, MERO, PIP/TAZO, TOBRA'
  );
});

test('buildAtbRisSummaryHtml: títulos por categoría y orden S por CMI ascendente', () => {
  const sens = [
    { med: 'AAA', mic: '16', interp: 'S' },
    { med: 'BBB', mic: '4', interp: 'S' },
    { med: 'CCC', mic: '≥64', interp: 'R' },
    { med: 'DDD', mic: '8', interp: 'I' },
  ];
  const h = buildAtbRisSummaryHtml(sens);
  assert.match(h, /Resistencias/);
  assert.match(h, /Indeterminado/);
  assert.match(h, /Sensible/);
  const idxBbb = h.indexOf('atb-ris-drug">BBB<');
  const idxAaa = h.indexOf('atb-ris-drug">AAA<');
  assert.ok(idxBbb > 0 && idxAaa > idxBbb, 'en S, menor CMI primero');
});
