import { describe, it } from 'node:test';
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
  extractSomeNombreFromReport,
  significantNameTokens,
  scoreNombreAgainstPatient,
  matchPatientsByNombre,
  matchPatientByRegistro,
  looksLikeSmartPasteCandidate,
  shouldSkipGlobalSmartPaste,
  planSmartPaste,
  assignPatientToBulkBlock,
  enrichBlockWithNombreMatches,
} = await import('./paste-smart-model.mjs');
const { GASO_VENOSA_SOLO } = await import('../labs-procesar-fixtures.mjs');

const CENSUS = [
  { id: 'p1', nombre: 'BENITO CASTILLO JUAREZ', registro: '2213511-4', cuarto: '412' },
  { id: 'p2', nombre: 'MARIA LOPEZ HERNANDEZ', registro: '9988776-1', cuarto: '410' },
  { id: 'p3', nombre: 'BENITO CASTILLO RUIZ', registro: '1111111-1', cuarto: '401' },
];

describe('paste-smart-model', () => {
  it('extractSomeNombreFromReport lee Nombre:', () => {
    assert.equal(extractSomeNombreFromReport(GASO_VENOSA_SOLO), 'BENITO CASTILLO JUAREZ');
  });

  it('significantNameTokens omite stopwords cortas', () => {
    assert.deepEqual(significantNameTokens('Juan de la Cruz'), ['juan', 'cruz']);
  });

  it('scoreNombreAgainstPatient: exacto y tokens reordenados', () => {
    assert.equal(scoreNombreAgainstPatient('BENITO CASTILLO JUAREZ', 'BENITO CASTILLO JUAREZ'), 1000);
    assert.ok(
      scoreNombreAgainstPatient('BENITO CASTILLO JUAREZ', 'CASTILLO JUAREZ BENITO') > 15
    );
    assert.equal(scoreNombreAgainstPatient('ANA', 'PEDRO'), -Infinity);
  });

  it('matchPatientByRegistro encuentra expediente', () => {
    assert.equal(matchPatientByRegistro('2213511-4', CENSUS).id, 'p1');
    assert.equal(matchPatientByRegistro('no-existe', CENSUS), null);
  });

  it('matchPatientsByNombre rankea y distingue', () => {
    const hits = matchPatientsByNombre('BENITO CASTILLO JUAREZ', CENSUS);
    assert.ok(hits.length >= 1);
    assert.equal(hits[0].patient.id, 'p1');
  });

  it('looksLikeSmartPasteCandidate detecta SOME', () => {
    assert.equal(looksLikeSmartPasteCandidate(GASO_VENOSA_SOLO), true);
    assert.equal(looksLikeSmartPasteCandidate('hola mundo corto'), false);
    assert.equal(
      looksLikeSmartPasteCandidate(
        'Expediente: 1234567-8\nNombre: PACIENTE DEMO PRUEBA\nBH Hb 12.1 Hto 36 leucocitos 8.2'
      ),
      true
    );
  });

  it('shouldSkipGlobalSmartPaste en lab-input y password', () => {
    assert.equal(shouldSkipGlobalSmartPaste({ id: 'lab-input', tagName: 'TEXTAREA' }), true);
    assert.equal(
      shouldSkipGlobalSmartPaste({ tagName: 'INPUT', type: 'password', closest: () => null }),
      true
    );
    assert.equal(
      shouldSkipGlobalSmartPaste({ id: 'note-body', tagName: 'TEXTAREA', closest: () => null }),
      false
    );
  });

  it('planSmartPaste: registro exacto → ready', () => {
    const plan = planSmartPaste(GASO_VENOSA_SOLO, {
      patients: CENSUS,
      findPatientByRegistro: (reg) => matchPatientByRegistro(reg, CENSUS),
    });
    assert.equal(plan.kind, 'ready');
    assert.equal(plan.primaryPatient.id, 'p1');
    assert.equal(plan.needsPreview, false);
  });

  it('planSmartPaste: sin censo → preview / no processable', () => {
    const plan = planSmartPaste(GASO_VENOSA_SOLO, {
      patients: [],
      findPatientByRegistro: () => null,
    });
    assert.ok(plan.kind === 'preview' || plan.kind === 'confirm-single' || plan.kind === 'not-some');
    assert.equal(plan.totalOkReports >= 1, true);
  });

  it('planSmartPaste: nombre sin registro en censo → confirm-single', () => {
    const text = GASO_VENOSA_SOLO.replace('2213511-4', '9999999-9');
    const census = [{ id: 'px', nombre: 'BENITO CASTILLO JUAREZ', registro: 'other', cuarto: '1' }];
    const plan = planSmartPaste(text, {
      patients: census,
      findPatientByRegistro: (reg) => matchPatientByRegistro(reg, census),
    });
    assert.equal(plan.kind, 'confirm-single');
    assert.equal(plan.primaryPatient.id, 'px');
  });

  it('planSmartPaste: nombres ambiguos → ambiguous', () => {
    const text = `
Expediente:\t0000000-0\tSolicitud:\t1
Nombre:\tBENITO CASTILLO\tFecha Registro:\tMay 7 2026 6:43AM
Sexo:\tMASCULINO

GASOMETRIAS
GASOMETRIA VENOSA PARCIAL
Estudio\t\tResultado\tUnidades\tValor de Referencia
PH\t*\t7.39\t\t7.32 - 7.43
`;
    const census = [
      { id: 'a', nombre: 'BENITO CASTILLO JUAREZ', registro: '1' },
      { id: 'b', nombre: 'BENITO CASTILLO RUIZ', registro: '2' },
    ];
    const plan = planSmartPaste(text, {
      patients: census,
      findPatientByRegistro: () => null,
    });
    assert.equal(plan.kind, 'ambiguous');
    assert.ok(plan.candidates.length >= 2);
  });

  it('planSmartPaste: texto vacío / no SOME', () => {
    assert.equal(planSmartPaste('', { patients: CENSUS }).kind, 'empty');
    assert.equal(planSmartPaste('solo texto random sin header', { patients: CENSUS }).kind, 'not-some');
  });

  it('assignPatientToBulkBlock marca canProcess', () => {
    const block = {
      blockIndex: 0,
      okReportCount: 2,
      status: 'no-patient',
      canProcess: false,
      primaryExpediente: 'x',
    };
    const next = assignPatientToBulkBlock(block, CENSUS[0]);
    assert.equal(next.canProcess, true);
    assert.equal(next.patient.id, 'p1');
    assert.equal(next.status, 'ok');
  });

  it('enrichBlockWithNombreMatches usa nombre del reporte', () => {
    const block = {
      status: 'no-patient',
      okReportCount: 1,
      reports: [{ ok: true, nombre: 'BENITO CASTILLO JUAREZ', reportText: GASO_VENOSA_SOLO }],
    };
    const enrich = enrichBlockWithNombreMatches(block, CENSUS);
    assert.equal(enrich.best.id, 'p1');
    assert.equal(enrich.ambiguous, false);
  });
});
