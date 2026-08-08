import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyIvToOralForEgreso,
  shouldSkipIvToOral,
} from './med-receta-iv-oral.mjs';
import {
  formatMedicationEgresoLine,
  formatMedicationSoapShort,
} from './med-receta-format.mjs';

describe('med-receta-iv-oral', () => {
  it('paracetamol 1g IV → 500mg VO', () => {
    var item = {
      nombreRaw: 'PARACETAMOL 1 G SOL INY 100 ML (*)',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '1 G //',
      frecuenciaRaw: 'CADA 8 HORAS',
    };
    var out = applyIvToOralForEgreso(item);
    assert.equal(out.viaRaw, 'VIA ORAL');
    assert.match(out.nombreRaw, /500\s*MG\s+TABLETA/i);
    assert.match(out.dosisRaw, /500\s*MG/i);
    assert.equal(
      formatMedicationSoapShort(item),
      'PARACETAMOL 500MG VO C/8H'
    );
  });

  it('omeprazol y metronidazol IV → VO misma dosis', () => {
    var ome = applyIvToOralForEgreso({
      nombreRaw: 'OMEPRAZOL 40 MG SOL INY 10 ML (*)',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '40 MG //',
      frecuenciaRaw: 'CADA 24 HORAS',
    });
    assert.match(ome.nombreRaw, /OMEPRAZOL 40 MG TABLETA/i);
    assert.equal(ome.viaRaw, 'VIA ORAL');

    var metro = applyIvToOralForEgreso({
      nombreRaw: 'METRONIDAZOL 500 MG SOL INY 100 ML (*)',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '500 MG // *DIA# 3*',
      frecuenciaRaw: 'CADA 8 HORAS',
      diaTratamiento: 3,
    });
    assert.match(metro.nombreRaw, /METRONIDAZOL 500 MG TABLETA/i);
    assert.equal(formatMedicationSoapShort(metro), 'METRONIDAZOL 500MG VO C/8H DIA 3');
  });

  it('ketorolaco 30mg IV → 10mg VO', () => {
    var out = applyIvToOralForEgreso({
      nombreRaw: 'KETOROLACO 30 MG SOL INY',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '30 MG //',
      frecuenciaRaw: 'CADA 8 HORAS',
    });
    assert.match(out.nombreRaw, /KETOROLACO 10 MG TABLETA/i);
    assert.equal(formatMedicationSoapShort(out), 'KETOROLACO 10MG VO C/8H');
  });

  it('ondansetron PRN conserva criterio', () => {
    var line = formatMedicationEgresoLine({
      nombreRaw: 'ONDANSETRON 8 MG SOL INY 4 ML',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '8 MG // CRITERIO PRN: EN CASO DE NAUSEAS O VÓMITO, CADA 8 HRS',
      frecuenciaRaw: 'PRN',
    });
    assert.match(line, /ONDANSETRÓN 8 MG TABLETA/i);
    assert.match(line, /TOMAR 1 TABLETA \(8 MG\) VÍA ORAL/i);
    assert.match(line, /NÁUSEA O VÓMITO/i);
  });

  it('no convierte vasopresores, dextrosa ni meropenem', () => {
    var dextrosa = {
      nombreRaw: 'DEXTROSA 50 % SOL INY 50 ML',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '50 ML // CRITERIO PRN: EN CASO DE HIPOGLUCEMIA <70',
      frecuenciaRaw: 'PRN',
    };
    assert.equal(applyIvToOralForEgreso(dextrosa).viaRaw, 'VIA INTRAVENOSA');

    var meropenem = {
      nombreRaw: 'MEROPENEM 1 G',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '1 G //',
      frecuenciaRaw: 'CADA 8 HORAS',
    };
    assert.equal(applyIvToOralForEgreso(meropenem).viaRaw, 'VIA INTRAVENOSA');
    assert.equal(shouldSkipIvToOral(meropenem), true);

    var norepi = {
      nombreRaw: 'NOREPINEFRINA 4 MG',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '5 MCG/MIN // VEL.INF: 5 MCG/MIN',
      frecuenciaRaw: 'CADA 24 HORAS',
    };
    assert.equal(applyIvToOralForEgreso(norepi).viaRaw, 'VIA INTRAVENOSA');
  });

  it('ciprofloxacino 400mg IV → 500mg VO', () => {
    var out = applyIvToOralForEgreso({
      nombreRaw: 'CIPROFLOXACINO 400 MG SOL INY',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '400 MG //',
      frecuenciaRaw: 'CADA 12 HORAS',
    });
    assert.match(out.nombreRaw, /CIPROFLOXACINO 500 MG TABLETA/i);
  });

  it('opts.ivOral false conserva IV', () => {
    var item = {
      nombreRaw: 'PARACETAMOL 1 G SOL INY',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '1 G //',
      frecuenciaRaw: 'CADA 8 HORAS',
    };
    assert.equal(formatMedicationSoapShort(item, { ivOral: false }), 'PARACETAMOL 1 G IV C/8H');
  });
});
