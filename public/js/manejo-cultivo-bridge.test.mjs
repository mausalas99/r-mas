import { test } from 'node:test';
import assert from 'node:assert/strict';
import { procesarLabs } from './labs.js';
import { parseFechaLabToMs } from './tend-core.mjs';
import { getCultureContextForManejo } from './manejo-cultivo-bridge.mjs';

const HEMOCULTIVO_PSEUDOMONAS_RAW = `
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

test('aislamiento positivo pseudomonas en historial mock', () => {
  var parsed = procesarLabs(HEMOCULTIVO_PSEUDOMONAS_RAW);
  var hist = [
    {
      fecha: '14/02/2026',
      hora: '14:00',
      resLabs: parsed.resLabs,
    },
  ];
  var ref = parseFechaLabToMs('20/02/2026', '12:00');
  var ctx = getCultureContextForManejo(hist, { maxAgeDays: 14, referenceMs: ref });
  assert.ok(ctx.isolates.length >= 1);
  assert.match(ctx.isolates[0].organismo, /pseudomonas/i);
  assert.equal(ctx.activeIsolateIndex, 0);
  assert.ok(Array.isArray(ctx.globalAlerts));
});

test('cultivo negativo no genera aislamientos', () => {
  var hist = [
    {
      fecha: '20/05/2026',
      hora: '10:00',
      resLabs: ['HEMOCULTIVO 20/05: NEGATIVO'],
    },
  ];
  var ctx = getCultureContextForManejo(hist, { maxAgeDays: 14 });
  assert.equal(ctx.isolates.length, 0);
  assert.equal(ctx.globalAlerts.length, 0);
});

test('ATB condensado: filas separadas en resLabs → todos los sensibles', () => {
  var hist = [
    {
      fecha: '07/05/2026',
      hora: '16:32',
      resLabs: [
        'LIQUIDO PERITONEAL 07/05: PSEUDOMONAS AERUGINOSA',
        'ATB R: CAZ | I: FEP | S: CIPRO, IMI, LVX, MERO, PIP/TAZO, TOBRA',
      ],
    },
  ];
  var ctx = getCultureContextForManejo(hist, { maxAgeDays: 14 });
  assert.equal(ctx.isolates.length, 1);
  assert.match(ctx.isolates[0].organismo, /PSEUDOMONAS/i);
  assert.deepEqual(ctx.isolates[0].sensKeys, [
    'CIPRO',
    'IMI',
    'LVX',
    'MERO',
    'PIP/TAZO',
    'TOBRA',
  ]);
  assert.deepEqual(ctx.isolates[0].resKeys, ['CAZ']);
  assert.deepEqual(ctx.isolates[0].intKeys, ['FEP']);
});

test('Carb-R en cabecera genera alerta global en Manejo', () => {
  var hist = [
    {
      fecha: '05/05/2026',
      hora: '18:16',
      resLabs: [
        'UROCULTIVO POR SONDA 05/05: PSEUDOMONAS AERUGINOSA · Carb-R',
        'ATB R: IMI | S: PIP/TAZO',
      ],
    },
  ];
  var ctx = getCultureContextForManejo(hist, { maxAgeDays: 14 });
  assert.equal(ctx.isolates.length, 1);
  assert.ok(ctx.isolates[0].markers.indexOf('Carb-R') !== -1 || ctx.globalAlerts.some(function (a) {
    return /carbapen/i.test(a);
  }));
});
