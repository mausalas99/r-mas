import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasElevatedTeamPrivileges,
  hasProgramAdminPrivileges,
  canViewUserDirectory,
  canManageInternoQr,
} from './clinical-privileges.mjs';

test('hasElevatedTeamPrivileges: R4 without program admin', () => {
  assert.equal(
    hasElevatedTeamPrivileges({ rank: 'R4', is_program_admin: 0 }),
    true
  );
});

test('hasElevatedTeamPrivileges: R1 false', () => {
  assert.equal(
    hasElevatedTeamPrivileges({ rank: 'R1', is_program_admin: 0 }),
    false
  );
});

test('hasElevatedTeamPrivileges: program admin true', () => {
  assert.equal(
    hasElevatedTeamPrivileges({ rank: 'R2', is_program_admin: 1 }),
    true
  );
});

test('hasElevatedTeamPrivileges: Admin rank true', () => {
  assert.equal(hasElevatedTeamPrivileges({ rank: 'Admin' }), true);
});

test('hasProgramAdminPrivileges: Admin rank', () => {
  assert.equal(hasProgramAdminPrivileges({ rank: 'Admin' }), true);
});

test('canViewUserDirectory: elevated access (R4, Admin, program admin)', () => {
  assert.equal(canViewUserDirectory({ rank: 'R4' }), true);
  assert.equal(canViewUserDirectory({ rank: 'Admin' }), true);
  assert.equal(canViewUserDirectory({ rank: 'R1', is_program_admin: 1 }), true);
  assert.equal(canViewUserDirectory({ rank: 'R3' }), false);
  assert.equal(canViewUserDirectory({ rank: 'R2' }), false);
});

test('canManageInternoQr: R1 program admin and R4', () => {
  assert.equal(canManageInternoQr({ rank: 'R1', is_program_admin: 1 }), true);
  assert.equal(canManageInternoQr({ rank: 'R1', is_program_admin: 0 }), false);
  assert.equal(canManageInternoQr({ rank: 'R4', is_program_admin: 0 }), true);
});
