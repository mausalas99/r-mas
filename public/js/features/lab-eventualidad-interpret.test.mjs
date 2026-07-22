import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  parseCompactLabPairs,
  interpretBhPhrases,
  interpretChemPhrases,
  buildLabEventualidadInterpretText,
} = await import('./lab-eventualidad-interpret.mjs');

const TODAY = '21/07/2026';
const identityNorm = function (raw) {
  return String(raw || '').trim();
};

test('parseCompactLabPairs reads tab body tokens', () => {
  var p = parseCompactLabPairs('BH\tHb 9.0* VCM 72 Leu 14.2*');
  assert.equal(p.Hb.n, 9);
  assert.equal(p.Hb.flagged, true);
  assert.equal(p.VCM.n, 72);
  assert.equal(p.Leu.n, 14.2);
});

test('interpretBhPhrases — prosa sin paréntesis', () => {
  var phrases = interpretBhPhrases({
    Hb: { n: 9, raw: '9', flagged: true },
    VCM: { n: 72, raw: '72', flagged: false },
    Hto: { n: 28, raw: '28', flagged: false },
    Leu: { n: 14.2, raw: '14.2', flagged: true },
    Plt: { n: 90, raw: '90', flagged: false },
  });
  assert.ok(phrases.some(function (p) {
    return /anemia microcítica con Hb 9, VCM 72 y Hto 28/.test(p);
  }));
  assert.ok(phrases.some(function (p) {
    return /leucocitosis con Leu 14\.2/.test(p);
  }));
  assert.ok(phrases.every(function (p) {
    return p.indexOf('(') < 0;
  }));
});

test('interpretChemPhrases — elevado/disminuido, no alterado; glu por valor', () => {
  var phrases = interpretChemPhrases({
    Na: { n: 128, raw: '128', flagged: true },
    K: { n: 5.6, raw: '5.6', flagged: true },
    Glu: { n: 58, raw: '58', flagged: true },
    Cr: { n: 1.8, raw: '1.8', flagged: true },
    Alb: { n: 2.6, raw: '2.6', flagged: true },
    FA: { n: 273, raw: '273', flagged: true },
    BUN: { n: 5, raw: '5', flagged: true },
  });
  assert.ok(phrases.some(function (p) {
    return /hiponatremia con Na 128/.test(p);
  }));
  assert.ok(phrases.some(function (p) {
    return /hipoglucemia con Glu 58/.test(p);
  }));
  assert.ok(phrases.some(function (p) {
    return /albúmina disminuida con 2\.6/.test(p);
  }));
  assert.ok(phrases.some(function (p) {
    return /FA elevada con 273/.test(p);
  }));
  assert.ok(phrases.some(function (p) {
    return /BUN disminuido con 5/.test(p);
  }));
  assert.ok(phrases.every(function (p) {
    return !/alterado/i.test(p) && p.indexOf('(') < 0;
  }));
});

test('buildLabEventualidadInterpretText — prosa corrida hoy + BH/QS/cito', () => {
  var text = buildLabEventualidadInterpretText(
    [
      {
        fecha: TODAY,
        hora: '08:00',
        resLabs: [
          'BH\tHb 9.0* VCM 72 Hto 28 Leu 14.2* Plt 90',
          'QS\tNa 128* K 5.6* Glu 210* Cr 1.8*',
          'INTERPRETACIÓN CITOQUÍMICO:\tExudado por Light',
        ],
      },
      {
        fecha: '20/07/2026',
        hora: '10:00',
        resLabs: ['BH\tHb 7.0* VCM 70'],
      },
    ],
    { todayFecha: TODAY, normalizeFecha: identityNorm }
  );
  assert.match(text, /LABS 21\/07\/2026 08:00/);
  assert.match(text, /EN LA BIOMETRÍA SE APRECIA|EN LA BIOMETRIA SE APRECIA/);
  assert.match(text, /ANEMIA MICROCÍTICA|ANEMIA MICROCITICA/);
  assert.match(text, /EN LA QUÍMICA CLÍNICA SE APRECIA|EN LA QUIMICA CLINICA SE APRECIA/);
  assert.match(text, /HIPONATREMIA CON NA 128/);
  assert.match(text, /EXUDADO POR LIGHT/);
  assert.doesNotMatch(text, /HB 7/);
  assert.doesNotMatch(text, /\(/);
  assert.doesNotMatch(text, /\bMIXED\b/);
  assert.doesNotMatch(text, /ALTERADO/);
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
  assert.match(text, /ANEMIA MICROCÍTICA|ANEMIA MICROCITICA/);
});

test('buildLabEventualidadInterpretText — fallback compact when no abnormal phrases', () => {
  var text = buildLabEventualidadInterpretText(
    [{ fecha: TODAY, hora: '10:00', resLabs: ['BH\tHb 13.5 Leu 7 Plt 220'] }],
    {
      todayFecha: TODAY,
      normalizeFecha: identityNorm,
      includeFallbackCompact: true,
    }
  );
  assert.match(text, /EN LABORATORIO SE REGISTRAN/);
  assert.match(text, /HB 13\.5/);
});
