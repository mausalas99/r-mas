import { test } from 'node:test';
import assert from 'node:assert/strict';
import { censusFiltersAreActive, elevatedPatientFilters } from './clinical-census-filters-state.mjs';

test('censusFiltersAreActive detecta filtros aplicados', () => {
  assert.equal(censusFiltersAreActive({ sala: '__all__', teamId: '', service: '' }), false);
  assert.equal(censusFiltersAreActive({ sala: 'Sala 1', teamId: '', service: '' }), true);
  assert.equal(censusFiltersAreActive({ sala: '__all__', teamId: 't1', service: '' }), true);
  assert.equal(censusFiltersAreActive({ sala: '__all__', teamId: '', service: 'ONCO' }), true);
  assert.equal(censusFiltersAreActive(elevatedPatientFilters), false);
});
