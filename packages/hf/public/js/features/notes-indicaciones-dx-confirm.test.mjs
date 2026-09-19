import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getPatients, getNotes } from '../app-state.mjs';
import { syncNoteDxFromCenso, registerNotesIndicacionesRuntime } from './notes-indicaciones.mjs';

describe('syncNoteDxFromCenso consequence confirm', () => {
  afterEach(() => {
    getPatients().length = 0;
    for (const k of Object.keys(getNotes())) delete getNotes()[k];
  });

  it('note already has diagnoses: opens a consequence confirm; canceling keeps the note dx', async () => {
    if (typeof document === 'undefined') return;
    registerNotesIndicacionesRuntime({ getActiveId: () => 'p1' });
    getPatients().push({ id: 'p1', diagnosticos: ['DM2'] });
    getNotes().p1 = { diagnosticos: ['ORIGINAL'] };

    const p = syncNoteDxFromCenso();
    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'consequence modal should be open');
    assert.match(backdrop.innerHTML, /wb-confirm-modal--consequence/);
    assert.match(
      backdrop.innerHTML,
      /¿Reemplazar los diagnósticos de la nota con los del censo del paciente\?/
    );

    document.querySelector('[data-wb-confirm-cancel]').click();
    await p;
    assert.deepEqual(getNotes().p1.diagnosticos, ['ORIGINAL'], 'canceling must not overwrite');
  });
});
