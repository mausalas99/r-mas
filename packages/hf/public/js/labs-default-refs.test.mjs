import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  procesarLabs,
  collectPriorRefsFromHistory,
  mergeRefsMap_,
  mergeRefsBySection_,
  buildRefsBySectionFromReport,
} from './labs.js';

/** Química sin columna Valor de Referencia (valores alterados claros). */
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

/** Pegado real HU: refs vacíos; Cl 109.9 fuera de estándar [96,106]. */
const QS_HILDA_SIN_REFS = `Expediente:	1087426-2	Solicitud:	2607310886
Nombre:	MARIA HILDA SALINAS CANTU	Fecha Registro:	Jul 31 2026 4:08PM
Sexo:	FEMENINO	Ubicación:	URGENCIAS ADULTOS
Edad:	73	Medico:	A QUIEN CORRESPONDA

QUIMICA CLINICA
GLUCOSA EN SANGRE
Estudio		Resultado	Unidades	Valor de Referencia
GLUCOSA EN SANGRE	
*
98
mg/dL	
NITROGENO DE LA UREA EN SANGRE
Estudio		Resultado	Unidades	Valor de Referencia
NITROGENO DE LA UREA EN SANGRE	
*
18
mg/dL	
CREATININA EN SANGRE
Estudio		Resultado	Unidades	Valor de Referencia
CREATININA EN SANGRE	
*
0.5
mg/dL	
CLORO
Estudio		Resultado	Unidades	Valor de Referencia
CLORO	
*
109.9
mmol/L	
SODIO
Estudio		Resultado	Unidades	Valor de Referencia
SODIO	
*
142.8
mmol/L	
POTASIO
Estudio		Resultado	Unidades	Valor de Referencia
POTASIO	
*
4.0
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

test('procesarLabs marca Cl en pegado HU sin Valor de Referencia', () => {
  const res = procesarLabs(QS_HILDA_SIN_REFS);
  const esc = (res.resLabs || []).find((l) => /^ESC\b/.test(l));
  assert.ok(esc, 'debe emitir ESC');
  assert.match(esc, /\bCl 109\.9\*/);
  assert.match(esc, /\bNa 142\.8(?!\*)/);
  // Sin PCT en el reporte → no envenenar refsBySection
  assert.ok(!res.refsBySection || !res.refsBySection.QS || !res.refsBySection.QS.PCT);
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

test('procesarLabs usa refs hospitalarias previas en QS/ESC sin columna de rangos', () => {
  const prior = {
    QS: { Glu: [74, 106], Cr: [0.55, 1.02] },
    ESC: { Cl: [98, 107], Na: [135, 145], K: [3.5, 5.1] },
  };
  const res = procesarLabs(QS_HILDA_SIN_REFS, { priorRefsBySection: prior });
  const qs = (res.resLabs || []).find((l) => /^QS\b/.test(l));
  const esc = (res.resLabs || []).find((l) => /^ESC\b/.test(l));
  assert.ok(qs);
  assert.match(qs, /\bCr 0\.5\*/);
  assert.match(qs, /\bGlu 98(?!\*)/);
  assert.ok(esc);
  assert.match(esc, /\bCl 109\.9\*/);
  // Persistir priors en el set para el siguiente pegado
  assert.deepEqual(res.refsBySection.QS.Cr, [0.55, 1.02]);
  assert.deepEqual(res.refsBySection.ESC.Cl, [98, 107]);
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

test('mergeRefsBySection_ reporte gana y prior rellena', () => {
  const out = mergeRefsBySection_(
    { QS: { Glu: [70, 99] } },
    { QS: { Glu: [74, 106], Cr: [0.55, 1.02] }, ESC: { Cl: [98, 107] } }
  );
  assert.deepEqual(out.QS.Glu, [70, 99]);
  assert.deepEqual(out.QS.Cr, [0.55, 1.02]);
  assert.deepEqual(out.ESC.Cl, [98, 107]);
});

test('buildRefsBySectionFromReport no inventa PCT sin estudio', () => {
  const refs = buildRefsBySectionFromReport(QS_HILDA_SIN_REFS);
  assert.ok(!refs.QS || !refs.QS.PCT);
});
