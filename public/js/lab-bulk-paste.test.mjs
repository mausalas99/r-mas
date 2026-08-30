import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let store = {};
const mockStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});
globalThis.window = { localStorage: mockStorage };

const {
  LAB_BULK_PATIENT_SEPARATOR,
  isLabBulkPatientSeparatorLine,
  splitBulkLabTextByPatient,
  splitSomeReportsInBlock,
  buildBulkLabPreview,
  mergeBulkParseResults,
  mergeBulkParseResultsForStorage,
  dedupeConsolidatedLabRows,
  pickLatestDayMergedLabDisplay,
  shouldShowBulkLabPreview,
  extractLabPatientFromBulkBlock,
  mixedExpedienteWarning,
} = await import('./lab-bulk-paste.mjs');
const { procesarLabs } = await import('./labs.js');
const { primaryTipoForLabSet, isGasometriaOnlyResLabs } = await import('./lab-history-format.mjs');
const { GASO_VENOSA_SOLO } = await import('./labs-procesar-fixtures.mjs');
const { DEMO_SOME_LAB_REPORT, OLDER_DEMO_SOME_LAB_REPORT } = await import('./tour-demo-some-lab.mjs');

function primaryTipoForResLabs(resLabs) {
  return primaryTipoForLabSet(resLabs);
}

describe('lab-bulk-paste split helpers', () => {
  beforeEach(() => {
    store = {};
  });

  it('isLabBulkPatientSeparatorLine reconoce separador de paciente', () => {
    assert.equal(isLabBulkPatientSeparatorLine('--- PACIENTE ---'), true);
    assert.equal(isLabBulkPatientSeparatorLine('  --- paciente ---  '), true);
    assert.equal(isLabBulkPatientSeparatorLine('--- PACIENTE --- extra'), false);
  });

  it('splitBulkLabTextByPatient parte bloques por separador', () => {
    var text =
      DEMO_SOME_LAB_REPORT +
      '\n' +
      LAB_BULK_PATIENT_SEPARATOR +
      '\n' +
      OLDER_DEMO_SOME_LAB_REPORT.replace('0008421-7', '1111111-1');
    var blocks = splitBulkLabTextByPatient(text);
    assert.equal(blocks.length, 2);
    assert.match(blocks[0], /0008421-7/);
    assert.match(blocks[1], /1111111-1/);
  });

  it('splitSomeReportsInBlock separa varios reportes SOME', () => {
    var block = DEMO_SOME_LAB_REPORT + '\n\n' + OLDER_DEMO_SOME_LAB_REPORT;
    var reports = splitSomeReportsInBlock(block);
    assert.equal(reports.length, 2);
    assert.match(reports[0], /Apr 11 2026/);
    assert.match(reports[1], /Mar 05 2026/);
  });

  it('splitSomeReportsInBlock tolera espacio antes de Expediente:', () => {
    var glued =
      'LIPASA SERICA\t1244 U/L 8 - 57\n Expediente:\t1111111-1\tSolicitud:\t1\nNombre:\tDemo';
    var reports = splitSomeReportsInBlock(glued);
    assert.equal(reports.length, 2);
    assert.match(reports[1], /1111111-1/);
  });
});

describe('lab-bulk-paste merge and consolidation', () => {
  beforeEach(() => {
    store = {};
  });

  it('pickLatestDayMergedLabDisplay consolida solo el día más reciente', () => {
    var block = DEMO_SOME_LAB_REPORT + '\n\n' + OLDER_DEMO_SOME_LAB_REPORT;
    var items = splitSomeReportsInBlock(block)
      .map(function (text) {
        return { result: procesarLabs(text), reportText: text };
      })
      .filter(function (item) {
        return item.result.resLabs && item.result.resLabs.length;
      });
    var display = pickLatestDayMergedLabDisplay(items);
    assert.ok(display);
    assert.match(display.fecha || display.patient.fecha, /04\/11\/2026|11\/04\/2026/);
    assert.ok(
      display.resLabs.some(function (row) {
        return /^QS\b/i.test(String(row));
      }),
      'debe incluir química del día reciente'
    );
    var perDaySets = mergeBulkParseResults(items);
    assert.equal(perDaySets.length, 2, 'varios días en historial: un conjunto por día, sin fusionar');
  });

  it('mergeBulkParseResults consolida mismo día si están a ≤2 h', () => {
    var dupDay = DEMO_SOME_LAB_REPORT.replace('9:42AM', '10:15AM');
    var items = [DEMO_SOME_LAB_REPORT, dupDay].map(function (text) {
      return { result: procesarLabs(text), reportText: text };
    });
    var merged = mergeBulkParseResults(items);
    assert.equal(merged.length, 1);
    assert.ok(merged[0].resLabs.length > 0);
  });

  it('dedupeConsolidatedLabRows une COAG por analito (Fib no se pierde ante TP/TTP)', () => {
    var out = dedupeConsolidatedLabRows(
      ['COAG\tFib 283', 'COAG\tTP 14.2*  TTP 30.9  INR 1.22*', 'BH\tHb 12.8  Leu 14.4*'],
      'labs'
    );
    var coag = out.find(function (r) {
      return /^COAG\t/i.test(String(r));
    });
    assert.ok(coag, 'debe haber una sola fila COAG');
    assert.match(coag, /\bFib\s+283\b/);
    assert.match(coag, /\bTP\s+14\.2/);
    assert.match(coag, /\bTTP\s+30\.9/);
    assert.match(coag, /\bINR\s+1\.22/);
    assert.equal(
      out.filter(function (r) {
        return /^COAG\t/i.test(String(r));
      }).length,
      1
    );
  });

  it('mergeBulkParseResults conserva Fib al consolidar con TP/TTP ≤2 h (Actualizar labs)', () => {
    var fib = `Expediente:\t1012799-0\tSolicitud:\t2608040879
Nombre:\tJOSEFINA HERNANDEZ TRINIDAD\tFecha Registro:\tAug 4 2026 1:19PM
HEMATOLOGIA
FIBRINOGENO
Estudio\t\tResultado\tUnidades\tValor de Referencia
FIBRINOGENO\t
*
283
mg/dL\t150 - 400`;
    var coagTp = `Expediente:\t1012799-0\tSolicitud:\t2608040800
Nombre:\tJOSEFINA HERNANDEZ TRINIDAD\tFecha Registro:\tAug 4 2026 1:05PM
HEMATOLOGIA
TIEMPO DE PROTROMBINA Y TROMBOPLASTINA
TIEMPO DE PROTROMBINA\tA
14.20
SEG.\t10.25 - 13.20
INR\t*
1.22
TIEMPO DE TROMBOPLASTINA\t*
30.9
SEG\t29.1 - 38.4`;
    var items = [fib, coagTp].map(function (text) {
      return { result: procesarLabs(text), reportText: text };
    });
    var merged = mergeBulkParseResults(items);
    assert.equal(merged.length, 1);
    var coag = merged[0].resLabs.find(function (l) {
      return /^COAG\t/i.test(l);
    });
    assert.ok(coag);
    assert.match(coag, /\bFib\s+283\b/);
    assert.match(coag, /\bTP\s+14\.2/);
  });

  it('mergeBulkParseResults pone Ret en la BH al consolidar biometría + reticulocitos', () => {
    var cbc = `Expediente:\t1\tSolicitud:\t1
Nombre:\tMARIBEL BAZABE\tFecha Registro:\tAug 21 2026 3:53AM
HEMATOLOGIA
BIOMETRIA HEMATICA COMPLETA
HGB B 8.84 g/dL 12.20 - 18.10
HCT B 25.5 % 37.7 - 53.7
MCV * 93 fL 80 - 97
MCH * 32.4 pg 27.0 - 31.2
WBC A 2.89 K/uL 4.00 - 11.00
NEU * 2.65 K/uL 2.00 - 6.90
EOS * 0.02 K/uL 0.000 - 0.700
PLT * 12.50 K/uL 142.00 - 424.00`;
    var ret = `Expediente:\t1\tSolicitud:\t2
Nombre:\tMARIBEL BAZABE\tFecha Registro:\tAug 21 2026 4:10AM
HEMATOLOGIA
DIFERENCIAL MANUAL
SEGMENTADOS
*
95
%
RETICULOCITOS
Estudio\t\tResultado\tUnidades\tValor de Referencia
RETICULOCITOS
*
1.0
%\t0.5 - 1.5
FROTIS DE SANGRE PERIFERICA
HIPOCROMIA +`;
    var items = [cbc, ret].map(function (text) {
      return { result: procesarLabs(text), reportText: text };
    });
    var merged = mergeBulkParseResults(items);
    assert.equal(merged.length, 1);
    var bh = merged[0].resLabs.find(function (l) {
      return /^BH\b/i.test(l);
    });
    assert.ok(bh);
    assert.match(bh, /\bHb\s+8\.84/);
    assert.match(bh, /\bRet\s+1\b/);
  });

  it('mergeBulkParseResults mantiene cada gasometría seriada del mismo día', () => {
    var gasoA = GASO_VENOSA_SOLO.replace('6:43AM', '6:43AM');
    var gasoB = GASO_VENOSA_SOLO.replace('6:43AM', '7:30AM').replace('7.39', '7.35');
    var items = [gasoA, gasoB].map(function (text) {
      return { result: procesarLabs(text), reportText: text };
    });
    assert.ok(isGasometriaOnlyResLabs(items[0].result.resLabs));
    assert.equal(primaryTipoForResLabs(items[0].result.resLabs), 'gaso');
    var merged = mergeBulkParseResults(items);
    assert.equal(merged.length, 2, 'cada gasometría seriada debe quedar como conjunto propio');
  });

  it('mergeBulkParseResults filtra gasometrías idénticas del mismo día', () => {
    var gasoA = GASO_VENOSA_SOLO;
    var gasoB = GASO_VENOSA_SOLO.replace('6:43AM', '6:50AM');
    var items = [gasoA, gasoB].map(function (text) {
      return { result: procesarLabs(text), reportText: text };
    });
    var merged = mergeBulkParseResults(items);
    assert.equal(merged.length, 1, 'mismos GASES → un solo conjunto');
  });

  it('mergeBulkParseResults une labs + gasometría inicial del mismo día', () => {
    var labs = DEMO_SOME_LAB_REPORT.replace('Apr 11 2026 9:42AM', 'Apr 11 2026 8:00AM');
    var gaso = GASO_VENOSA_SOLO.replace('May 7 2026 6:43AM', 'Apr 11 2026 8:15AM');
    var items = [labs, gaso].map(function (text) {
      return { result: procesarLabs(text), reportText: text };
    });
    var merged = mergeBulkParseResults(items);
    assert.equal(merged.length, 1);
    assert.ok(
      merged[0].resLabs.some(function (row) {
        return /^GASES\b/i.test(String(row));
      })
    );
    assert.ok(
      merged[0].resLabs.some(function (row) {
        return /^BH\b/i.test(String(row));
      })
    );
    var gasesLine = merged[0].resLabs.find(function (row) {
      return /^GASES\b/i.test(String(row));
    });
    assert.ok(gasesLine, 'debe incluir línea GASES');
    assert.match(String(gasesLine), /\bAG \d/, 'debe calcular anión gap al fusionar labs + gasometría');
  });

  it('mergeBulkParseResultsForStorage une química + gas inicial; gas seriado aparte', () => {
    var labs = DEMO_SOME_LAB_REPORT.replace('Apr 11 2026 9:42AM', 'Apr 11 2026 9:56AM');
    var gasoA = GASO_VENOSA_SOLO.replace('May 7 2026 6:43AM', 'Apr 11 2026 9:56AM');
    var gasoB = GASO_VENOSA_SOLO
      .replace('May 7 2026 6:43AM', 'Apr 11 2026 9:58AM')
      .replace('7.39', '7.35');
    var items = [gasoA, labs, gasoB].map(function (text) {
      return { result: procesarLabs(text), reportText: text };
    });
    var stored = mergeBulkParseResultsForStorage(items);
    assert.equal(stored.length, 2, 'gasometría seriada no se fusiona con la anterior');
    var withBh = stored.filter(function (s) {
      return s.resLabs.some(function (row) {
        return /^BH\b/i.test(String(row));
      });
    });
    assert.equal(withBh.length, 1, 'BH solo en el bloque con química');
    assert.ok(
      withBh[0].resLabs.some(function (row) {
        return /^GASES\b/i.test(String(row));
      }),
      'química + gas inicial del mismo bloque horario'
    );
  });

  it('mergeBulkParseResultsForStorage empareja gaso más cercana a labs (5:01/5:09 vs 6:05)', () => {
    var gasoEarly = GASO_VENOSA_SOLO.replace('May 7 2026 6:43AM', 'Jul 27 2026 5:01PM');
    var labs = DEMO_SOME_LAB_REPORT.replace('Apr 11 2026 9:42AM', 'Jul 27 2026 5:09PM');
    var gasoLate = GASO_VENOSA_SOLO
      .replace('May 7 2026 6:43AM', 'Jul 27 2026 6:05PM')
      .replace('7.39', '7.41');
    var items = [gasoEarly, labs, gasoLate].map(function (text) {
      return { result: procesarLabs(text), reportText: text };
    });
    var stored = mergeBulkParseResultsForStorage(items);
    assert.equal(stored.length, 2, 'labs+gaso cercana; gaso de las 18:05 aparte');
    var withBh = stored.filter(function (s) {
      return s.resLabs.some(function (row) {
        return /^BH\b/i.test(String(row));
      });
    });
    assert.equal(withBh.length, 1);
    assert.match(String(withBh[0].hora || ''), /^17:0/);
    var gasoOnly = stored.filter(function (s) {
      return !s.resLabs.some(function (row) {
        return /^BH\b/i.test(String(row));
      });
    });
    assert.equal(gasoOnly.length, 1);
    assert.match(String(gasoOnly[0].hora || ''), /^18:05/);
  });

  it('mergeBulkParseResultsForStorage no copia BH matutina a series q4h', () => {
    var morning = DEMO_SOME_LAB_REPORT.replace('Apr 11 2026 9:42AM', 'Apr 11 2026 6:00AM');
    var gasoMid = GASO_VENOSA_SOLO.replace('May 7 2026 6:43AM', 'Apr 11 2026 10:00AM');
    var gasoEve = GASO_VENOSA_SOLO
      .replace('May 7 2026 6:43AM', 'Apr 11 2026 11:30AM')
      .replace('7.39', '7.33');
    var items = [morning, gasoMid, gasoEve].map(function (text) {
      return { result: procesarLabs(text), reportText: text };
    });
    var stored = mergeBulkParseResultsForStorage(items);
    assert.equal(stored.length, 3, 'mañana + dos gases seriados → tres conjuntos');
    var withBh = stored.filter(function (s) {
      return s.resLabs.some(function (row) {
        return /^BH\b/i.test(String(row));
      });
    });
    assert.equal(withBh.length, 1, 'BH solo en el conjunto de la mañana');
    assert.match(String(withBh[0].hora || ''), /^06:00/);
  });

  it('mergeBulkParseResults quita EGO duplicado entre reportes con GASES a distintas horas', () => {
    // SOME incluye EGO en cada reporte del día. Al pegar GASES(07:57)+EGO y GASES(15:28)+EGO,
    // el EGO debe quedar solo en el primer cluster.
    var egoChunk = 'EGO:\n  AMAR TURBIA pH 5.5 D 1.025\n  Prot 30+ Leuco 59-62+ Eri >100';
    var gases07 = 'GASES\tpH 7.36 pCO2 32* pO2 41* Bica 18.1*';
    var gases15 = 'GASES\tpH 7.39 pCO2 31* pO2 49* Bica 18.8*';
    var makeItem = function (hora, gasesChunk) {
      return {
        result: {
          patient: { expediente: '0008421-7', name: 'TEST', fecha: '14/08/2026', hora: hora },
          resLabs: [gasesChunk, egoChunk],
          bhExtras: {},
          refsBySection: {},
        },
        reportText: 'Expediente:\t0008421-7\tFecha Registro:\tAug 14 2026 ' + hora,
      };
    };
    var items = [makeItem('07:57', gases07), makeItem('15:28', gases15)];
    var merged = mergeBulkParseResults(items);
    assert.equal(merged.length, 2, 'GASES a distintas horas → 2 conjuntos');
    var egoCount = merged.reduce(function (acc, p) {
      return acc + (p.resLabs || []).filter(function (c) { return /^EGO\b/i.test(String(c || '').trim()); }).length;
    }, 0);
    assert.equal(egoCount, 1, 'EGO debe aparecer solo en el primer conjunto');
    assert.ok(
      (merged[0].resLabs || []).some(function (c) { return /^EGO\b/i.test(String(c || '').trim()); }),
      'EGO debe estar en el primer conjunto (07:57)'
    );
  });

  it('mergeBulkParseResults mantiene días distintos separados', () => {
    var block = DEMO_SOME_LAB_REPORT + '\n\n' + OLDER_DEMO_SOME_LAB_REPORT;
    var preview = buildBulkLabPreview(block, { findPatientByRegistro: function () { return null; } });
    assert.equal(preview[0].reports.filter(function (r) { return r.ok; }).length, 2);
    var items = preview[0].reports
      .filter(function (r) {
        return r.ok;
      })
      .map(function (r) {
        return { result: r.result, reportText: r.reportText };
      });
    var merged = mergeBulkParseResults(items);
    assert.equal(merged.length, 2);
    var fechas = merged.map(function (m) {
      return m.fecha;
    });
    assert.notEqual(fechas[0], fechas[1]);
  });
});

describe('lab-bulk-paste preview and tipo', () => {
  beforeEach(() => {
    store = {};
  });

  it('buildBulkLabPreview detecta paciente por expediente', () => {
    var block = DEMO_SOME_LAB_REPORT + '\n\n' + OLDER_DEMO_SOME_LAB_REPORT;
    var preview = buildBulkLabPreview(block, {
      findPatientByRegistro: function (reg) {
        if (reg === '0008421-7') return { id: 'p1', nombre: 'Demo Pérez', registro: '0008421-7' };
        return null;
      },
    });
    assert.equal(preview.length, 1);
    assert.equal(preview[0].status, 'ok');
    assert.equal(preview[0].patient.id, 'p1');
    assert.equal(preview[0].okReportCount, 2);
    assert.equal(preview[0].setsAfterMerge, 2);
    assert.ok(preview[0].days.length >= 2);
  });

  it('buildBulkLabPreview bloquea si el expediente ajeno NO está en censo (seguridad paciente)', () => {
    // Antes se descartaba en silencio el expediente ajeno; ahora bloquea SIEMPRE:
    // un expediente ajeno fuera del censo también puede ser otro paciente real.
    var foreign = String(DEMO_SOME_LAB_REPORT).replace(/0008421-7/g, '9999999-9');
    var block = DEMO_SOME_LAB_REPORT + '\n\n' + foreign;
    var preview = buildBulkLabPreview(block, {
      findPatientByRegistro: function (reg) {
        if (reg === '0008421-7') return { id: 'p1', nombre: 'Demo Pérez', registro: '0008421-7' };
        return null;
      },
    });
    assert.equal(preview.length, 1);
    assert.equal(preview[0].status, 'mixed-expediente');
    assert.equal(preview[0].canProcess, false);
    assert.equal(preview[0].okReportCount, 0);
  });

  it('buildBulkLabPreview marca mixed-expediente con 2 pacientes de censo (nunca guarda ninguno)', () => {
    var other = String(DEMO_SOME_LAB_REPORT).replace(/0008421-7/g, '1111111-1');
    var block = DEMO_SOME_LAB_REPORT + '\n\n' + other;
    var preview = buildBulkLabPreview(block, {
      findPatientByRegistro: function (reg) {
        if (reg === '0008421-7') return { id: 'p1', nombre: 'Demo Pérez', registro: '0008421-7' };
        if (reg === '1111111-1') return { id: 'p2', nombre: 'Otro', registro: '1111111-1' };
        return null;
      },
    });
    assert.equal(preview.length, 1);
    assert.equal(preview[0].status, 'mixed-expediente');
    assert.equal(preview[0].canProcess, false);
    assert.equal(preview[0].okReportCount, 0);
    assert.match(preview[0].rawText, /0008421-7/);
    assert.match(preview[0].rawText, /1111111-1/);
  });

  it('buildBulkLabPreview NO marca mixed si los expedientes son el mismo paciente (base-registro)', () => {
    // 1087426 y 1087426-2 son el mismo paciente en el hospital (findPatientByRegistro base match).
    var alt = String(DEMO_SOME_LAB_REPORT).replace(/0008421-7/g, '0008421-2');
    var block = DEMO_SOME_LAB_REPORT + '\n\n' + alt;
    var preview = buildBulkLabPreview(block, {
      findPatientByRegistro: function () {
        return { id: 'p1', nombre: 'Demo Pérez', registro: '0008421-7' };
      },
    });
    assert.equal(preview.length, 1);
    assert.equal(preview[0].status, 'ok');
    assert.equal(preview[0].canProcess, true);
  });

  it('mixedExpedienteWarning arma mensaje en español con los expedientes detectados', () => {
    var other = String(DEMO_SOME_LAB_REPORT).replace(/0008421-7/g, '1111111-1');
    var block = DEMO_SOME_LAB_REPORT + '\n\n' + other;
    var preview = buildBulkLabPreview(block, { findPatientByRegistro: function () { return null; } });
    var msg = mixedExpedienteWarning(preview);
    assert.match(msg, /0008421-7/);
    assert.match(msg, /1111111-1/);
    assert.match(msg, /no se guard/i);
  });

  it('mixedExpedienteWarning devuelve null cuando no hay mezcla', () => {
    var preview = buildBulkLabPreview(DEMO_SOME_LAB_REPORT, { findPatientByRegistro: function () { return null; } });
    assert.equal(mixedExpedienteWarning(preview), null);
  });

  it('buildBulkLabPreview separa pacientes con --- PACIENTE ---', () => {
    var other = String(DEMO_SOME_LAB_REPORT).replace(/0008421-7/g, '1111111-1');
    var text =
      DEMO_SOME_LAB_REPORT + '\n\n' + LAB_BULK_PATIENT_SEPARATOR + '\n\n' + other;
    var preview = buildBulkLabPreview(text, {
      findPatientByRegistro: function (reg) {
        if (reg === '0008421-7') return { id: 'p1', nombre: 'Demo Pérez', registro: '0008421-7' };
        if (reg === '1111111-1') return { id: 'p2', nombre: 'Otro', registro: '1111111-1' };
        return null;
      },
    });
    assert.equal(preview.length, 2);
    assert.equal(preview[0].status, 'ok');
    assert.equal(preview[1].status, 'ok');
  });

  it('extractLabPatientFromBulkBlock toma datos del primer reporte válido', () => {
    var preview = buildBulkLabPreview(DEMO_SOME_LAB_REPORT, {
      findPatientByRegistro: function () {
        return null;
      },
    });
    var patient = extractLabPatientFromBulkBlock(preview[0]);
    assert.ok(patient);
    assert.match(String(patient.name || ''), /PÉREZ|PEREZ/i);
    assert.equal(patient.expediente, '0008421-7');
  });

  it('primaryTipoForResLabs clasifica cultivo con encabezado de sitio en mayúsculas', () => {
    var resLabs = [
      'LIQUIDO PERITONEAL 07/05: PSEUDOMONAS AERUGINOSA',
      'ATB R: CAZ',
      'Cuenta: +100 UFC',
    ];
    assert.equal(primaryTipoForResLabs(resLabs), 'cultivo');
  });

  it('primaryTipoForResLabs clasifica mixed cuando hay labs y cultivo con SEROL', () => {
    var resLabs = [
      'BH 12.5 4.1',
      'UROCULTIVO: E. COLI',
      'ATB S: CIPRO',
      'SEROL VIH negativo',
    ];
    assert.equal(primaryTipoForResLabs(resLabs), 'mixed');
  });

  it('shouldShowBulkLabPreview abre modal con varios reportes o avisos', () => {
    assert.equal(shouldShowBulkLabPreview([{ status: 'ok' }], 1), false);
    assert.equal(shouldShowBulkLabPreview([{ status: 'ok' }], 2), true);
    assert.equal(
      shouldShowBulkLabPreview(
        [
          { status: 'ok' },
          { status: 'ok' },
        ],
        2
      ),
      true
    );
    assert.equal(shouldShowBulkLabPreview([{ status: 'no-patient' }], 1), false);
    assert.equal(
      shouldShowBulkLabPreview([{ status: 'no-patient', okReportCount: 1 }], 1, { quickLabOutput: true }),
      false
    );
    assert.equal(
      shouldShowBulkLabPreview(
        [{ status: 'no-patient', okReportCount: 2 }],
        2,
        { quickLabOutput: true }
      ),
      false
    );
    assert.equal(
      shouldShowBulkLabPreview(
        [
          { status: 'no-patient', okReportCount: 1 },
          { status: 'no-patient', okReportCount: 1 },
        ],
        2,
        { quickLabOutput: true }
      ),
      false
    );
    assert.equal(
      shouldShowBulkLabPreview(
        [{ status: 'ok', okReportCount: 2, canProcess: true, patient: { id: 'p1' } }],
        2,
        { quickLabOutput: true }
      ),
      true
    );
  });
});
