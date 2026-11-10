import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepFocusId, guardiaTeamLabel, assignKeyToTeamId } from './interconsulta-team-board.mjs';

test('stepFocusId moves to the next and previous id', () => {
  assert.equal(stepFocusId(['a', 'b', 'c'], 'a', 1), 'b');
  assert.equal(stepFocusId(['a', 'b', 'c'], 'c', -1), 'b');
});

test('stepFocusId clamps at both ends', () => {
  assert.equal(stepFocusId(['a', 'b', 'c'], 'c', 1), 'c');
  assert.equal(stepFocusId(['a', 'b', 'c'], 'a', -1), 'a');
});

test('stepFocusId returns the first id when current is missing, and empty for empty list', () => {
  assert.equal(stepFocusId(['a', 'b'], 'zz', 1), 'a');
  assert.equal(stepFocusId(['a', 'b'], 'zz', -1), 'a');
  assert.equal(stepFocusId([], 'a', 1), '');
});

test('guardiaTeamLabel returns the on-call interconsult team name', () => {
  const teams = [
    { team_id: 'ic-a', name: 'Interconsultas A', service: 'Interconsultas', sub_area_fraction: 'A' },
    { team_id: 'ic-b', name: 'Interconsultas B', service: 'Interconsultas', sub_area_fraction: 'B' },
  ];
  assert.equal(guardiaTeamLabel(teams, new Date(2026, 9, 1)), 'Interconsultas A');
  assert.equal(guardiaTeamLabel(teams, new Date(2026, 9, 2)), 'Interconsultas B');
});

test('guardiaTeamLabel returns empty when no team is on guardia', () => {
  assert.equal(guardiaTeamLabel([], new Date(2026, 9, 1)), '');
  const noFraction = [{ team_id: 'ic-x', name: 'Interconsultas X', service: 'Interconsultas' }];
  assert.equal(guardiaTeamLabel(noFraction, new Date(2026, 9, 1)), '');
});

test('assignKeyToTeamId maps a digit to the Nth option id', () => {
  const opts = [{ id: 'T1', label: 'A' }, { id: 'T2', label: 'B' }];
  assert.equal(assignKeyToTeamId(opts, '2'), 'T2');
  assert.equal(assignKeyToTeamId(opts, '1'), 'T1');
});

test('assignKeyToTeamId returns empty for a digit beyond the list, a non-digit, or no options', () => {
  const opts = [{ id: 'T1', label: 'A' }];
  assert.equal(assignKeyToTeamId(opts, '3'), '');
  assert.equal(assignKeyToTeamId(opts, '0'), '');
  assert.equal(assignKeyToTeamId(opts, 'a'), '');
  assert.equal(assignKeyToTeamId([], '1'), '');
  assert.equal(assignKeyToTeamId(undefined, '1'), '');
});
