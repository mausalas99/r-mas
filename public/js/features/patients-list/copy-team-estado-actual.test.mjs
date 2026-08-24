import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { _applyRepoSnapshot, resetClinicalReadModelForTests } from '../../clinical-read-model.mjs';
import { buildTeamEstadoActualCopyText, copyTeamEstadoActualForToday } from './copy-team-estado-actual.mjs';

function stubClipboard(writeText) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText } },
    configurable: true,
  });
}

describe('copy-team-estado-actual', () => {
  beforeEach(() => {
    resetClinicalReadModelForTests();
    stubClipboard(async () => {});
  });

  it('includes only pinned patients that have estado actual, skips unpinned and empty', () => {
    _applyRepoSnapshot({
      patients: [
        { id: 'p1', nombre: 'Ana Ruiz', pinned: true, monitoreo: { estadoClinico: { resumen: 'Estable' } } },
        { id: 'p2', nombre: 'Beto Cruz', pinned: false, monitoreo: { estadoClinico: { resumen: 'Estable' } } },
        { id: 'p3', nombre: 'Cato Diaz', pinned: true },
      ],
    });

    var built = buildTeamEstadoActualCopyText();
    assert.equal(built.patientCount, 2);
    assert.equal(built.estadoCount, 1);
    assert.match(built.text, /Ana Ruiz/);
    assert.doesNotMatch(built.text, /Beto Cruz/);
    assert.doesNotMatch(built.text, /Cato Diaz/);
  });

  it('copyTeamEstadoActualForToday copies to clipboard and toasts success', async () => {
    _applyRepoSnapshot({
      patients: [
        { id: 'p1', nombre: 'Ana Ruiz', pinned: true, monitoreo: { estadoClinico: { resumen: 'Estable' } } },
      ],
    });
    var written = null;
    stubClipboard(async (t) => {
      written = t;
    });
    var toast = mock.fn();
    copyTeamEstadoActualForToday(toast);
    await new Promise((r) => setTimeout(r, 0));
    assert.match(written, /Ana Ruiz/);
    assert.equal(toast.mock.calls.length, 1);
    assert.equal(toast.mock.calls[0].arguments[1], 'success');
  });

  it('excludes pinned patients that are archived', () => {
    _applyRepoSnapshot({
      patients: [
        { id: 'p1', nombre: 'Ana Ruiz', pinned: true, monitoreo: { estadoClinico: { resumen: 'Estable' } } },
        {
          id: 'p2',
          nombre: 'Beto Cruz',
          pinned: true,
          archived: true,
          monitoreo: { estadoClinico: { resumen: 'Estable' } },
        },
      ],
    });

    var built = buildTeamEstadoActualCopyText();
    assert.equal(built.patientCount, 1);
    assert.doesNotMatch(built.text, /Beto Cruz/);
  });

  it('copyTeamEstadoActualForToday toasts info when no pinned estado actual', () => {
    _applyRepoSnapshot({ patients: [{ id: 'p1', nombre: 'Ana Ruiz', pinned: false }] });
    var toast = mock.fn();
    copyTeamEstadoActualForToday(toast);
    assert.equal(toast.mock.calls.length, 1);
    assert.equal(toast.mock.calls[0].arguments[1], 'info');
  });
});
