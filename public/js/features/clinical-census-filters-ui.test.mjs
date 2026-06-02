import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import {
  readCensusFiltersCollapsed,
  writeCensusFiltersCollapsed,
  CLINICAL_CENSUS_FILTERS_COLLAPSED_LS,
} from './clinical-census-filters-ui.mjs';

describe('clinical census filters visibility', () => {
  it('elevated only for R4 Admin program admin', () => {
    assert.equal(hasElevatedTeamPrivileges({ rank: 'R4' }), true);
    assert.equal(hasElevatedTeamPrivileges({ rank: 'Admin' }), true);
    assert.equal(hasElevatedTeamPrivileges({ rank: 'R1', is_program_admin: 1 }), true);
    assert.equal(hasElevatedTeamPrivileges({ rank: 'R1' }), false);
    assert.equal(hasElevatedTeamPrivileges({ rank: 'R2' }), false);
    assert.equal(hasElevatedTeamPrivileges({ rank: 'R3' }), false);
  });
});

describe('clinical census filters collapse storage', () => {
  it('defaults expanded', () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
    assert.equal(readCensusFiltersCollapsed(storage), false);
    writeCensusFiltersCollapsed(true, storage);
    assert.equal(mem.get(CLINICAL_CENSUS_FILTERS_COLLAPSED_LS), '1');
    assert.equal(readCensusFiltersCollapsed(storage), true);
    writeCensusFiltersCollapsed(false, storage);
    assert.equal(readCensusFiltersCollapsed(storage), false);
  });
});
