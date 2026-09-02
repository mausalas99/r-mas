import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  procesarLabs,
  parseEGO_,
  parsePlaquetasCitrato_,
  parseFrotisSangre_,
  parseElectrolitosOrina_,
} from './labs.js';

const EGO_ROGELIO = `
Expediente:\t1936787-7\tSolicitud:\t2605050872
Nombre:\tROGELIO GONZALEZ ESQUIVEL\tFecha Registro:\tMay 5 2026 8:29PM
Sexo:\tMASCULINO\tUbicación:\tSERVICIO CLÍNICO 2
Edad:\t81\tMedico:\tA QUIEN CORRESPONDA

URIANALISIS
EXAMEN GENERAL DE ORINA
Estudio\t\tResultado\tUnidades\tValor de Referencia
PH\t
A
7.0
5.5 - 6.5
DENSIDAD\t
*
1.010
1.005 - 1.025
PROTEINAS\t
*
NEGATIVO
ERITROCITOS\t
*
0
/CAMPO\t0-2/CAMPO
LEUCOCITOS\t
*
0
/CAMPO\t0-5/CAMPO
CELULAS EPITELIALES\t
*
ESCASAS
AUSENTES
`;

const PLT_CIT = `
Expediente:\t1936787-7
Nombre:\tROGELIO GONZALEZ ESQUIVEL\tFecha Registro:\tMay 17 2026 12:22PM
HEMATOLOGIA
PLAQUETAS CON CITRATO
CUENTA DE PLAQUETAS\t
*
14
K/UL\t
`;

describe('EGO no debe generar BH falso', () => {
  it('procesarLabs: solo EGO, sin línea BH', () => {
    const { resLabs } = procesarLabs(EGO_ROGELIO);
    assert.ok(!resLabs.some((l) => /^BH\t/.test(l)), 'no debe haber BH');
    assert.ok(resLabs.some((l) => l.startsWith('EGO:')));
  });

  it('parseEGO incluye sedimento y químico', () => {
    const ego = parseEGO_(EGO_ROGELIO);
    assert.match(ego, /pH 7\.0/);
    assert.match(ego, /Leu 0/);
    assert.match(ego, /Eri 0/);
  });
});

const EGO_CON_ELECTROLITOS = `${EGO_ROGELIO}
SODIO EN ORINA
*
40
135 - 145
POTASIO EN ORINA
*
20
CLORO EN ORINA: 90
`;

describe('Electrolitos urinarios: sección propia, no dentro de EGO', () => {
  it('parseElectrolitosOrina_ arma la línea EU', () => {
    const eu = parseElectrolitosOrina_(EGO_CON_ELECTROLITOS);
    assert.strictEqual(eu, 'EU\tNa 40 K 20 Cl 90');
  });

  it('parseEGO_ ya no incluye NaU/KU/ClU', () => {
    const ego = parseEGO_(EGO_CON_ELECTROLITOS);
    assert.doesNotMatch(ego, /NaU|KU|ClU/);
  });

  it('procesarLabs separa EGO: y EU\\t en filas distintas', () => {
    const { resLabs } = procesarLabs(EGO_CON_ELECTROLITOS);
    assert.ok(resLabs.some((l) => l.startsWith('EGO:')));
    assert.ok(resLabs.some((l) => l === 'EU\tNa 40 K 20 Cl 90'));
  });
});

describe('Plaquetas con citrato', () => {
  it('parsePlaquetasCitrato_ extrae conteo', () => {
    const line = parsePlaquetasCitrato_(PLT_CIT, PLT_CIT.replace(/\s+/g, ' '));
    assert.strictEqual(line, 'PltCit\tPlt 14*');
  });

  it('procesarLabs incluye PltCit', () => {
    const { resLabs } = procesarLabs(PLT_CIT);
    assert.ok(resLabs.some((l) => l === 'PltCit\tPlt 14*'));
    assert.ok(!resLabs.some((l) => /^BH\t/.test(l)));
  });
});

describe('Frotis: calidad vs plaquetas', () => {
  it('separa Cal y Plaq', () => {
    const out = parseFrotisSangre_(
      'FROTIS DE SANGRE PERIFERICA\n*\nHIPOCROMIA +., ANISOCITOSIS +, PLAQUETAS NORMALES EN CANTIDAD, SE OBSERVAN MACROPLAQUETAS.'
    );
    assert.match(out, /FROTIS\tCal .*HIPOCROMIA/);
    assert.match(out, /FROTIS\tPlaq .*PLAQUETAS/);
    assert.doesNotMatch(out, /FROTIS\tObs .*HIPOCROMIA/);
  });
});
