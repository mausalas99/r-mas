import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSomeReportTables,
  buildSomeGroupTsv,
  renderSomeReportTablesHtml,
} from './labs-some-table.mjs';

const MUESTRA_LUNA = `
Expediente:	2140307-1	Solicitud:	2506101040
Nombre:	LUNA RODRIGUEZ ROGELIO OMAR	Fecha Registro:	10/06/2025 03:41:29 p. m.
Sexo:	MASCULINO	Ubicación:	EMERGENCIAS SHOCK TRAUMA CONSULTA
Edad:	43	Medico:	A QUIEN CORRESPONDA

BACTERIOLOGIA
Estudio		Resultado	Unidades	Valor de Referencia
FIBRAS VEGETALES
FIBRAS VEGETALES	
*
NEGATIVO
TIPO DE MUESTRA	
*
CITOQUIMICO DE LIQUIDOS CORPORALES
RECUENTO	
A
112
LEUCOCITOS/MM3	0.00 - 5.00
ASPECTO	
*
XANTOCROMICO
POLIMORFONUCLEARES	
*
60
%	
LINFOCITOS	
*
40
%	
ERITROCITOS	
*
ESCASOS
/mm3	
GRAM	
*
NEGATIVO
COMENTARIO	
*
PERITONEAL

QUIMICA CLINICA
Estudio		Resultado	Unidades	Valor de Referencia
CITOQUIMICO DE LIQUIDOS CORPORALES
EXAMEN QUIMICO	
*
:
DENSIDAD	
*
1.010
PH	
*
7.5
GLUCOSA	
*
78.0
mg/dL	
PROTEINAS	
*
5100
mg/dL	
LDH	
*
77
IU/L	
CITOQUIMICO DE	
*
LIQUIDO DE ASCITIS
ALBUMINA
ALBUMINA	
B
2.8
g/dL	3.2 - 5.5
COLESTEROL
COLESTEROL	
B
56
mg/dL	130 - 200
TRIGLICERIDOS
TRIGLICERIDOS	
*
40
mg/dL	35 - 150
`;

const MUESTRA_BH = `
HEMATOLOGIA
BIOMETRIA HEMATICA COMPLETA
Estudio		Resultado	Unidades	Valor de Referencia
HGB	
*
12.40
g/dL	12.20 - 18.10
HCT	
*
39.8
%	37.7 - 53.7
WBC	
A
19.60
K/uL	4.00 - 11.00
MCH	
B
25.9
pg	27.0 - 31.2
RDW	
A
16.9
%	11.6 - 14.8
`;

test('parseSomeReportTables — bacteriología y química (Luna)', () => {
  const parsed = parseSomeReportTables(MUESTRA_LUNA);
  assert.equal(parsed.departments.length, 2);
  assert.equal(parsed.departments[0].key, 'BACTERIOLOGIA');
  assert.equal(parsed.departments[1].key, 'QUIMICA CLINICA');

  const bact = parsed.departments[0];
  const fibras = bact.groups.find((g) => g.title === 'FIBRAS VEGETALES');
  assert.ok(fibras);
  assert.equal(fibras.rows[0].estudio, 'FIBRAS VEGETALES');
  assert.equal(fibras.rows[0].resultado, 'NEGATIVO');

  const citoBact = bact.groups.find((g) => g.title === 'CITOQUIMICO DE LIQUIDOS CORPORALES');
  assert.ok(citoBact);
  const rec = citoBact.rows.find((r) => r.estudio === 'RECUENTO');
  assert.ok(rec);
  assert.equal(rec.flag, 'A');
  assert.equal(rec.resultado, '112');
  assert.equal(rec.unidades, 'LEUCOCITOS/MM3');
  assert.equal(rec.ref, '0.00 - 5.00');
  assert.equal(rec.abnormal, true);

  const qs = parsed.departments[1];
  const citoQs = qs.groups.find((g) => g.title === 'CITOQUIMICO DE LIQUIDOS CORPORALES');
  assert.ok(citoQs);
  assert.equal(citoQs.rows.find((r) => r.estudio === 'DENSIDAD').resultado, '1.010');
  assert.equal(citoQs.rows.find((r) => r.estudio === 'PH').resultado, '7.5');
  assert.equal(citoQs.rows.find((r) => r.estudio === 'GLUCOSA').resultado, '78.0');

  const alb = qs.groups.find((g) => g.title === 'ALBUMINA');
  assert.ok(alb);
  assert.equal(alb.rows[0].flag, 'B');
  assert.equal(alb.rows[0].resultado, '2.8');
  assert.equal(alb.rows[0].ref, '3.2 - 5.5');
});

test('parseSomeReportTables — hematología con flags A/B', () => {
  const parsed = parseSomeReportTables(MUESTRA_BH);
  assert.equal(parsed.departments.length, 1);
  const bh = parsed.departments[0].groups[0];
  assert.equal(bh.title, 'BIOMETRIA HEMATICA COMPLETA');
  const wbc = bh.rows.find((r) => r.estudio === 'WBC');
  assert.equal(wbc.flag, 'A');
  assert.equal(wbc.abnormal, true);
  const mch = bh.rows.find((r) => r.estudio === 'MCH');
  assert.equal(mch.flag, 'B');
});

test('buildSomeGroupTsv — encabezado Estudio y columnas SOME', () => {
  const parsed = parseSomeReportTables(MUESTRA_BH);
  const group = parsed.departments[0].groups[0];
  const tsv = buildSomeGroupTsv(group, 'BH');
  assert.match(tsv, /^BH\n/);
  assert.match(tsv, /^Estudio\tResultado\tUnidades\tValor de Referencia/m);
  assert.match(tsv, /HGB\t12\.40\tg\/dL\t12\.20 - 18\.10/);
});

test('renderSomeReportTablesHtml — genera tablas por departamento', () => {
  const parsed = parseSomeReportTables(MUESTRA_LUNA);
  const html = renderSomeReportTablesHtml(parsed);
  assert.match(html, /lab-some-dept-header.*BACTERIOLOGIA/);
  assert.match(html, /lab-some-dept-header.*QUIMICA CLINICA/);
  assert.match(html, /lab-some-abnormal/);
  assert.match(html, /data-export="tsv"/);
});

test('parseSomeReportTables — química clínica, biometría y EGO completos', () => {
  const QS = `
QUIMICA CLINICA
Estudio		Resultado	Unidades	Valor de Referencia
ALBUMINA
ALBUMINA	
*
4.5
g/dL	3.2 - 5.5
BILIRRUBINA
BILIRRUBINA TOTAL	
A
1.6
mg/dL	0.2 - 1.0
BILIRRUBINA DIRECTA	
A
0.7
mg/dL	0.0 - 0.2
SODIO
SODIO	
B
124.3
mmol/L	135.0 - 145.0
`;
  const EGO = `
EXAMEN GENERAL DE ORINA
Estudio		Resultado	Unidades	Valor de Referencia
COLOR	
*
AMARILLO OSCURO
PH	
B
5.0
5.5 - 6.5
PROTEINAS	
*
30
mg/dL	NEGATIVO
`;
  const BH = `
HEMATOLOGIA
BIOMETRIA HEMATICA COMPLETA
Estudio		Resultado	Unidades	Valor de Referencia
HGB	
*
13.50
g/dL	12.20 - 18.10
TIEMPO DE PROTROMBINA Y TROMBOPLASTINA
TIEMPO DE PROTROMBINA	
A
14.20
SEG.	9.55 - 12.23
`;
  const qs = parseSomeReportTables(QS);
  assert.equal(qs.departments[0].key, 'QUIMICA CLINICA');
  const bil = qs.departments[0].groups.find((g) => g.title === 'BILIRRUBINA');
  assert.ok(bil);
  assert.equal(bil.rows.length, 2);
  const bh = parseSomeReportTables(BH);
  assert.equal(bh.departments[0].groups.length, 2);
  assert.ok(bh.departments[0].groups.some((g) => g.title === 'BIOMETRIA HEMATICA COMPLETA'));
  const ego = parseSomeReportTables(EGO);
  const color = ego.departments[0].groups[0].rows.find((r) => r.estudio === 'COLOR');
  assert.equal(color.resultado, 'AMARILLO OSCURO');
  const prot = ego.departments[0].groups[0].rows.find((r) => r.estudio === 'PROTEINAS');
  assert.equal(prot.unidades, 'mg/dL');
  assert.equal(prot.ref, 'NEGATIVO');
});
