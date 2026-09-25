import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGrupoSangreCoombs_, procesarLabs } from './labs.js';

const MUESTRA_GS = `
Expediente:	9000018-0	Solicitud:	900003
Nombre:	INVENTADO FICTICIO SINTETICO CASOAH	Fecha Registro:	Jul 18 2026 7:14AM
Sexo:	FEMENINO	Ubicación:	NEUROMEDICA
Edad:	44	Medico:	FICTICIO SINTETICO EJEMPLO A
 

BANCO DE SANGRE


REPORTE DE GRUPO SANGUINEO RH, COOMBS DIRECTO E INDIRECTO

Estudio	Resultado

Grupo Sanguineo / RH	
B POSITIVO

Coombs Directo	
POSITIVO / POSITIVO 1+

Coombs Indirecto
`;

test('parseGrupoSangreCoombs_ compacta grupo RH y Coombs directo', () => {
  const out = parseGrupoSangreCoombs_(MUESTRA_GS);
  assert.match(out, /^GS\t/);
  assert.match(out, /\bB\+/);
  assert.match(out, /\bCD 1\+\*/);
  assert.doesNotMatch(out, /\bCI\b/);
});

test('parseGrupoSangreCoombs_ incluye Coombs indirecto cuando viene', () => {
  const raw = `
BANCO DE SANGRE
REPORTE DE GRUPO SANGUINEO RH, COOMBS DIRECTO E INDIRECTO
Grupo Sanguineo / RH
O NEGATIVO
Coombs Directo
NEGATIVO
Coombs Indirecto
POSITIVO / POSITIVO 2+
`;
  const out = parseGrupoSangreCoombs_(raw);
  assert.equal(out, 'GS\tO- CD neg CI 2+*');
});

test('parseGrupoSangreCoombs_ acepta AB y resultado en la misma línea', () => {
  const raw = `
BANCO DE SANGRE
Grupo Sanguineo / RH\tAB POSITIVO
Coombs Directo\tNEGATIVO
Coombs Indirecto\tNEGATIVO
`;
  const out = parseGrupoSangreCoombs_(raw);
  assert.equal(out, 'GS\tAB+ CD neg CI neg');
});

test('parseGrupoSangreCoombs_ vacío sin marcadores de grupo/Coombs', () => {
  assert.equal(parseGrupoSangreCoombs_('BANCO DE SANGRE\nSerologia\n'), '');
  assert.equal(parseGrupoSangreCoombs_(''), '');
});

test('procesarLabs incluye bloque GS para grupo sanguíneo', () => {
  const { resLabs, patient } = procesarLabs(MUESTRA_GS);
  const gs = resLabs.find((l) => l.startsWith('GS\t'));
  assert.ok(gs, 'debe incluir bloque GS');
  assert.match(gs, /B\+/);
  assert.match(gs, /CD 1\+\*/);
  assert.equal(patient.expediente, '9000018-0');
  assert.equal(patient.name, 'INVENTADO FICTICIO SINTETICO CASOAH');
});
