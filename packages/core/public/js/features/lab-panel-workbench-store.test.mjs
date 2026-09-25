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

const { upsertLabHistory, applyDriveImportLabSets } = await import('./lab-panel-workbench-store.mjs');
const { getLabHistory, getNotes } = await import('../app-state.mjs');
const { labPanelBridge } = await import('./lab-panel-bridge.mjs');

function todayFechaNorm() {
  var nd = new Date();
  return (
    String(nd.getDate()).padStart(2, '0') +
    '/' +
    String(nd.getMonth() + 1).padStart(2, '0') +
    '/' +
    nd.getFullYear()
  );
}

describe('lab-panel-workbench-store upsertLabHistory replaceOnMatch (Actualizar labs)', () => {
  beforeEach(() => {
    store = {};
    Object.keys(getLabHistory()).forEach(function (k) {
      delete getLabHistory()[k];
    });
  });

  it('sin fecha en el payload: usa la fecha de hoy, no la fecha de ingreso del paciente (bug: labs de paciente recién registrado no aparecían)', () => {
    getNotes()['p1'] = { fecha: '01/01/2020' };
    upsertLabHistory('p1', ['QS\nGLUCOSA\t94\tmg/dL'], '', '', 'reporte', {}, {}, 'a');
    var sets = getLabHistory().p1;
    assert.equal(sets[0].fecha, todayFechaNorm());
  });

  it('sin opts: mismo fecha+hora combina secciones complementarias (Biometría + Química del mismo estudio)', () => {
    upsertLabHistory('p1', ['BH\nHGB\t11.8\tg/dL'], '11/04/2026', '09:42', 'reporte 1', {}, {}, 'a');
    upsertLabHistory('p1', ['QS\nCREATININA\t1.35\tmg/dL'], '11/04/2026', '09:42', 'reporte 2', {}, {}, 'b');
    var sets = getLabHistory().p1;
    assert.equal(sets.length, 1);
    assert.match(sets[0].resLabs.join('\n'), /HGB/);
    assert.match(sets[0].resLabs.join('\n'), /CREATININA/);
  });

  it('con replaceOnMatch: mismo fecha+hora reemplaza por completo (Actualizar labs, no acumula)', () => {
    upsertLabHistory('p1', ['QS\nGLUCOSA\t94\tmg/dL'], '11/04/2026', '09:42', 'reporte viejo', {}, {}, 'a');
    var result = upsertLabHistory(
      'p1',
      ['QS\nGLUCOSA\t150\tmg/dL'],
      '11/04/2026',
      '09:42',
      'reporte corregido',
      {},
      {},
      'b',
      { replaceOnMatch: true }
    );
    var sets = getLabHistory().p1;
    assert.equal(sets.length, 1);
    assert.equal(result.action, 'merged');
    assert.equal(sets[0].resLabs.join('\n'), 'QS\nGLUCOSA\t150\tmg/dL');
    assert.doesNotMatch(sets[0].resLabs.join('\n'), /94\tmg\/dL/);
    assert.equal(sets[0].sourceText, 'reporte corregido');
  });

  it('con replaceOnMatch: fecha+hora distinta sigue agregando un set nuevo (no pisa otras tomas)', () => {
    upsertLabHistory('p1', ['QS\nGLUCOSA\t94\tmg/dL'], '11/04/2026', '09:42', 'reporte 1', {}, {}, 'a');
    upsertLabHistory('p1', ['QS\nGLUCOSA\t101\tmg/dL'], '11/04/2026', '14:00', 'reporte 2', {}, {}, 'b', {
      replaceOnMatch: true,
    });
    var sets = getLabHistory().p1;
    assert.equal(sets.length, 2);
  });

  it('con replaceOnMatch: sets idénticos se marcan skipped, no crean set duplicado', () => {
    upsertLabHistory('p1', ['QS\nGLUCOSA\t94\tmg/dL'], '11/04/2026', '09:42', 'reporte 1', {}, {}, 'a');
    var result = upsertLabHistory(
      'p1',
      ['QS\nGLUCOSA\t94\tmg/dL'],
      '11/04/2026',
      '09:42',
      'reporte 1 otra vez',
      {},
      {},
      'b',
      { replaceOnMatch: true }
    );
    assert.equal(result.action, 'skipped');
    assert.equal(getLabHistory().p1.length, 1);
  });
});

describe('lab-panel-workbench-store applyDriveImportLabSets clears stale activeLab', () => {
  beforeEach(() => {
    store = {};
    Object.keys(getLabHistory()).forEach(function (k) {
      delete getLabHistory()[k];
    });
    globalThis.document = {
      addEventListener: function () {},
      getElementById: function () {
        return null;
      },
      querySelector: function () {
        return null;
      },
    };
  });

  it('clears activeLab so the panel reloads instead of showing stale/other-patient data', async () => {
    labPanelBridge.setActiveLab({ patient: { id: 'someone-else' }, resLabs: ['stale'] });
    await applyDriveImportLabSets({ id: 'p1' }, [
      { fecha: '11/04/2026', hora: '09:42', resLabs: ['QS\nGLUCOSA\t94\tmg/dL'] },
    ]);
    assert.equal(labPanelBridge.getActiveLab(), null);
  });
});
