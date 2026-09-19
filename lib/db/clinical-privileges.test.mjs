import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasElevatedTeamPrivileges,
  hasProgramAdminPrivileges,
  canViewUserDirectory,
} from './clinical-privileges.mjs';

test('hasElevatedTeamPrivileges: Team without program admin is false', () => {
  assert.equal(
    hasElevatedTeamPrivileges({ rank: 'Team', is_program_admin: 0 }),
    false
  );
});

test('hasElevatedTeamPrivileges: program admin flag true', () => {
  assert.equal(
    hasElevatedTeamPrivileges({ rank: 'Team', is_program_admin: 1 }),
    true
  );
});

test('hasElevatedTeamPrivileges: Admin rank true', () => {
  assert.equal(hasElevatedTeamPrivileges({ rank: 'Admin' }), true);
});

test('hasProgramAdminPrivileges: Admin rank', () => {
  assert.equal(hasProgramAdminPrivileges({ rank: 'Admin' }), true);
});

test('canViewUserDirectory: Admin or program admin only', () => {
  assert.equal(canViewUserDirectory({ rank: 'Admin' }), true);
  assert.equal(canViewUserDirectory({ rank: 'Team', is_program_admin: 1 }), true);
  assert.equal(canViewUserDirectory({ rank: 'Team' }), false);
});
