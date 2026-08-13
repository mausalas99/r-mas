import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEaGlance } from './ea-glance-model.mjs';

describe('EA glance', () => {
  it('emits up to four plan-of-care KPIs and never vitals', () => {
    const glance = buildEaGlance({
      soporte: 'Puntillas nasales',
      soporteLitros: '2',
      dieta: 'Hiposódica',
      bombaOn: true,
      bombaRate: '2 U/h',
      pafi: 210,
      soap: {
        diureticos: ['Furosemida 40 mg'],
        antihta: ['Enalapril 10 mg'],
        antitromboticos: ['ASA 100 mg'],
        nm: ['Insulina glargina'],
      },
      vitals: { tas: 110, fc: 88 },
    });
    assert.deepEqual(glance.kpis.map((k) => k.label), ['Soporte', 'PaFi', 'Dieta', 'Bomba']);
    assert.equal(glance.kpis.length, 4);
    const dumped = JSON.stringify(glance);
    assert.equal(dumped.includes('110'), false);
    assert.equal(dumped.includes('"fc"'), false);
    assert.equal(dumped.includes('"tas"'), false);
    const soapLabels = glance.soap.map((s) => s.label);
    assert.ok(soapLabels.includes('Diuréticos'));
    assert.ok(soapLabels.includes('Antihipertensivos'));
    assert.ok(soapLabels.includes('Tromboprofilaxis'));
    assert.equal(soapLabels.includes('NM'), true);
  });

  it('omits PaFi when it is not computable', () => {
    const glance = buildEaGlance({
      soporte: 'Aire ambiente',
      dieta: 'Hiposódica',
      bombaOn: false,
      pafi: null,
      soap: {},
    });
    assert.equal(glance.kpis.some((k) => k.label === 'PaFi'), false);
    assert.equal(glance.kpis.some((k) => k.label === 'Bomba'), false);
    assert.deepEqual(glance.soap, []);
  });
});
