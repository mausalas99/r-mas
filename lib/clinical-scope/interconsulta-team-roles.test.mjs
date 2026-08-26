import test from 'node:test';
import assert from 'node:assert/strict';
import { getInterconsultaTeamRoles } from './interconsulta-team-roles.mjs';

function team(letter) {
  return { service: 'Interconsultas', sub_area_fraction: letter };
}

const A = team('A');
const B = team('B');
const C = team('C');
const D = team('D');
const TEAMS = [A, B, C, D];

// (25 - 1) % 4 === 0 -> letter A on-call.
const DAY_25 = new Date('2026-08-25T12:00:00Z');
// (26 - 1) % 4 === 1 -> letter B on-call.
const DAY_26 = new Date('2026-08-26T12:00:00Z');

test('assigns guardia/postguardia/activo for a known day index', () => {
  const roles = getInterconsultaTeamRoles(TEAMS, DAY_25);
  assert.equal(roles.guardia, A);
  assert.equal(roles.postguardia, D);
  assert.deepEqual(roles.activo, [B, C]);
});

test('rotation advances day to day — yesterday guardia becomes today postguardia', () => {
  const today = getInterconsultaTeamRoles(TEAMS, DAY_25);
  const tomorrow = getInterconsultaTeamRoles(TEAMS, DAY_26);
  assert.equal(today.guardia, A);
  assert.equal(tomorrow.postguardia, A);
  assert.equal(tomorrow.guardia, B);
});

test('degenerate case: fewer than 4 teams still assigns what it can, no crash', () => {
  const roles = getInterconsultaTeamRoles([A, B], DAY_25);
  assert.equal(roles.guardia, A);
  assert.equal(roles.postguardia, null); // no team holds letter D
  assert.deepEqual(roles.activo, [B]);
});

test('degenerate case: no teams returns all-null/empty without throwing', () => {
  const roles = getInterconsultaTeamRoles([], DAY_25);
  assert.equal(roles.guardia, null);
  assert.equal(roles.postguardia, null);
  assert.deepEqual(roles.activo, []);
});
