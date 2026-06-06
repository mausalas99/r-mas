import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import {
  readCensusFiltersCollapsed,
  writeCensusFiltersCollapsed,
  CLINICAL_CENSUS_FILTERS_COLLAPSED_LS,
  CLINICAL_CENSUS_FILTER_TEAM_LS,
  CENSUS_TEAM_FILTER_ALL,
  resolveActiveTeamFilterId,
  resolveElevatedTeamFilterId,
  readElevatedTeamFilterPreference,
  writeElevatedTeamFilterPreference,
  isTeamIdInCensusCatalog,
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

describe('clinical census team filter', () => {
  const user = { user_id: 'u1', rank: 'R4', sala: 'Sala 1' };
  const teams = [
    { team_id: 't1', name: 'Dra. Gabriela', sala: 'Sala 1', members: [{ user_id: 'u1' }] },
    { team_id: 't2', name: 'Otro equipo', sala: 'Sala 2', members: [{ user_id: 'u1' }] },
  ];

  it('defaults to Todos los equipos when preference not pinned', () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
    assert.equal(resolveElevatedTeamFilterId(user, teams, storage), '');
  });

  it('single membership defaults to that team', () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
    const oneTeam = [teams[0]];
    assert.equal(resolveActiveTeamFilterId(user, oneTeam), 't1');
    assert.equal(resolveElevatedTeamFilterId(user, oneTeam, storage), '');
  });

  it('pinned Todos los equipos clears team filter', () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
    writeElevatedTeamFilterPreference('', storage);
    assert.equal(mem.get(CLINICAL_CENSUS_FILTER_TEAM_LS), CENSUS_TEAM_FILTER_ALL);
    assert.deepEqual(readElevatedTeamFilterPreference(storage), { pinned: true, teamId: '' });
    assert.equal(resolveElevatedTeamFilterId(user, teams, storage), '');
  });

  it('pinned manual team id is respected', () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, v),
      removeItem: (k) => mem.delete(k),
    };
    writeElevatedTeamFilterPreference('t2', storage);
    assert.equal(resolveElevatedTeamFilterId(user, teams, storage), 't2');
  });

  it('catalog check accepts empty or known team id', () => {
    assert.equal(isTeamIdInCensusCatalog('', teams), true);
    assert.equal(isTeamIdInCensusCatalog('t1', teams), true);
    assert.equal(isTeamIdInCensusCatalog('missing', teams), false);
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
