import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyEventualidadUpsert,
  applyEventualidadDelete,
  applyEventualidadesLabsSet,
  applyEventualidadesLabsMerge,
} from './eventualidades.mjs';

function patientsFixture() {
  return [
    {
      id: 'p1',
      name: 'A',
      eventualidades: { entries: [], labsText: '' },
    },
    {
      id: 'p2',
      name: 'B',
      eventualidades: {
        entries: [{ id: 'ev_old', at: '2026-08-01T18:00:00.000Z', text: 'OLD' }],
        labsText: 'LAB',
      },
    },
  ];
}

describe('clinical-repo eventualidades transforms', () => {
  it('upsert appends entry without mutating input', () => {
    const input = patientsFixture();
    const snap = JSON.stringify(input);
    const res = applyEventualidadUpsert(input, {
      patientId: 'p1',
      entry: { text: '2 U GR', at: '2026-08-05T18:00:00.000Z', kind: 'transfusion' },
    });
    assert.equal(res.ok, true);
    assert.equal(JSON.stringify(input), snap);
    const p1 = res.patients.find((p) => p.id === 'p1');
    assert.equal(p1.eventualidades.entries.length, 1);
    assert.equal(p1.eventualidades.entries[0].text, '2 U GR');
    assert.equal(p1.eventualidades.entries[0].kind, 'transfusion');
    assert.ok(p1.eventualidades.updatedAt);
  });

  it('upsert with id updates existing entry', () => {
    const res = applyEventualidadUpsert(patientsFixture(), {
      patientId: 'p2',
      entry: { id: 'ev_old', text: 'NEW', at: '2026-08-02T18:00:00.000Z', kind: 'biopsia' },
    });
    assert.equal(res.ok, true);
    const p2 = res.patients.find((p) => p.id === 'p2');
    assert.equal(p2.eventualidades.entries.length, 1);
    assert.equal(p2.eventualidades.entries[0].text, 'NEW');
    assert.equal(p2.eventualidades.entries[0].kind, 'biopsia');
  });

  it('upsert with new id creates using that id', () => {
    const res = applyEventualidadUpsert(patientsFixture(), {
      patientId: 'p1',
      entry: { id: 'ev_stable', text: 'FRESH', at: '2026-08-05T12:00:00.000Z' },
    });
    assert.equal(res.ok, true);
    const p1 = res.patients.find((p) => p.id === 'p1');
    assert.equal(p1.eventualidades.entries.length, 1);
    assert.equal(p1.eventualidades.entries[0].id, 'ev_stable');
    assert.equal(p1.eventualidades.entries[0].text, 'FRESH');
  });

  it('upsert returns patient_not_found', () => {
    const res = applyEventualidadUpsert(patientsFixture(), {
      patientId: 'missing',
      entry: { text: 'x' },
    });
    assert.deepEqual(res, { ok: false, error: 'patient_not_found' });
  });

  it('upsert returns empty when text blank', () => {
    const res = applyEventualidadUpsert(patientsFixture(), {
      patientId: 'p1',
      entry: { text: '   ' },
    });
    assert.equal(res.ok, false);
    assert.equal(res.error, 'empty');
  });

  it('delete removes entry and stamps deletedIds', () => {
    const res = applyEventualidadDelete(patientsFixture(), {
      patientId: 'p2',
      entryId: 'ev_old',
    });
    assert.equal(res.ok, true);
    const p2 = res.patients.find((p) => p.id === 'p2');
    assert.equal(p2.eventualidades.entries.length, 0);
    assert.ok(p2.eventualidades.deletedIds.ev_old);
  });

  it('labs set replaces labsText', () => {
    const res = applyEventualidadesLabsSet(patientsFixture(), {
      patientId: 'p2',
      text: 'BH OK',
    });
    assert.equal(res.ok, true);
    assert.equal(res.patients.find((p) => p.id === 'p2').eventualidades.labsText, 'BH OK');
  });

  it('labs merge appends when new', () => {
    const res = applyEventualidadesLabsMerge(patientsFixture(), {
      patientId: 'p2',
      text: 'EXTRA',
    });
    assert.equal(res.ok, true);
    const labs = res.patients.find((p) => p.id === 'p2').eventualidades.labsText;
    assert.match(labs, /LAB/);
    assert.match(labs, /EXTRA/);
  });
});
