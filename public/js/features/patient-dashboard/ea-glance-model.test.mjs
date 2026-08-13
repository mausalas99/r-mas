import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildEaGlance, glanceMedName } from './ea-glance-model.mjs';

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
    assert.deepEqual(
      glance.soap.find((s) => s.label === 'Diuréticos').items,
      ['Furosemida'],
    );
    assert.equal(glance.soap.find((s) => s.label === 'Diuréticos').hue, 200);
    assert.equal(glance.soap.find((s) => s.label === 'NM').hue, 52);
  });

  it('keeps only the drug name from SOAP fragments', () => {
    assert.equal(
      glanceMedName('BUPRENORFINA 75MCG C/8H EN CASO DE DOLOR LEVE O FIEBRE'),
      'Buprenorfina',
    );
    assert.equal(glanceMedName('LINEZOLID 600MG VO C/12H DIA 5'), 'Linezolid');
    assert.equal(glanceMedName('SACUBITRILO VALSARTAN 50MG VO'), 'Sacubitrilo Valsartan');
    assert.equal(glanceMedName('ASA 100 mg'), 'ASA');
    assert.equal(glanceMedName('Insulina glargina'), 'Insulina Glargina');
    assert.equal(glanceMedName('RESCATES DE INSULINA'), 'Rescates de Insulina');
    assert.equal(
      glanceMedName('INSULINA PREPRANDIAL: 8 UI SC PREVIO A COMIDAS'),
      'Insulina Preprandial',
    );
    assert.equal(
      glanceMedName('REPOSICIÓN DE POTASIO: CLORURO DE POTASIO 40 MEQ'),
      'Reposición de Potasio',
    );
    assert.equal(glanceMedName('Gluconato DE Calcio'), 'Gluconato de Calcio');
    assert.equal(
      glanceMedName('IPRATROPIO/SALBUTAMOL 0.5/2.5 MG SOLUCION'),
      'Ipratropio/Salbutamol',
    );
    assert.equal(
      glanceMedName('Ipratropio/salbutamol 0.5/2.5 Mg Solucion'),
      'Ipratropio/Salbutamol',
    );
    assert.equal(glanceMedName('CLORURO DE SODIO HIPERT. 17.7%'), 'Hiperton');
    assert.equal(glanceMedName('CLORURO DE SODIO HIPERTONICO 17.7 % NEB'), 'Hiperton');
    assert.equal(glanceMedName('NACL 17.7% NEBULIZAR'), 'Hiperton');
    const glance = buildEaGlance({
      soap: {
        analgesicos: ['PARACETAMOL 500MG C/8H EN CASO DE DOLOR LEVE O FIEBRE'],
      },
    });
    assert.deepEqual(glance.soap[0].items, ['Paracetamol']);
  });

  it('title-cases dieta for the KPI', () => {
    const glance = buildEaGlance({
      dieta: 'HIPOSODICA-HIPOGRASA DIABETICA',
    });
    assert.equal(
      glance.kpis.find((k) => k.label === 'Dieta').value,
      'Hiposodica-Hipograsa Diabetica',
    );
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

  it('collapses glargina + rapida into Plan Basal Bolo and keeps rescates', () => {
    const glance = buildEaGlance({
      soap: {
        nm: [
          'INSULINA GLARGINA 20 UI SC NOCTURNA',
          'INSULINA PREPRANDIAL: 8 UI SC PREVIO A COMIDAS',
          'RESCATES DE INSULINA',
          'GLUCONATO DE CALCIO 1 G',
        ],
      },
    });
    assert.deepEqual(glance.soap[0].items, [
      'Plan Basal Bolo',
      'Rescates de Insulina',
      'Gluconato de Calcio',
    ]);
  });

  it('does not invent Plan Basal Bolo when only glargina is present', () => {
    const glance = buildEaGlance({
      soap: { nm: ['INSULINA GLARGINA 20 UI'] },
    });
    assert.deepEqual(glance.soap[0].items, ['Insulina Glargina']);
  });
});
