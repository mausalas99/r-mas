import { test } from 'node:test';
import assert from 'node:assert/strict';
import { procesarLabs, collectPriorRefsFromHistory, mergeRefsMap_ } from './labs.js';

/** Química sin columna Valor de Referencia. */
const QS_SIN_RANGOS = `
Expediente:	1087426-2	Solicitud:	2607310999
Nombre:	MARIA HILDA SALINAS CANTU	Fecha Registro:	Jul 31 2026 4:10PM
Sexo:	FEMENINO	Ubicación:	URGENCIAS ADULTOS
Edad:	73	Medico:	A QUIEN CORRESPONDA

QUIMICA CLINICA
QUIMICA SANGUINEA
Estudio		Resultado	Unidades	Valor de Referencia
GLUCOSA EN SANGRE
*
250
mg/dL	
CREATININA EN SANGRE
*
0.8
mg/dL	
SODIO
*
130
mmol/L	
POTASIO
*
3.0
mmol/L	
CLORO
*
98
mmol/L	
`;

test('procesarLabs marca QS/ESC alterados con rangos estándar si no hay refs', () => {
  const res = procesarLabs(QS_SIN_RANGOS);
  const qs = (res.resLabs || []).find((l) => /^QS\b/.test(l));
  const esc = (res.resLabs || []).find((l) => /^ESC\b/.test(l));
  assert.ok(qs, 'debe emitir QS');
  assert.match(qs, /\bGlu 250\*/);
  assert.match(qs, /\bCr 0\.8(?!\*)/);
  assert.ok(esc, 'debe emitir ESC');
  assert.match(esc, /\bNa 130\*/);
  assert.match(esc, /\bK 3\*/);
});

test('procesarLabs prioriza priorRefsBySection sobre estándar en QS', () => {
  // Estándar Glu [70,100] marcaría 95 normal; prior hospitalario [70,90] lo marca.
  const res = procesarLabs(
    `
QUIMICA SANGUINEA
GLUCOSA EN SANGRE
N
95
mg/dL	
`.replace(/\s+/g, ' '),
    { priorRefsBySection: { QS: { Glu: [70, 90] } } }
  );
  const qs = (res.resLabs || []).find((l) => /^QS\b/.test(l));
  assert.ok(qs);
  assert.match(qs, /\bGlu 95\*/);
});

test('collectPriorRefsFromHistory acumula varias secciones', () => {
  const prior = collectPriorRefsFromHistory([
    { refsBySection: { QS: { Glu: [70, 105] }, BH: { Hb: [12, 16] } } },
    { refsBySection: { ESC: { Na: [135, 145] }, QS: { Cr: [0.5, 1.1] } } },
  ]);
  assert.deepEqual(prior.QS.Glu, [70, 105]);
  assert.deepEqual(prior.QS.Cr, [0.5, 1.1]);
  assert.deepEqual(prior.BH.Hb, [12, 16]);
  assert.deepEqual(prior.ESC.Na, [135, 145]);
  const merged = mergeRefsMap_(prior.QS, { Glu: [70, 100] });
  assert.deepEqual(merged.Glu, [70, 100]);
  assert.deepEqual(merged.Cr, [0.5, 1.1]);
});
