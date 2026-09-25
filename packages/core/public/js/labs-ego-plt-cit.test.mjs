import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  procesarLabs,
  parseEGO_,
  parsePlaquetasCitrato_,
  parseFrotisSangre_,
  parseElectrolitosOrina_,
  parseDepuracionCreatinina_,
  parseCuantOrina_,
} from './labs.js';

const EGO_ROGELIO = `
Expediente:\t9000099-7\tSolicitud:\t2605050872
Nombre:\tFICTICIO SINTETICO CASOZi\tFecha Registro:\tMay 5 2026 8:29PM
Sexo:\tMASCULINO\tUbicación:\tSERVICIO CLÍNICO 2
Edad:\t81\tMedico:\tFICTICIO SINTETICO EJEMPLO A

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
Expediente:\t9000099-7
Nombre:\tFICTICIO SINTETICO CASOZi\tFecha Registro:\tMay 17 2026 12:22PM
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

  it('ignora CREATININA EN ORINA cuando viene de una depuración de 24h', () => {
    const depuracion = EGO_ROGELIO + '\nDEPURACION DE CREATININA\nCREATININA EN ORINA\n*\n82.36\n';
    assert.strictEqual(parseElectrolitosOrina_(depuracion), '');
  });
});

const DEPURACION_Y_PROTEINAS = `
Expediente:\t9000098-1\tSolicitud:\t2609090907
Nombre:\tGENERICO SUPUESTO INVENTADO CASOZf\tFecha Registro:\tSep 9 2026 12:57PM
Sexo:\tMASCULINO\tUbicación:\tMEDICINA INTERNA 1
Edad:\t75\tMedico:\tFICTICIO SINTETICO EJEMPLO A

QUIMICA CLINICA
DEPURACION DE CREATININA
Estudio\t\tResultado\tUnidades\tValor de Referencia
VOLUMEN EN ORINA\t
A
100
mls.\tN/A
TIEMPO\t
A
1440
min.\tN/A
DEPURACION DE CREATININA\t
B
0.98
ml/min.\t72.00 - 141.00
CREATININA SERICA\t
A
5.8
mg/dL\t0.6 - 1.4
CREATININA EN ORINA\t
*
82.36

URIANALISIS
CUANTIFICACION PROTEINAS EN ORINA 12 O 24 HRS
Estudio\t\tResultado\tUnidades\tValor de Referencia
VOLUMEN DE ORINA\t
A
100
ml\tN/A
RESULTADO\t
A
0.09
gr/vol\tNEGATIVO
OBSERVACIONES\t
*
`;

describe('Depuración de creatinina 24h: fila propia con tiempo, depuración, CrS y CrU', () => {
  it('parseDepuracionCreatinina_ arma la línea DepCr', () => {
    const line = parseDepuracionCreatinina_(DEPURACION_Y_PROTEINAS);
    assert.strictEqual(line, 'DepCr\tTiempo 1440min Dep 0.98ml/min CrS 5.8 CrU 82.36');
  });

  it('no arma línea si no hay depuración de creatinina en el texto', () => {
    assert.strictEqual(parseDepuracionCreatinina_(EGO_ROGELIO), '');
  });

  it('parseCuantOrina_ agrega el índice proteína/creatinina (IPC) convirtiendo gr/vol a mg/dL', () => {
    // proteína: 0.09 g en 100 ml (=1 dL) → 90 mg/dL; CrU: 82.36 mg/dL → IPC = 90 / 82.36
    const line = parseCuantOrina_(DEPURACION_Y_PROTEINAS);
    assert.strictEqual(line, 'Prot24h\tVol 100ml Prot 0.09* gr/vol IPC 1.09');
  });

  it('procesarLabs incluye la fila DepCr junto con Prot24h', () => {
    const { resLabs } = procesarLabs(DEPURACION_Y_PROTEINAS);
    assert.ok(resLabs.some((l) => l.startsWith('DepCr\t')));
    assert.ok(resLabs.some((l) => l.startsWith('Prot24h\t')));
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
