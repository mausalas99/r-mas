import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCensusFiltersBar,
  wireCensusFilterInputs,
  detachPatientFiltersPopover,
  togglePatientCensusFiltersCollapsed,
} from './patients-scope-filters-bar.mjs';
import { readCensusFiltersCollapsed, writeCensusFiltersCollapsed } from './clinical-census-filters-ui.mjs';
import { refreshCensusViewsAfterFilterChange } from './patients-scope.mjs';
import { patientsBridge } from './patients-bridge.mjs';

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

test('Servicio keystrokes skip the forced re-render + LAN pull; Sala/Equipo keep it', async () => {
  if (typeof document === 'undefined') return;

  document.body.innerHTML =
    '<aside id="patient-sidebar"><div class="sidebar-header">' +
    '<div id="patient-filters-anchor"><button type="button" id="btn-patient-filters"></button></div>' +
    '<div id="clinical-census-filters-sidebar-mount" hidden></div>' +
    '</div></aside>';

  const mount = document.getElementById('clinical-census-filters-sidebar-mount');
  const user = { user_id: 'u1', rank: 'Admin', sala: 'Sala 1' };
  const bar = createCensusFiltersBar(user, mount, true);
  wireCensusFilterInputs(bar, refreshCensusViewsAfterFilterChange);

  const renderCalls = [];
  const restoreRenderPatientList = patientsBridge.renderPatientList;
  patientsBridge.renderPatientList = (opts) => renderCalls.push(opts || {});

  const serviceInp = bar.querySelector('#clinical-filter-service');
  const teamSel = bar.querySelector('#clinical-filter-team');

  serviceInp.value = 'car';
  serviceInp.dispatchEvent(new Event('input', { bubbles: true }));
  serviceInp.value = 'card';
  serviceInp.dispatchEvent(new Event('input', { bubbles: true }));
  serviceInp.value = 'cardi';
  serviceInp.dispatchEvent(new Event('input', { bubbles: true }));

  assert.equal(renderCalls.length, 3);
  assert.ok(renderCalls.every((opts) => opts.force !== true));

  teamSel.value = '__unassigned__';
  teamSel.dispatchEvent(new Event('change', { bubbles: true }));

  const forcedCalls = renderCalls.filter((opts) => opts.force === true);
  assert.equal(forcedCalls.length, 1);

  // Let ensureTeamAssignedPatientsOnDevice's promise chain settle — its only
  // observable side effect here (no user_id => it no-ops) is the follow-up
  // { silent: true } render, proving the Sala/Equipo path still runs it.
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(renderCalls.some((opts) => opts.silent === true));

  patientsBridge.renderPatientList = restoreRenderPatientList;
  detachPatientFiltersPopover();
  document.body.innerHTML = '';
});
