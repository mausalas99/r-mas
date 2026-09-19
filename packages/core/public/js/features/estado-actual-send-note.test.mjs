import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEaNoteSend } from './estado-actual-send-note.mjs';

const patient = {
  id: 'p1',
  monitoreo: { estadoClinico: {}, historial: [] },
};

test('resolveEaNoteSend — vacío sin texto compilado', () => {
  const note = { evolucion: '' };
  const result = resolveEaNoteSend(patient, note, {
    getEstadoActualText: () => '   ',
  });
  assert.equal(result.status, 'empty');
});

test('resolveEaNoteSend — pide confirmación si evolución ya tiene texto', () => {
  const note = { evolucion: 'previo', ta: '' };
  const result = resolveEaNoteSend(patient, note, {
    getEstadoActualText: () => 'N: nuevo',
  });
  assert.equal(result.status, 'confirm');
  assert.equal(note.evolucion, 'previo');
});

test('resolveEaNoteSend — aplica con replace', () => {
  const note = { evolucion: 'previo', ta: '', fc: '' };
  const result = resolveEaNoteSend(patient, note, {
    replaceEvolucion: true,
    getEstadoActualText: () => 'N: nuevo',
  });
  assert.equal(result.status, 'applied');
  assert.equal(note.evolucion, 'N: nuevo');
});
