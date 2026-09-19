import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setPatients, getPatients, setLabHistory } from '../../app-state.mjs';
import { rt } from '../app-tabs-runtime.mjs';
import { renderEventualidadSeguimientoPanel } from './eventualidad-seguimiento-wire.mjs';
import { todayYmd } from './consulta-ic-data.mjs';

function seedPatient(id, cardio) {
  setPatients([{ id: id, cardio: cardio }]);
  rt.getActiveId = function () {
    return id;
  };
}

test('renderEventualidadSeguimientoPanel autofills labsIngreso from the nearest lab set on first render', () => {
  if (typeof document === 'undefined') return;
  seedPatient('p1', undefined);
  setLabHistory({
    p1: [{ fecha: '01/01/2020', hora: '08:00', parsedBySection: { ESC: { Na: '138', K: '4.1' } } }],
  });
  var mount = document.createElement('div');
  renderEventualidadSeguimientoPanel(mount);
  var entry = getPatients()[0].cardio.eventualidadesSeguimiento[0];
  assert.equal(entry.labsIngreso.fecha, todayYmd());
  assert.equal(entry.labsIngreso.na, 138);
  assert.equal(entry.labsIngreso.k, 4.1);
});

test('renderEventualidadSeguimientoPanel does not re-run autofill once fecha is already set', () => {
  if (typeof document === 'undefined') return;
  seedPatient('p1', undefined);
  setLabHistory({ p1: [] });
  var mount = document.createElement('div');
  renderEventualidadSeguimientoPanel(mount);
  var patient = getPatients()[0];
  patient.cardio.eventualidadesSeguimiento[0].labsIngreso.na = 999;
  setLabHistory({
    p1: [{ fecha: todayYmd().split('-').reverse().join('/'), hora: '08:00', parsedBySection: { ESC: { Na: '111' } } }],
  });
  renderEventualidadSeguimientoPanel(mount);
  assert.equal(getPatients()[0].cardio.eventualidadesSeguimiento[0].labsIngreso.na, 999);
});

async function answerHistoryEditModal(code) {
  await Promise.resolve();
  document.querySelector('[data-text-prompt-input]').value = code;
  document.querySelector('[data-text-prompt-confirm]').click();
  await Promise.resolve();
}

test('picking a past date locks the form; the wrong code stays locked; the right code unlocks it', async () => {
  if (typeof document === 'undefined') return;
  seedPatient('p1', undefined);
  setLabHistory({ p1: [] });
  var mount = document.createElement('div');
  renderEventualidadSeguimientoPanel(mount);
  var dateEl = mount.querySelector('[data-hf-consulta-date]');
  dateEl.value = '2020-01-01';
  dateEl.dispatchEvent(new window.Event('change', { bubbles: true }));

  var input = mount.querySelector('[data-hf-ei-expl="ta"]');
  assert.equal(input.disabled, true, 'past-date entry should render locked');

  mount.querySelector('[data-hf-history-edit="unlock"]').click();
  await answerHistoryEditModal('wrong code');
  assert.equal(mount.querySelector('[data-hf-ei-expl="ta"]').disabled, true, 'wrong code stays locked');

  mount.querySelector('[data-hf-history-edit="unlock"]').click();
  await answerHistoryEditModal('entiendo, esto modifica un registro pasado');
  assert.equal(mount.querySelector('[data-hf-ei-expl="ta"]').disabled, false, 'right code unlocks it');
});
