import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { d1UniqueConstraintTarget, isD1UniqueConstraintError } from './d1-errors.js';

describe('isD1UniqueConstraintError', () => {
  it('matches D1 PRIMARY KEY race on mutations revision', () => {
    const msg =
      'D1_ERROR: UNIQUE constraint failed: mutations.room_id, mutations.revision: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_PRIMARYKEY)';
    assert.equal(isD1UniqueConstraintError(new Error(msg)), true);
    assert.equal(d1UniqueConstraintTarget(new Error(msg)), 'revision');
  });

  it('matches client_mutation_id unique index', () => {
    const msg = 'D1_ERROR: UNIQUE constraint failed: mutations.room_id, mutations.client_mutation_id';
    assert.equal(isD1UniqueConstraintError(new Error(msg)), true);
    assert.equal(d1UniqueConstraintTarget(new Error(msg)), 'client_mutation_id');
  });

  it('rejects unrelated errors', () => {
    assert.equal(isD1UniqueConstraintError(new Error('network down')), false);
    assert.equal(d1UniqueConstraintTarget(new Error('UNIQUE constraint failed: other_table.x')), 'other');
  });
});
