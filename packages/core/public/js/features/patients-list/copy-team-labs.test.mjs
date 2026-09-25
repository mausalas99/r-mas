import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { _applyRepoSnapshot, resetClinicalReadModelForTests } from '../../clinical-read-model.mjs';
import { buildTeamLabsCopyText, copyTeamLabsForToday } from './copy-team-labs.mjs';

function stubClipboard(writeText) {
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText } },
    configurable: true,
  });
}

var LAB_HISTORY_P1_P2 = {
  p1: [{ fecha: '16/08/2026', resLabs: ['BH\nHb 12.9*'] }],
  p2: [{ fecha: '16/08/2026', resLabs: ['BH\nHb 10*'] }],
};

describe('copy-team-labs', () => {
  beforeEach(() => {
    resetClinicalReadModelForTests();
    stubClipboard(async () => {});
  });

  it('includes only pinned patients that have labs, skips unpinned and lab-less', () => {
    _applyRepoSnapshot({
      patients: [
        { id: 'p1', nombre: 'Ejemplo Casobq', pinned: true },
        { id: 'p2', nombre: 'Ficticio Casobo', pinned: false },
        { id: 'p3', nombre: 'Inventado Casobn', pinned: true },
      ],
      labHistory: LAB_HISTORY_P1_P2,
    });

    var built = buildTeamLabsCopyText();
    assert.equal(built.patientCount, 2);
    assert.equal(built.labCount, 1);
    assert.match(built.text, /Ejemplo Casobq/);
    assert.doesNotMatch(built.text, /Ficticio Casobo/);
    assert.doesNotMatch(built.text, /Inventado Casobn/);
    assert.match(built.text, /Hb 12\.9/);
  });

  it('copyTeamLabsForToday copies to clipboard and toasts success', async () => {
    _applyRepoSnapshot({
      patients: [{ id: 'p1', nombre: 'Ejemplo Casobq', pinned: true }],
      labHistory: { p1: [{ fecha: '16/08/2026', resLabs: ['BH\nHb 12.9*'] }] },
    });
    var written = null;
    stubClipboard(async (t) => {
      written = t;
    });
    var toast = mock.fn();
    copyTeamLabsForToday(toast);
    await new Promise((r) => setTimeout(r, 0));
    assert.match(written, /Ejemplo Casobq/);
    assert.equal(toast.mock.calls.length, 1);
    assert.equal(toast.mock.calls[0].arguments[1], 'success');
  });

  it('excludes pinned patients that are archived', () => {
    _applyRepoSnapshot({
      patients: [
        { id: 'p1', nombre: 'Ejemplo Casobq', pinned: true },
        { id: 'p2', nombre: 'Ficticio Casobo', pinned: true, archived: true },
      ],
      labHistory: LAB_HISTORY_P1_P2,
    });

    var built = buildTeamLabsCopyText();
    assert.equal(built.patientCount, 1);
    assert.doesNotMatch(built.text, /Ficticio Casobo/);
  });

  it('copyTeamLabsForToday toasts info when no pinned labs today', () => {
    _applyRepoSnapshot({ patients: [{ id: 'p1', nombre: 'Ejemplo Casobq', pinned: false }] });
    var toast = mock.fn();
    copyTeamLabsForToday(toast);
    assert.equal(toast.mock.calls.length, 1);
    assert.equal(toast.mock.calls[0].arguments[1], 'info');
  });
});
