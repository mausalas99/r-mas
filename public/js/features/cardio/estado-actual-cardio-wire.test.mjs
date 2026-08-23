import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPocusFormValues, saveCardioPocusDay } from './estado-actual-cardio-wire.mjs';
import { LUNG_ZONE_KEYS } from '../../../../lib/cardio/congestion.mjs';

function mountWithPocusForm(overrides) {
  var o = overrides || {};
  var mount = document.createElement('div');
  mount.innerHTML =
    '<input data-ea-cardio-pocus="date" value="' + (o.date || '2026-03-14') + '">' +
    '<input data-ea-cardio-pocus="vciCm" value="' + (o.vciCm || '2.0') + '">' +
    '<input data-ea-cardio-pocus="lungPattern" value="' + (o.lungPattern || 'B') + '">' +
    '<input data-ea-cardio-pocus="lungLinesB" value="' + (o.lungLinesB || '') + '">' +
    '<input data-ea-cardio-pocus="sixMwtMeters" value="' + (o.sixMwtMeters != null ? o.sixMwtMeters : '') + '">' +
    LUNG_ZONE_KEYS.map(function (key) {
      return '<select data-ea-cardio-pocus-zone="' + key + '"><option value="' + (o.zones && o.zones[key] ? o.zones[key] : '') + '" selected></option></select>';
    }).join('');
  return mount;
}

test('readPocusFormValues reads all 8 lung zones into record.lungZones', () => {
  if (typeof document === 'undefined') return;
  var mount = mountWithPocusForm({ zones: { rAntSup: '1-2', lLatInf: 'Coalescentes' } });
  var record = readPocusFormValues(mount);
  assert.equal(record.lungZones.rAntSup, '1-2');
  assert.equal(record.lungZones.lLatInf, 'Coalescentes');
  assert.equal(LUNG_ZONE_KEYS.length, Object.keys(record.lungZones).length);
});

test('readPocusFormValues reads sixMwtMeters as a plain field (not under checklist/lungZones)', () => {
  if (typeof document === 'undefined') return;
  var mount = mountWithPocusForm({ sixMwtMeters: 340 });
  var record = readPocusFormValues(mount);
  assert.equal(record.sixMwtMeters, '340');
});

test('saveCardioPocusDay stores lungZones on the pocusByDay record', () => {
  if (typeof document === 'undefined') return;
  var patient = { cardio: { pocusByDay: [] } };
  var mount = mountWithPocusForm({ zones: { rAntSup: '≥3' } });
  var persisted = false;
  var changed = false;
  saveCardioPocusDay(mount, patient, () => { persisted = true; }, () => { changed = true; });
  assert.equal(persisted, true);
  assert.equal(changed, true);
  assert.equal(patient.cardio.pocusByDay[0].lungZones.rAntSup, '≥3');
});

test('saveCardioPocusDay writes a non-empty 6MWT reading into patient.cardio.scores, keyed by the POCUS day date', () => {
  if (typeof document === 'undefined') return;
  var patient = { cardio: { pocusByDay: [], scores: [] } };
  var mount = mountWithPocusForm({ date: '2026-03-20', sixMwtMeters: 300 });
  saveCardioPocusDay(mount, patient, () => {}, () => {});
  assert.equal(patient.cardio.scores.length, 1);
  assert.equal(patient.cardio.scores[0].date, '2026-03-20');
  assert.equal(patient.cardio.scores[0].sixMwtMeters, 300);
  // Not duplicated onto the pocusByDay day record.
  assert.equal('sixMwtMeters' in patient.cardio.pocusByDay[0], false);
});

test('saveCardioPocusDay leaves patient.cardio.scores untouched when 6MWT is blank', () => {
  if (typeof document === 'undefined') return;
  var patient = { cardio: { pocusByDay: [], scores: [] } };
  var mount = mountWithPocusForm({ date: '2026-03-21' });
  saveCardioPocusDay(mount, patient, () => {}, () => {});
  assert.equal(patient.cardio.scores.length, 0);
});
