import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  buildLabEventualidadInterpretText,
  consolidateLabSetsForEventualidad,
} = await import('./lab-eventualidad-interpret.mjs');

const TODAY = '21/07/2026';
const identityNorm = function (raw) {
  return String(raw || '').trim();
};

test('buildLabEventualidadInterpretText — formato Estudios (labs consolidados)', () => {
  var text = buildLabEventualidadInterpretText(
    [
      {
        id: 'a',
        fecha: TODAY,
        hora: '08:00',
        resLabs: [
          'BH\tHb 9.0* VCM 72 Hto 28 Leu 14.2* Plt 90',
          'QS\tNa 128* K 5.6* Glu 210* Cr 1.8*',
        ],
      },
      {
        id: 'old',
        fecha: '20/07/2026',
        hora: '10:00',
        resLabs: ['BH\tHb 7.0* VCM 70'],
      },
    ],
    { todayFecha: TODAY, normalizeFecha: identityNorm }
  );
  assert.match(text, /21\/07/);
  assert.match(text, /BH\tHb 9\.0\*/);
  assert.match(text, /QS\tNa 128\*/);
  assert.doesNotMatch(text, /Hb 7\.0/);
  assert.doesNotMatch(text, /EN LA BIOMETR/);
  assert.doesNotMatch(text, /^LABS /m);
});

test('buildLabEventualidadInterpretText — empty when no today sets', () => {
  assert.equal(
    buildLabEventualidadInterpretText([{ fecha: '20/07/2026', resLabs: ['BH\tHb 9'] }], {
      todayFecha: TODAY,
      normalizeFecha: identityNorm,
    }),
    ''
  );
});

test('buildLabEventualidadInterpretText — filterToday false includes other days', () => {
  var text = buildLabEventualidadInterpretText([{ fecha: '20/07/2026', resLabs: ['BH\tHb 9 VCM 72'] }], {
    todayFecha: TODAY,
    normalizeFecha: identityNorm,
    filterToday: false,
  });
  assert.match(text, /BH\tHb 9/);
});

test('consolidateLabSetsForEventualidad — misma hora fusiona BH+QS como labs consolidados', () => {
  var out = consolidateLabSetsForEventualidad([
    {
      id: '1',
      fecha: TODAY,
      hora: '08:00',
      resLabs: ['BH\tHb 9.0* VCM 72'],
    },
    {
      id: '2',
      fecha: TODAY,
      hora: '08:00',
      resLabs: ['QS\tNa 128* K 5.6*'],
    },
  ]);
  assert.equal(out.length, 1);
  var joined = (out[0].resLabs || []).join('\n');
  assert.match(joined, /BH\t/);
  assert.match(joined, /QS\t/);
  assert.equal(String(out[0].hora).slice(0, 5), '08:00');
});

test('buildLabEventualidadInterpretText — sets misma hora → un bloque Estudios', () => {
  var text = buildLabEventualidadInterpretText(
    [
      {
        id: '1',
        fecha: TODAY,
        hora: '08:00',
        resLabs: ['BH\tHb 9.0* VCM 72'],
      },
      {
        id: '2',
        fecha: TODAY,
        hora: '08:00',
        resLabs: ['QS\tNa 128*'],
      },
    ],
    { todayFecha: TODAY, normalizeFecha: identityNorm }
  );
  assert.match(text, /21\/07/);
  assert.match(text, /BH\tHb 9\.0\*/);
  assert.match(text, /QS\tNa 128\*/);
  var dateLines = text.split('\n').filter(function (l) {
    return /^21\/07/.test(l.trim());
  });
  assert.equal(dateLines.length, 1);
});
