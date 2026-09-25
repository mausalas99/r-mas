import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { directoryUserMatchesFilters } from './teams-directory-filters.mjs';

describe('directoryUserMatchesFilters', () => {
  const base = {
    search: 'drmendoza maria cardiologia',
    hasTeam: true,
    sala: 'Cardiología',
    activityTier: 'active',
  };

  it('matches with all filters open', () => {
    assert.equal(
      directoryUserMatchesFilters(base, {
        query: '',
        status: 'all',
        sala: '',
        activity: 'all',
      }),
      true
    );
  });

  it('filters by search query', () => {
    assert.equal(directoryUserMatchesFilters(base, { query: 'mendoza' }), true);
    assert.equal(directoryUserMatchesFilters(base, { query: 'ortopedia' }), false);
  });

  it('filters by team assignment', () => {
    assert.equal(directoryUserMatchesFilters(base, { status: 'assigned' }), true);
    assert.equal(directoryUserMatchesFilters(base, { status: 'unassigned' }), false);
  });

  it('filters by sala', () => {
    assert.equal(directoryUserMatchesFilters(base, { sala: 'Cardiología' }), true);
    assert.equal(directoryUserMatchesFilters(base, { sala: 'Oncología' }), false);
  });

  it('filters by activity tier', () => {
    assert.equal(directoryUserMatchesFilters(base, { activity: 'active' }), true);
    assert.equal(directoryUserMatchesFilters(base, { activity: 'inactive' }), false);
    assert.equal(
      directoryUserMatchesFilters({ ...base, activityTier: 'stale' }, { activity: 'inactive' }),
      true
    );
  });
});
