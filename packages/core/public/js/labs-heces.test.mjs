import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFisicoquimicoHeces_, procesarLabs } from './labs.js';

const MUESTRA_HECES = `
Expediente:	9000017-4	Solicitud:	9000000022
Nombre:	GENERICO SUPUESTO CASOAN	Fecha Registro:	04/05/2026 03:06:21 p. m.
Sexo:	MASCULINO	Ubicación:	SERVICIO CLÍNICO 1
Edad:	58	Medico:	FICTICIO SINTETICO EJEMPLO A

PARASITOLOGIA
Estudio		Resultado	Unidades	Valor de Referencia
FISICOQUIMICO DE HECES
ASPECTO
*
6
TIPO 3 Y 4 G.BRISTOL
PH
*
6.0
7.0
PROTEINAS
*
NEGATIVO
NEGATIVO
GLUCOSA
*
NEGATIVO
NEGATIVO
LEUCOCITOS
*
MODERADAS
NEGATIVO
ERITROCITOS
*
ESCASAS
NEGATIVO
GRASA
*
NEGATIVO
NEGATIVO
FIBRAS MUSCULARES
*
ESCASAS
NEGATIVO
COPROPARASITOSCOPICO INMEDIATO
*
NEGATIVO
NEGATIVO
OBSERVACIONES
*
`;

test('parseFisicoquimicoHeces_ detecta bloque y resultados clave', () => {
  const out = parseFisicoquimicoHeces_(MUESTRA_HECES);
  assert.match(out, /^HECES\t/);
  assert.match(out, /Asp\s+6 TIPO 3 Y 4 G\.BRISTOL/);
  assert.match(out, /pH\s+6\.0/);
  assert.match(out, /Prot\s+NEGATIVO/);
  assert.match(out, /Leu\s+MODERADAS/);
  assert.match(out, /Eri\s+ESCASAS/);
  assert.match(out, /Copro\s+NEGATIVO/);
});

test('procesarLabs incluye bloque HECES cuando viene parasitologia', () => {
  const { resLabs } = procesarLabs(MUESTRA_HECES);
  const heces = resLabs.find((l) => l.startsWith('HECES\t'));
  assert.ok(heces, 'debe incluir bloque HECES');
});

test('heces: ERITROCITOS no se lee como RBC de BH y la firma no entra en Obs', () => {
  const texto = MUESTRA_HECES.replace(/OBSERVACIONES[\s\S]*$/, 'OBSERVACIONES\n*\nDR. FICTICIO EJEMPLO DOCTOR\nCED. PROF. 12234309\n');
  const { resLabs } = procesarLabs(texto);
  assert.ok(!resLabs.some((l) => l.startsWith('BH')), resLabs.join('\n'));
  const heces = resLabs.find((l) => l.startsWith('HECES'));
  assert.ok(heces && !/DR\.|Obs/.test(heces), heces);
});
