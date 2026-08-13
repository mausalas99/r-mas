import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickOralPackFromStrengths,
  pickSomeOralPack,
  pluralizeOralForm,
} from './med-receta-iv-oral-some.mjs';
import { applyIvToOralForEgreso } from './med-receta-iv-oral.mjs';
import { formatMedicationEgresoLine, formatMedicationSoapShort } from './med-receta-format.mjs';

describe('pickSomeOralPack', () => {
  it('paracetamol 1 g → 2 tabletas de 500 mg', () => {
    var pack = pickSomeOralPack('PARACETAMOL', 1000);
    assert.deepEqual(pack, { unitMg: 500, units: 2, form: 'TABLETA' });
  });

  it('omeprazol 40 mg → 2 cápsulas de 20 mg', () => {
    var pack = pickSomeOralPack('OMEPRAZOL', 40);
    assert.deepEqual(pack, { unitMg: 20, units: 2, form: 'CÁPSULA' });
  });

  it('no inventa fracciones (metronidazol 500 vs cápsula 400)', () => {
    assert.equal(pickSomeOralPack('METRONIDAZOL', 500), null);
  });

  it('respeta tope de 4 unidades', () => {
    assert.equal(
      pickOralPackFromStrengths(25, [{ mg: 5, form: 'TABLETA' }]),
      null
    );
  });
});

describe('pluralizeOralForm', () => {
  it('pluraliza tableta y cápsula', () => {
    assert.equal(pluralizeOralForm('TABLETA', 1), 'TABLETA');
    assert.equal(pluralizeOralForm('TABLETA', 2), 'TABLETAS');
    assert.equal(pluralizeOralForm('CÁPSULA', 2), 'CÁPSULAS');
  });
});

describe('applyIvToOralForEgreso — equivalencias SOME', () => {
  it('dexametasona 8 mg IV → 2 tabletas de 4 mg', () => {
    var out = applyIvToOralForEgreso({
      nombreRaw: 'DEXAMETASONA 8 MG SOL INY',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '8 MG //',
      frecuenciaRaw: 'CADA 24 HORAS',
    });
    assert.match(out.nombreRaw, /DEXAMETASONA 4 MG TABLETA/i);
    assert.match(out.dosisRaw, /^8\s*MG\b/i);
    assert.equal(out.oralEquiv.units, 2);
    assert.equal(
      formatMedicationSoapShort({
        nombreRaw: 'DEXAMETASONA 8 MG SOL INY',
        viaRaw: 'VIA INTRAVENOSA',
        dosisRaw: '8 MG //',
        frecuenciaRaw: 'CADA 24 HORAS',
      }),
      'DEXAMETASONA 8MG VO C/24H (2 TABLETAS DE 4MG)'
    );
  });

  it('egreso paracetamol conserva 1 g y pide 2 tabletas', () => {
    var line = formatMedicationEgresoLine({
      nombreRaw: 'PARACETAMOL 1 G SOL INY 100 ML (*)',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '1 G //',
      frecuenciaRaw: 'CADA 8 HORAS',
    });
    assert.equal(
      line,
      'PARACETAMOL 500 MG TABLETA || TOMAR 2 TABLETAS (1 G) VÍA ORAL CADA 8 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.'
    );
  });
});
