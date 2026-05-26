import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRenalLabContext,
  parseRenalBands,
  matchRenalBand,
  resolveAtbRenalGuidance,
  drugToSomeOrderAtb,
} from './manejo-atb-renal.mjs';
import { drugToSomeOrder } from './manejo-some-format.mjs';

test('getRenalLabContext lee eTFG del QS', () => {
  var ctx = getRenalLabContext(
    {
      fecha: '24/05/2026',
      parsedBySection: { QS: { eTFG: 42, Cr: 1.4 } },
    },
    { edad: '70', sexo: 'M' }
  );
  assert.equal(ctx.egfr, 42);
  assert.equal(ctx.creatinineMgDl, 1.4);
  assert.equal(ctx.source, 'lab');
});

test('getRenalLabContext calcula eTFG si falta en QS', () => {
  var ctx = getRenalLabContext(
    {
      fecha: '24/05/2026',
      parsedBySection: { QS: { Cr: 1.0 } },
    },
    { edad: '50', sexo: 'M' }
  );
  assert.ok(ctx.egfr > 60 && ctx.egfr < 95);
  assert.equal(ctx.source, 'computed');
});

test('matchRenalBand aplica rangos ClCr', () => {
  var bands = parseRenalBands('ClCr 10–20: 500 mg c/12h; ClCr <10: 500 mg c/24h');
  assert.equal(matchRenalBand(15, bands).text, '500 mg c/12h');
  assert.equal(matchRenalBand(8, bands).text, '500 mg c/24h');
});

test('resolveAtbRenalGuidance enriquece SOME', () => {
  var drug = {
    name: 'Meropenem',
    adultDose: '1 g IV c/8h',
    route: 'IV',
    renalNote: 'ClCr 10–20: 500 mg c/12h; ClCr <10: 500 mg c/24h',
  };
  var g = resolveAtbRenalGuidance(drug, { egfr: 12, creatinineMgDl: 2.1, fecha: '24/05' });
  assert.match(g.adjustment, /500 mg c\/12h/);
  assert.match(g.someComment, /eTFG 12/);

  var order = drugToSomeOrderAtb(drug, null, { egfr: 12 }, drugToSomeOrder);
  assert.match(String(order.comments), /eTFG 12/);
});
