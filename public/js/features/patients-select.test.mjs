import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isRoundOverviewInner } from './patients-round.mjs';

/** Mirrors selectPatientCore patientChanged detection. */
function patientChanged(prevId, id) {
  return String(prevId ?? '') !== String(id);
}

/** Mirrors list refresh branch in selectPatientCore. */
function shouldFullRenderPatientList(patientChanged, patchHighlightOk) {
  return !patientChanged || !patchHighlightOk;
}

describe('selectPatient patientChanged', () => {
  it('is true when selecting the first patient from empty state', () => {
    assert.equal(patientChanged(null, 'abc'), true);
    assert.equal(patientChanged(undefined, 'abc'), true);
  });

  it('is true when switching between patients', () => {
    assert.equal(patientChanged('a', 'b'), true);
  });

  it('is false when re-selecting the same patient', () => {
    assert.equal(patientChanged('a', 'a'), false);
    assert.equal(patientChanged(12, '12'), false);
  });
});

describe('selectPatient list refresh branch', () => {
  it('re-renders list when re-selecting the same patient', () => {
    assert.equal(shouldFullRenderPatientList(false, true), true);
  });

  it('re-renders list when highlight patch cannot run silently', () => {
    assert.equal(shouldFullRenderPatientList(true, false), true);
  });
});

describe('isRoundOverviewInner', () => {
  it('treats resumen, todo, and empty as Pase overview', () => {
    assert.equal(isRoundOverviewInner('resumen'), true);
    assert.equal(isRoundOverviewInner('todo'), true);
    assert.equal(isRoundOverviewInner(''), true);
    assert.equal(isRoundOverviewInner(null), true);
    assert.equal(isRoundOverviewInner(undefined), true);
  });

  it('does not treat other inners as overview', () => {
    assert.equal(isRoundOverviewInner('estadoActual'), false);
    assert.equal(isRoundOverviewInner('tend'), false);
    assert.equal(isRoundOverviewInner('notas'), false);
  });
});
