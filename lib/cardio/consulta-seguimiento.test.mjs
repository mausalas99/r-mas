import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyConsultaEntry,
  upsertConsultaEntry,
  seedConsultaFromLastRonda,
} from './consulta-seguimiento.mjs';

test('emptyConsultaEntry has snapshot fields and gdmt sub-object', () => {
  const c = emptyConsultaEntry();
  assert.equal(c.date, '');
  assert.equal(c.faseSeguimiento, '');
  assert.deepEqual(c.comorbilidades, []);
  assert.equal(c.fenotipo, '');
  assert.equal(c.etiologia, '');
  assert.equal(c.ritmo, '');
  assert.deepEqual(c.gdmtMaxTolerada, {
    ieca_ara: null,
    arni: null,
    sglt2: null,
    arm: null,
    bb: null,
    asa: null,
  });
});

test('upsertConsultaEntry replaces same-day entry and sorts by date', () => {
  let list = [];
  list = upsertConsultaEntry(list, { date: '2026-03-14', faseSeguimiento: 'Optimización/estable' });
  list = upsertConsultaEntry(list, { date: '2026-01-10', faseSeguimiento: 'Titulación de TMO' });
  list = upsertConsultaEntry(list, { date: '2026-03-14', faseSeguimiento: 'IC avanzada' });
  assert.equal(list.length, 2);
  assert.equal(list[0].date, '2026-01-10');
  assert.equal(list[1].date, '2026-03-14');
  assert.equal(list[1].faseSeguimiento, 'IC avanzada');
});

test('upsertConsultaEntry preserves fields and gdmt flags omitted from update', () => {
  let list = [];
  list = upsertConsultaEntry(list, {
    date: '2026-03-14',
    subjetivo: 'disnea leve',
    gdmtMaxTolerada: { bb: true, arm: false },
  });
  list = upsertConsultaEntry(list, { date: '2026-03-14', objetivo: 'sin edema' });
  assert.equal(list[0].subjetivo, 'disnea leve');
  assert.equal(list[0].objetivo, 'sin edema');
  assert.equal(list[0].gdmtMaxTolerada.bb, true);
  assert.equal(list[0].gdmtMaxTolerada.arm, false);
});

test('seedConsultaFromLastRonda falls through to empty defaults when rondasByDay is missing/empty', () => {
  assert.deepEqual(seedConsultaFromLastRonda({}), emptyConsultaEntry());
  assert.deepEqual(seedConsultaFromLastRonda({ rondasByDay: [] }), emptyConsultaEntry());
  assert.deepEqual(seedConsultaFromLastRonda(null), emptyConsultaEntry());
});

test('seedConsultaFromLastRonda copies top-level snapshot fields and last ronda date', () => {
  const cardio = {
    fenotipo: 'HFrEF',
    etiologia: 'Isquémica',
    ritmo: 'Sinusal',
    rondasByDay: [
      { date: '2026-01-05' },
      { date: '2026-01-08' },
      { date: '2026-01-02' },
    ],
  };
  const seed = seedConsultaFromLastRonda(cardio);
  assert.equal(seed.fenotipo, 'HFrEF');
  assert.equal(seed.etiologia, 'Isquémica');
  assert.equal(seed.ritmo, 'Sinusal');
  assert.equal(seed.ultimoInternamientoFecha, '2026-01-08');
  assert.equal(seed.faseSeguimiento, '');
});

test('seedConsultaFromLastRonda is a per-visit snapshot, not a live reference', () => {
  const cardio = {
    fenotipo: 'HFrEF',
    etiologia: '',
    ritmo: '',
    rondasByDay: [{ date: '2026-01-05' }],
  };
  const seed = seedConsultaFromLastRonda(cardio);
  cardio.fenotipo = 'HFimpEF';
  assert.equal(seed.fenotipo, 'HFrEF');
});
