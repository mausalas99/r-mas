import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  censusFiltersAreActive,
  elevatedPatientFilters,
  hydrateElevatedPatientFiltersFromStorage,
} from './clinical-census-filters-state.mjs';
import { CLINICAL_CENSUS_FILTER_TEAM_LS } from './clinical-census-filters-ui.mjs';

test('censusFiltersAreActive detecta filtros aplicados', () => {
  assert.equal(censusFiltersAreActive({ sala: '__all__', teamId: '', service: '' }), false);
  assert.equal(censusFiltersAreActive({ sala: 'Sala 1', teamId: '', service: '' }), true);
  assert.equal(censusFiltersAreActive({ sala: '__all__', teamId: 't1', service: '' }), true);
  assert.equal(censusFiltersAreActive({ sala: '__all__', teamId: '', service: 'ONCO' }), true);
});

test('hydrateElevatedPatientFiltersFromStorage applies pinned equipo', () => {
  var prev = elevatedPatientFilters.teamId;
  try {
    elevatedPatientFilters.teamId = '';
    var store = {
      data: {},
      getItem(k) {
        return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null;
      },
      setItem(k, v) {
        this.data[k] = String(v);
      },
    };
    store.setItem(CLINICAL_CENSUS_FILTER_TEAM_LS, 'team-leslie');
    hydrateElevatedPatientFiltersFromStorage(store);
    assert.equal(elevatedPatientFilters.teamId, 'team-leslie');
    assert.equal(censusFiltersAreActive(elevatedPatientFilters), true);
  } finally {
    elevatedPatientFilters.teamId = prev;
  }
});
