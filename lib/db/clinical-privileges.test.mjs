import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canConfigureRotation,
  effectiveClinicalRank,
  hasProgramAdminPrivileges,
} from './clinical-privileges.mjs';

describe('clinical-privileges', () => {
  it('splits clinical R1 from program admin', () => {
    const user = { rank: 'R1', is_program_admin: 1 };
    assert.equal(effectiveClinicalRank(user), 'R1');
    assert.equal(hasProgramAdminPrivileges(user), true);
    assert.equal(canConfigureRotation(user), true);
  });

  it('maps legacy Admin rank to admin privileges', () => {
    const user = { rank: 'Admin', is_program_admin: 0 };
    assert.equal(hasProgramAdminPrivileges(user), true);
    assert.equal(effectiveClinicalRank(user), 'R1');
  });
});
