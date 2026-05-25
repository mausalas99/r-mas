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
  shouldShowBulkLabPreview,
} = await import('./lab-bulk-paste.mjs');
const { procesarLabs } = await import('./labs.js');
const { DEMO_SOME_LAB_REPORT, OLDER_DEMO_SOME_LAB_REPORT } = await import('./tour-demo-some-lab.mjs');

describe('lab-bulk-paste', () => {
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

  it('mergeBulkParseResults consolida mismo día en un conjunto', () => {
    var dupDay = DEMO_SOME_LAB_REPORT.replace('9:42AM', '10:15AM');
    var items = [DEMO_SOME_LAB_REPORT, dupDay].map(function (text) {
      return { result: procesarLabs(text), reportText: text };
    });
    var merged = mergeBulkParseResults(items);
    assert.equal(merged.length, 1);
    assert.ok(merged[0].resLabs.length > 0);
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
    assert.equal(shouldShowBulkLabPreview([{ status: 'no-patient' }], 1), true);
  });
});
