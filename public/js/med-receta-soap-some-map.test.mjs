import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyBySomeCatalog, isSuerosMedicationNombre } from './med-receta-soap-some-map.mjs';
import { normalizeNombreForSoapClassify } from './med-receta-nombre.mjs';
import {
  classifyMedicationSoapCategory,
  shouldIncludeMedicationInSoap,
} from './med-receta-soap.mjs';

function n(nombre) {
  return normalizeNombreForSoapClassify(nombre);
}

describe('classifyBySomeCatalog — grafías SOME', () => {
  it('mapea huecos frecuentes del formulario', () => {
    assert.equal(classifyBySomeCatalog(n('KETOROLACO 30 MG')), 'analgesia');
    assert.equal(classifyBySomeCatalog(n('CEFEPIMA 2 G')), 'abx');
    assert.equal(classifyBySomeCatalog(n('DICLOXACILINA 500 MG')), 'abx');
    assert.equal(classifyBySomeCatalog(n('VALGANCICLOVIR 450 MG')), 'abx');
    assert.equal(classifyBySomeCatalog(n('ARIPIPRAZOL 10 MG')), 'sedacion');
    assert.equal(classifyBySomeCatalog(n('ALPRAZOLAM 0.5 MG')), 'sedacion');
    assert.equal(classifyBySomeCatalog(n('ZOLPIDEM 10 MG')), 'sedacion');
    assert.equal(classifyBySomeCatalog(n('CLOZAPINA 25 MG')), 'sedacion');
    assert.equal(classifyBySomeCatalog(n('ACIDO VALPROICO 500 MG')), 'antiepilepticos');
    assert.equal(classifyBySomeCatalog(n('DAPAGLIFOZINA 10 MG')), 'nm');
    assert.equal(classifyBySomeCatalog(n('SIMVASTATINA 20 MG')), 'estatinas');
    assert.equal(classifyBySomeCatalog(n('MONONITRATO DE ISOSORBIDA 20 MG')), 'antihta');
    assert.equal(classifyBySomeCatalog(n('FIMASARTAN 60 MG')), 'antihta');
    assert.equal(classifyBySomeCatalog(n('LEVOSIMENDAN 12.5 MG')), 'vasop');
    assert.equal(classifyBySomeCatalog(n('PARNAPARINA 4250 UI')), 'anticoagulacion');
    assert.equal(classifyBySomeCatalog(n('BENZONATATO 100 MG')), 'viaAerea');
    assert.equal(classifyBySomeCatalog(n('DIFENIDOL 25 MG')), 'antiemeticos');
    assert.equal(classifyBySomeCatalog(n('APREPITANT 125 MG')), 'antiemeticos');
    assert.equal(classifyBySomeCatalog(n('CLONIXINATO DE LISINA 125 MG')), 'analgesia');
  });

  it('no inventa destino para un fármaco desconocido', () => {
    assert.equal(classifyBySomeCatalog(n('FARMACO SIN LISTA XYZ')), '');
  });
});

describe('isSuerosMedicationNombre', () => {
  it('excluye Hartmann, NaCl 0.9%, glucosa 5/10% y agua inyectable', () => {
    assert.equal(isSuerosMedicationNombre('SOLUCION HARTMANN 1000 ML'), true);
    assert.equal(isSuerosMedicationNombre('RINGER LACTATO 500 ML'), true);
    assert.equal(isSuerosMedicationNombre('CLORURO DE SODIO 0.9% 500 ML'), true);
    assert.equal(isSuerosMedicationNombre('NACL 0.9 % SOL INY'), true);
    assert.equal(isSuerosMedicationNombre('GLUCOSA 5% 1000 ML'), true);
    assert.equal(isSuerosMedicationNombre('DEXTROSA 10 % 500 ML'), true);
    assert.equal(isSuerosMedicationNombre('AGUA INYECTABLE 10 ML'), true);
  });

  it('deja pasar NaCl hipertónico y KCl', () => {
    assert.equal(isSuerosMedicationNombre('CLORURO DE SODIO 3% 100 ML'), false);
    assert.equal(isSuerosMedicationNombre('CLORURO DE POTASIO 20 MEQ'), false);
  });
});

describe('classifyMedicationSoapCategory — fallback SOME tras heurísticas', () => {
  it('clasifica grafías SOME que las heurísticas no cubren', () => {
    assert.equal(classifyMedicationSoapCategory('KETOROLACO 30 MG'), 'analgesia');
    assert.equal(classifyMedicationSoapCategory('CEFEPIMA 2 G'), 'abx');
    assert.equal(classifyMedicationSoapCategory('DICLOXACILINA 500 MG'), 'abx');
    assert.equal(classifyMedicationSoapCategory('ARIPIPRAZOL 10 MG'), 'sedacion');
    assert.equal(classifyMedicationSoapCategory('ALPRAZOLAM 0.5 MG'), 'sedacion');
    assert.equal(classifyMedicationSoapCategory('ZOLPIDEM 10 MG'), 'sedacion');
    assert.equal(classifyMedicationSoapCategory('ACIDO VALPROICO 500 MG'), 'antiepilepticos');
    assert.equal(classifyMedicationSoapCategory('DAPAGLIFOZINA 10 MG'), 'nm');
    assert.equal(classifyMedicationSoapCategory('SIMVASTATINA 20 MG'), 'estatinas');
    assert.equal(classifyMedicationSoapCategory('MONONITRATO DE ISOSORBIDA 20 MG'), 'antihta');
    assert.equal(classifyMedicationSoapCategory('CLORURO DE SODIO 3%'), 'nm');
  });

  it('conserva heurísticas clínicas por encima del catálogo', () => {
    assert.equal(classifyMedicationSoapCategory('SERTRALINA 50 MG'), 'nm');
    assert.equal(classifyMedicationSoapCategory('FARMACO SIN LISTA XYZ'), 'otros');
    assert.equal(
      classifyMedicationSoapCategory('ACIDO ACETIL SALICILICO 100 MG TABLETA', '100 MG'),
      'antitromboticos'
    );
  });
});

describe('shouldIncludeMedicationInSoap — sueros fuera de EA', () => {
  it('excluye Hartmann y NaCl 0.9%', () => {
    assert.equal(
      shouldIncludeMedicationInSoap({ nombreRaw: 'SOLUCION HARTMANN 1000 ML' }),
      false
    );
    assert.equal(
      shouldIncludeMedicationInSoap({ nombreRaw: 'CLORURO DE SODIO 0.9% 500 ML' }),
      false
    );
  });

  it('incluye NaCl hipertónico', () => {
    assert.equal(
      shouldIncludeMedicationInSoap({ nombreRaw: 'CLORURO DE SODIO 3% 100 ML' }),
      true
    );
  });
});

describe('shouldIncludeMedicationInSoap — apoyo (oxígeno) fuera de EA', () => {
  it('excluye oxígeno, es apoyo, no medicamento', () => {
    assert.equal(
      shouldIncludeMedicationInSoap({ nombreRaw: 'OXIGENO · MASCARILLA RESERVORIO 10 L/MIN' }),
      false
    );
  });

  it('no afecta un medicamento real', () => {
    assert.equal(
      shouldIncludeMedicationInSoap({ nombreRaw: 'SALBUTAMOL 2 DISPAROS C/6 H' }),
      true
    );
  });
});
