import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCultivo_ } from './labs.js';

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
  assert.match(out, /Carb-R|CRE/i);
});
