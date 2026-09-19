import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  subscribeClinicalReadModel,
  getPatients,
  getPatientById,
  getNotes,
  getIndicaciones,
  getLabHistory,
  getMedRecetaByPatient,
  getMedPharmProfileByPatient,
  getRecetaHuByPatient,
  getListadoProblemas,
  getVpoByPatient,
  getMedNotaSelectionByPatient,
  hydrateClinicalReadModel,
  _applyRepoSnapshot,
  _applyPatientPatch,
  resetClinicalReadModelForTests,
} from './clinical-read-model.mjs';

describe('clinical-read-model', () => {
  beforeEach(() => {
    resetClinicalReadModelForTests();
  });

  it('starts empty', () => {
    assert.deepEqual(getPatients(), []);
    assert.equal(getPatientById('p1'), null);
    assert.deepEqual(getNotes(), {});
    assert.deepEqual(getIndicaciones(), {});
    assert.deepEqual(getLabHistory(), {});
    assert.deepEqual(getMedRecetaByPatient(), {});
    assert.deepEqual(getMedPharmProfileByPatient(), {});
    assert.deepEqual(getRecetaHuByPatient(), {});
    assert.deepEqual(getListadoProblemas(), {});
    assert.deepEqual(getVpoByPatient(), {});
    assert.deepEqual(getMedNotaSelectionByPatient(), {});
  });

  it('_applyRepoSnapshot replaces patients and notifies subscribers', () => {
    let calls = 0;
    const unsub = subscribeClinicalReadModel(() => {
      calls += 1;
    });
    _applyRepoSnapshot({
      patients: [
        { id: 'p1', nombre: 'Ana', eventualidades: { entries: [{ id: 'e1', text: 'fiebre' }] } },
      ],
    });
    assert.equal(calls, 1);
    assert.equal(getPatients().length, 1);
    assert.equal(getPatients()[0].nombre, 'Ana');
    assert.equal(getPatientById('p1')?.eventualidades?.entries?.[0]?.text, 'fiebre');
    unsub();
    _applyRepoSnapshot({ patients: [] });
    assert.equal(calls, 1);
  });

  it('getters return defensive copies (no shared mutation)', () => {
    _applyRepoSnapshot({
      patients: [{ id: 'p1', nombre: 'Ana', eventualidades: { entries: [{ id: 'e1', text: 'x' }] } }],
    });
    const list = getPatients();
    list[0].nombre = 'Hacked';
    list[0].eventualidades.entries[0].text = 'mutated';
    assert.equal(getPatientById('p1').nombre, 'Ana');
    assert.equal(getPatientById('p1').eventualidades.entries[0].text, 'x');

    const one = getPatientById('p1');
    one.nombre = 'Again';
    assert.equal(getPatients()[0].nombre, 'Ana');
  });

  it('_applyPatientPatch upserts eventualidades and notifies', () => {
    let calls = 0;
    subscribeClinicalReadModel(() => {
      calls += 1;
    });
    _applyRepoSnapshot({
      patients: [{ id: 'p1', nombre: 'Ana', eventualidades: { entries: [] } }],
    });
    assert.equal(calls, 1);

    _applyPatientPatch('p1', {
      eventualidades: { entries: [{ id: 'e2', text: 'taquicardia' }], labsText: 'Hb 10' },
    });
    assert.equal(calls, 2);
    const p = getPatientById('p1');
    assert.equal(p.nombre, 'Ana');
    assert.equal(p.eventualidades.entries[0].text, 'taquicardia');
    assert.equal(p.eventualidades.labsText, 'Hb 10');
  });

  it('_applyPatientPatch inserts from seed when patient missing', () => {
    _applyPatientPatch(
      'p2',
      { eventualidades: { entries: [{ id: 'e9', text: 'nuevo' }] } },
      { id: 'p2', nombre: 'Luis', sala: '1' }
    );
    const p = getPatientById('p2');
    assert.equal(p.nombre, 'Luis');
    assert.equal(p.sala, '1');
    assert.equal(p.eventualidades.entries[0].text, 'nuevo');
  });

  it('_applyPatientPatch does not deep-clone the cached patient or seed', () => {
    const src = readFileSync(fileURLToPath(new URL('./clinical-read-model.mjs', import.meta.url)), 'utf8');
    const start = src.indexOf('export function _applyPatientPatch');
    const end = src.indexOf('export function resetClinicalReadModelForTests');
    assert.ok(start >= 0 && end > start);
    const fn = src.slice(start, end);
    assert.match(fn, /cloneValue\(patch\)/);
    assert.doesNotMatch(fn, /cloneValue\(_cache\.patients\[idx\]\)/);
    assert.doesNotMatch(fn, /cloneValue\(seed\)/);
  });

  it('subscribe rejects non-functions', () => {
    assert.equal(subscribeClinicalReadModel(null), null);
    assert.equal(subscribeClinicalReadModel(undefined), null);
  });

  it('_applyRepoSnapshot merges all clinical domain keys', () => {
    let source = null;
    subscribeClinicalReadModel((detail) => {
      source = detail && detail.source;
    });
    _applyRepoSnapshot({
      patients: [{ id: 'p1', nombre: 'Ana' }],
      notes: { p1: 'nota' },
      indicaciones: { p1: 'ind' },
      labHistory: { p1: [{ id: 'l1' }] },
      medRecetaByPatient: { p1: { items: [] } },
      medPharmProfileByPatient: { p1: { profile: true } },
      recetaHuByPatient: { p1: { hu: 1 } },
      listadoProblemas: { p1: { problemas: [] } },
      vpoByPatient: { p1: { vpo: true } },
      medNotaSelectionByPatient: { p1: { selected: ['a'] } },
    });
    assert.equal(source, 'snapshot');
    assert.equal(getNotes().p1, 'nota');
    assert.equal(getIndicaciones().p1, 'ind');
    assert.deepEqual(getLabHistory('p1'), [{ id: 'l1' }]);
    assert.deepEqual(getMedRecetaByPatient('p1'), { items: [] });
    assert.deepEqual(getMedPharmProfileByPatient('p1'), { profile: true });
    assert.deepEqual(getRecetaHuByPatient('p1'), { hu: 1 });
    assert.deepEqual(getListadoProblemas('p1'), { problemas: [] });
    assert.deepEqual(getVpoByPatient('p1'), { vpo: true });
    assert.deepEqual(getMedNotaSelectionByPatient('p1'), { selected: ['a'] });
  });

  it('_applyRepoSnapshot merges partial keys without wiping others', () => {
    _applyRepoSnapshot({
      notes: { p1: 'a' },
      indicaciones: { p1: 'b' },
    });
    _applyRepoSnapshot({ notes: { p1: 'updated' } });
    assert.equal(getNotes().p1, 'updated');
    assert.equal(getIndicaciones().p1, 'b');
  });

  it('map getters return defensive copies and optional patientId filter', () => {
    _applyRepoSnapshot({
      notes: { p1: 'nota', p2: 'otra' },
      labHistory: { p1: [{ id: 'l1' }], p2: [{ id: 'l2' }] },
    });
    const notes = getNotes();
    notes.p1 = 'hacked';
    assert.equal(getNotes().p1, 'nota');
    assert.equal(getNotes('p1'), 'nota');
    assert.equal(getNotes('missing'), undefined);
    const labs = getLabHistory('p1');
    labs[0].id = 'mut';
    assert.equal(getLabHistory('p1')[0].id, 'l1');
    assert.deepEqual(Object.keys(getLabHistory()).sort(), ['p1', 'p2']);
  });

  it('hydrateClinicalReadModel applies snapshot with source hydrate', () => {
    let source = null;
    subscribeClinicalReadModel((detail) => {
      source = detail && detail.source;
    });
    hydrateClinicalReadModel({
      patients: [{ id: 'p9', nombre: 'Hyd' }],
      notes: { p9: 'from-hydrate' },
    });
    assert.equal(source, 'hydrate');
    assert.equal(getPatientById('p9')?.nombre, 'Hyd');
    assert.equal(getNotes('p9'), 'from-hydrate');
  });
});
