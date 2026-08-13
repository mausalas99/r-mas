import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { collectEaGlanceSoap } from './ea-glance-meds.mjs';

describe('collectEaGlanceSoap', () => {
  it('keeps confirmed EA meds', () => {
    const soap = collectEaGlanceSoap({
      estadoClinico: { diureticos: 'Furosemida 40 mg | Espironolactona 25 mg' },
    });
    assert.deepEqual(soap.diureticos, ['Furosemida 40 mg', 'Espironolactona 25 mg']);
  });

  it('includes pending receta proposals', () => {
    const soap = collectEaGlanceSoap({
      estadoClinico: {},
      pendienteReceta: { abx: 'LINEZOLID 600MG VO C/12H' },
    });
    assert.equal(soap.abx.length, 1);
    assert.match(soap.abx[0], /LINEZOLID/i);
  });

  it('pulls active receta items even when EA fields are empty', () => {
    const soap = collectEaGlanceSoap({
      estadoClinico: { nm: 'Rescates DE Insulina' },
      recetaItems: [
        {
          id: 'a',
          nombreRaw: 'LINEZOLID 600 MG',
          dosisRaw: '600 MG',
          viaRaw: 'VO',
          frecuenciaRaw: 'CADA 12 HORAS',
        },
        {
          id: 'b',
          nombreRaw: 'BISOPROLOL 2.5 MG',
          dosisRaw: '2.5 MG',
          viaRaw: 'VO',
          frecuenciaRaw: 'CADA 24 HORAS',
        },
        {
          id: 'c',
          nombreRaw: 'OMEPRAZOL 20 MG',
          suspendido: true,
        },
      ],
    });
    assert.ok(soap.nm && soap.nm.some((s) => /Rescates/i.test(s)));
    assert.ok(soap.abx && soap.abx.some((s) => /LINEZOLID/i.test(s)));
    assert.ok(soap.antihta && soap.antihta.some((s) => /BISOPROLOL/i.test(s)));
    assert.equal(JSON.stringify(soap).includes('OMEPRAZOL'), false);
  });

  it('dedupes the same drug from EA and receta', () => {
    const soap = collectEaGlanceSoap({
      estadoClinico: { diureticos: 'FUROSEMIDA 40MG VO C/24H' },
      recetaItems: [
        {
          id: 'd',
          nombreRaw: 'FUROSEMIDA 40 MG',
          dosisRaw: '40 MG',
          viaRaw: 'VO',
          frecuenciaRaw: 'CADA 24 HORAS',
        },
      ],
    });
    assert.equal(soap.diureticos.length, 1);
  });
});
