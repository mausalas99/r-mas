import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCensusFiltersBar,
  wireCensusFilterInputs,
  detachPatientFiltersPopover,
  togglePatientCensusFiltersCollapsed,
} from './patients-scope-filters-bar.mjs';
import { readCensusFiltersCollapsed, writeCensusFiltersCollapsed } from './clinical-census-filters-ui.mjs';

test('patient filter toggle survives bar recreation', () => {
  if (typeof document === 'undefined') return;

  document.body.innerHTML =
    '<aside id="patient-sidebar"><div class="sidebar-header">' +
    '<div id="patient-filters-anchor"><button type="button" id="btn-patient-filters"></button></div>' +
    '<div id="clinical-census-filters-sidebar-mount" hidden></div>' +
    '</div></aside>';

  writeCensusFiltersCollapsed(true);
  const mount = document.getElementById('clinical-census-filters-sidebar-mount');
  const user = { user_id: 'u1', rank: 'Admin', sala: 'Sala 1' };

  let bar = createCensusFiltersBar(user, mount, true);
  wireCensusFilterInputs(bar, () => {});
  bar.remove();

  bar = createCensusFiltersBar(user, mount, true);
  wireCensusFilterInputs(bar, () => {});

  assert.equal(togglePatientCensusFiltersCollapsed(), true);

  assert.equal(bar.classList.contains('is-collapsed'), false);
  assert.equal(mount.hidden, false);
  assert.equal(readCensusFiltersCollapsed(), false);

  detachPatientFiltersPopover();
  document.body.innerHTML = '';
});
