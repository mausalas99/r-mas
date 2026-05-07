import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGaso_, procesarLabs } from './labs.js';

const MUESTRA_GASO_VENOSA = `
Expediente:	2213511-4	Solicitud:	2605070398
Nombre:	BENITO CASTILLO JUAREZ	Fecha Registro:	May 7 2026 6:43AM
Sexo:	MASCULINO	Ubicación:	MEDICINA INTERNA 1
Edad:	58	Medico:	A QUIEN CORRESPONDA


GASOMETRIAS
GASOMETRIA VENOSA PARCIAL
Estudio		Resultado	Unidades	Valor de Referencia
PH	*	7.39		7.32 - 7.43
pCO2	B	35	mmHg	40 - 45
pO2	A	60	mmHg	N/A
Lactato	B	0.7	mmol/L	0.9 - 1.9
HCO3	B	21.2	mmol/L	24.0 - 30.0
EX. BASE	B	-3.4	mmol/L	-2.0 - 2.0
SAT 02	A	90	%	0 - 0
OBSERVACIONES	*	Ca++ IONIZADO: 0.92 mmol/L	&
`;

test('parseGaso_ extrae Ca++ ionizado del bloque OBSERVACIONES y lo marca como bajo', () => {
  const tNorm = MUESTRA_GASO_VENOSA.replace(/\s+/g, ' ');
  const out = parseGaso_(tNorm);
  assert.ok(out.startsWith('GASES\t'), 'el output debe empezar con GASES');
  assert.match(out, /\biCa 0\.92\*/, 'debe incluir iCa con valor 0.92 marcado como anormal');
});

test('parseGaso_ omite iCa cuando no aparece en el reporte', () => {
  const tSinIca = MUESTRA_GASO_VENOSA
    .replace(/OBSERVACIONES.*$/im, '')
    .replace(/\s+/g, ' ');
  const out = parseGaso_(tSinIca);
  assert.ok(out.startsWith('GASES\t'));
  assert.doesNotMatch(out, /\biCa\b/, 'no debe incluir iCa cuando no hay dato');
});

test('parseGaso_ no marca iCa dentro del rango normal (1.20 mmol/L)', () => {
  const tNorm = MUESTRA_GASO_VENOSA
    .replace('Ca++ IONIZADO: 0.92 mmol/L', 'Ca++ IONIZADO: 1.20 mmol/L')
    .replace(/\s+/g, ' ');
  const out = parseGaso_(tNorm);
  assert.match(out, /\biCa 1\.2(?!\*)/, 'iCa 1.20 debe ir sin asterisco');
});

test('procesarLabs incluye iCa en la línea GASES cuando hay Ca++ ionizado', () => {
  const res = procesarLabs(MUESTRA_GASO_VENOSA);
  const lineaGases = (res.resLabs || []).find((l) => /^GASES\b/.test(l));
  assert.ok(lineaGases, 'procesarLabs debe producir una línea GASES');
  assert.match(lineaGases, /\biCa 0\.92\*/);
});
