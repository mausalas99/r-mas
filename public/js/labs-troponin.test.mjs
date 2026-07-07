import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTroponina_, procesarLabs, looksLikeSomeLabReport } from './labs.js';

const MUESTRA_TROPONINA = `
Expediente:	2230539-8	Solicitud:	199140
Nombre:	DAVID ALEJANDRO MARTINEZ ALCALA	Fecha Registro:	Jul 7 2026 1:24PM
Sexo:	MASCULINO	Ubicación:	URGENCIAS ADULTOS
Edad:	20	Medico:	A QUIEN CORRESPONDA
 

BANCO DE SANGRE


HsTnl o Troponina I (Alta

Estudio	Resultado	Unidades	Valor de Referencia

HsTnl o Troponina I (Alta Sensibilidad)	

2180.300
INDETERMINADO

ng/L	
Positivo >= 0.00S/CO
Negativo <= 0.00S/CO
`;

test('looksLikeSomeLabReport reconoce reporte solo troponina', () => {
  assert.equal(looksLikeSomeLabReport(MUESTRA_TROPONINA), true);
});

test('parseTroponina_ extrae hs-cTnI elevada con flag', () => {
  const out = parseTroponina_(MUESTRA_TROPONINA);
  assert.match(out, /^TROP\tTnI 2180\.3\*$/);
});

test('parseTroponina_ devuelve vacío sin troponina', () => {
  assert.equal(parseTroponina_('GLUCOSA EN SANGRE 95 mg/dL'), '');
});

test('procesarLabs incluye bloque TROP para banco de sangre', () => {
  const { resLabs, patient, refsBySection } = procesarLabs(MUESTRA_TROPONINA);
  const trop = resLabs.find((l) => l.startsWith('TROP\t'));
  assert.ok(trop, 'debe incluir bloque TROP');
  assert.match(trop, /TnI 2180\.3\*/);
  assert.equal(patient.expediente, '2230539-8');
  assert.equal(patient.name, 'DAVID ALEJANDRO MARTINEZ ALCALA');
  assert.deepEqual(refsBySection.TROP.TnI, [0, 34]);
});
