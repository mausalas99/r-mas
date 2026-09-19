import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEstadoActualToNote,
  buildNotePatchFromEstadoActual,
  extractVitalsFromPatient,
  noteEvolucionHasContent,
} from './note-from-estado-actual.mjs';

describe('note-from-estado-actual', () => {
  it('extractVitalsFromPatient maps tas/tad and patient peso', () => {
    const patient = {
      peso: 72.5,
      monitoreo: {
        historial: [
          {
            id: '1',
            recordedAt: '2026-08-07T10:00:00.000Z',
            vitals: { tas: 120, tad: 80, fc: 88, fr: 18, temp: 36.6 },
          },
        ],
        estadoClinico: {},
      },
    };
    const v = extractVitalsFromPatient(patient);
    assert.equal(v.ta, '120/80');
    assert.equal(v.fc, '88');
    assert.equal(v.fr, '18');
    assert.equal(v.temp, '36.6');
    assert.equal(v.peso, '72.5');
  });

  it('extractVitalsFromPatient returns empty without monitoreo', () => {
    const v = extractVitalsFromPatient({ name: 'X' });
    assert.equal(v.ta, '');
    assert.equal(v.fc, '');
  });

  it('buildNotePatchFromEstadoActual uses injected getEstadoActualText', () => {
    const patient = { id: 'p1', monitoreo: { estadoClinico: {}, historial: [] } };
    const patch = buildNotePatchFromEstadoActual(patient, {
      getEstadoActualText: () => '  N: estable\nV: AA  ',
    });
    assert.equal(patch.evolucion, 'N: estable\nV: AA');
  });

  it('buildNotePatchFromEstadoActual compiles from monitoreo when no injector', () => {
    const patient = {
      peso: 70,
      monitoreo: {
        estadoClinico: { hemodinamia: 'ESTABLE' },
        historial: [],
      },
    };
    const patch = buildNotePatchFromEstadoActual(patient);
    assert.ok(String(patch.evolucion).length > 0);
    assert.equal(patch.vitals.peso, '70');
  });

  it('applyEstadoActualToNote fills empty evolucion and vitals', () => {
    const note = { evolucion: '', ta: '', fc: '' };
    const changed = applyEstadoActualToNote(note, {
      evolucion: 'N: ok',
      vitals: { ta: '110/70', fr: '', fc: '90', temp: '', peso: '' },
    });
    assert.equal(changed, true);
    assert.equal(note.evolucion, 'N: ok');
    assert.equal(note.ta, '110/70');
    assert.equal(note.fc, '90');
  });

  it('applyEstadoActualToNote keeps evolucion unless replace', () => {
    const note = { evolucion: 'ya escrito', ta: '100/60', fc: '' };
    const unchanged = applyEstadoActualToNote(note, {
      evolucion: 'desde EA',
      vitals: { ta: '120/80', fr: '', fc: '70', temp: '', peso: '' },
    });
    assert.equal(note.evolucion, 'ya escrito');
    assert.equal(note.ta, '100/60');
    assert.equal(note.fc, '70');
    assert.equal(unchanged, true);

    const replaced = applyEstadoActualToNote(
      note,
      { evolucion: 'desde EA', vitals: {} },
      { replaceEvolucion: true }
    );
    assert.equal(replaced, true);
    assert.equal(note.evolucion, 'desde EA');
  });

  it('noteEvolucionHasContent', () => {
    assert.equal(noteEvolucionHasContent({ evolucion: '  x ' }), true);
    assert.equal(noteEvolucionHasContent({ evolucion: '   ' }), false);
    assert.equal(noteEvolucionHasContent(null), false);
  });
});
