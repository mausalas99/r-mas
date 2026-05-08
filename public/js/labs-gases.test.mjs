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

const QS_TEXT = `QUIMICA SANGUINEA
SODIO	N	140	mmol/L	136 - 146
CLORO	N	104	mmol/L	98 - 107
`.replace(/\s+/g, ' ');

const ESC_TEXT = `ELECTROLITOS SERICOS
SODIO	N	140	mmol/L	136 - 146
CLORO	N	100	mmol/L	98 - 107
`.replace(/\s+/g, ' ');

const GAS_VEN_HCO3 = `GASOMETRIA VENOSA PARCIAL
PH	N	7.39
HCO3	N	21.2	mmol/L	24.0 - 30.0
`.replace(/\s+/g, ' ');

test('parseGaso_ calcula anion gap usando Na/Cl de la química sanguínea', () => {
  const out = parseGaso_(GAS_VEN_HCO3, QS_TEXT);
  // AG = 140 - (104 + 21.2) = 14.8 → fuera de rango (>12), marcado con *.
  assert.match(out, /\bAG 14\.8\*/);
});

test('parseGaso_ marca anion gap elevado con asterisco', () => {
  const externo = QS_TEXT.replace('104', '95');
  const out = parseGaso_(GAS_VEN_HCO3, externo);
  // AG = 140 - (95 + 21.2) = 23.8 → fuera de rango.
  assert.match(out, /\bAG 23\.8\*/);
});

test('parseGaso_ usa Na/Cl de electrolitos séricos como fuente de química', () => {
  const out = parseGaso_(GAS_VEN_HCO3, ESC_TEXT);
  // AG = 140 - (100 + 21.2) = 18.8.
  assert.match(out, /\bAG 18\.8\*/);
});

test('parseGaso_ NO calcula anion gap cuando no hay química disponible', () => {
  const out = parseGaso_(GAS_VEN_HCO3);
  assert.doesNotMatch(out, /\bAG\b/, 'sin texto de química, no debe haber AG');
});

test('parseGaso_ NO usa Na/Cl del bloque de gases (debe ser de química)', () => {
  // Gasometría arterial completa con Na/Cl/HCO3 propios pero SIN química
  // sanguínea adjunta — no se calcula AG.
  const gasArterialCompleta = `GASOMETRIA ARTERIAL COMPLETA
PH	N	7.40
SODIO	N	140	mmol/L	136 - 146
CLORO	N	104	mmol/L	98 - 107
HCO3	N	24.0	mmol/L	22.0 - 26.0
`.replace(/\s+/g, ' ');
  const out = parseGaso_(gasArterialCompleta, '');
  assert.doesNotMatch(out, /\bAG\b/, 'no debe usar Na/Cl del propio bloque de gases');
});

test('parseGaso_ omite anion gap cuando la química no trae cloro', () => {
  const externoSinCl = `QUIMICA SANGUINEA
SODIO	N	140	mmol/L	136 - 146
`.replace(/\s+/g, ' ');
  const out = parseGaso_(GAS_VEN_HCO3, externoSinCl);
  assert.doesNotMatch(out, /\bAG\b/);
});

test('procesarLabs calcula AG combinando gases y electrolitos séricos', () => {
  const reporte = `Expediente:	1	Solicitud:	1
Nombre:	X	Fecha Registro:	May 7 2026 6:43AM
Sexo:	M	Ubicación:	MI
Edad:	30	Medico:	X

GASOMETRIAS
GASOMETRIA VENOSA PARCIAL
Estudio		Resultado	Unidades	Valor de Referencia
PH	N	7.40		7.35 - 7.45
HCO3	N	22.0	mmol/L	22.0 - 26.0

ELECTROLITOS SERICOS
SODIO	N	140	mmol/L	136 - 146
CLORO	N	100	mmol/L	98 - 107
`;
  const res = procesarLabs(reporte);
  const lineaGases = (res.resLabs || []).find((l) => /^GASES\b/.test(l));
  assert.ok(lineaGases);
  // AG = 140 - (100 + 22) = 18.
  assert.match(lineaGases, /\bAG 18\*/);
});

test('procesarLabs NO calcula AG en reporte solo de gasometría', () => {
  const res = procesarLabs(MUESTRA_GASO_VENOSA);
  const lineaGases = (res.resLabs || []).find((l) => /^GASES\b/.test(l));
  assert.ok(lineaGases);
  assert.doesNotMatch(lineaGases, /\bAG\b/);
});
